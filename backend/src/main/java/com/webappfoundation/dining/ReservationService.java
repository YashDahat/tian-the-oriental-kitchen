package com.webappfoundation.dining;

import com.webappfoundation.dining.DiningDtos.*;
import com.webappfoundation.dto.CartLineInput;
import com.webappfoundation.dto.OrderDto;
import com.webappfoundation.dto.PlaceOrderRequest;
import com.webappfoundation.model.FulfillmentType;
import com.webappfoundation.model.Order;
import com.webappfoundation.model.PaymentMode;
import com.webappfoundation.model.User;
import com.webappfoundation.model.WorkflowStage;
import com.webappfoundation.repository.BranchRepository;
import com.webappfoundation.repository.OrderRepository;
import com.webappfoundation.repository.UserRepository;
import com.webappfoundation.service.AuditActions;
import com.webappfoundation.service.AuditService;
import com.webappfoundation.service.OrderService;
import com.webappfoundation.service.WorkflowService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Table bookings. Availability is computed per seating slot from {@link SeatingOption#getSlotCapacity()} minus
 * live (non-cancelled) bookings. A booking is a ₹0 order on the "table-booking" workflow placed through the
 * fenced {@link OrderService} (so the host manages it on the order board and the guest tracks it live); the
 * seating option's row is locked while counting so two guests can never take the last table at once.
 */
@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final SeatingOptionRepository seatingRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final WorkflowService workflowService;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ReservationService(ReservationRepository reservationRepository, SeatingOptionRepository seatingRepository,
                              OrderRepository orderRepository, OrderService orderService, WorkflowService workflowService,
                              BranchRepository branchRepository, UserRepository userRepository, AuditService auditService) {
        this.reservationRepository = reservationRepository;
        this.seatingRepository = seatingRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.workflowService = workflowService;
        this.branchRepository = branchRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    // ── Availability ──

    @Transactional(readOnly = true)
    public AvailabilityDto availability(LocalDate date, int guests) {
        validateDate(date);
        validateGuests(guests);
        List<SeatingOption> fitting = seatingRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .filter(s -> guests >= s.getMinGuests() && guests <= s.getMaxGuests()).toList();
        Map<String, Long> live = liveCounts(date);
        ZonedDateTime cutoff = ZonedDateTime.now(DiningConstants.ZONE).plusMinutes(DiningConstants.MIN_LEAD_MINUTES);
        List<SlotAvailability> slots = new ArrayList<>();
        for (LocalTime t : DiningConstants.SLOTS) {
            boolean past = date.atTime(t).atZone(DiningConstants.ZONE).isBefore(cutoff);
            List<SlotOption> options = new ArrayList<>();
            if (!past) {
                for (SeatingOption s : fitting) {
                    long taken = live.getOrDefault(key(t, s.getId()), 0L);
                    int left = (int) Math.max(0, s.getSlotCapacity() - taken);
                    if (left > 0) options.add(new SlotOption(s.getId(), s.getName(), left));
                }
            }
            slots.add(new SlotAvailability(t, t.isBefore(LocalTime.of(16, 0)) ? "LUNCH" : "DINNER", !options.isEmpty(), options));
        }
        return new AvailabilityDto(date, guests, slots);
    }

    /** Live (non-cancelled) bookings per "time|seatingId" for a day. */
    private Map<String, Long> liveCounts(LocalDate date) {
        List<Reservation> day = reservationRepository.findByBookingDate(date);
        Set<Long> liveOrderIds = liveOrderIds(day.stream().map(Reservation::getOrderId).toList());
        return day.stream().filter(r -> liveOrderIds.contains(r.getOrderId()))
                .collect(Collectors.groupingBy(r -> key(r.getSlotTime(), r.getSeatingOptionId()), Collectors.counting()));
    }

    private Set<Long> liveOrderIds(Collection<Long> orderIds) {
        if (orderIds.isEmpty()) return Set.of();
        return orderRepository.findAllById(orderIds).stream()
                .filter(o -> !WorkflowService.CANCELLED_CODE.equals(o.getCurrentStageCode()))
                .map(Order::getId).collect(Collectors.toSet());
    }

    private static String key(LocalTime t, Long seatingId) {
        return t + "|" + seatingId;
    }

    // ── Book ──

    @Transactional
    public ReservationDto create(Integer userId, CreateReservationRequest req) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to book a table");
        if (req == null || req.date() == null || req.time() == null || req.seatingOptionId() == null || req.guests() == null) {
            throw bad("Pick a date, time, party size and table");
        }
        validateDate(req.date());
        validateGuests(req.guests());
        if (!DiningConstants.SLOTS.contains(req.time())) throw bad("That time isn't one of our seating slots");
        if (req.date().atTime(req.time()).atZone(DiningConstants.ZONE)
                .isBefore(ZonedDateTime.now(DiningConstants.ZONE).plusMinutes(DiningConstants.MIN_LEAD_MINUTES))) {
            throw bad("That slot has already started — please choose a later time");
        }
        if (len(req.dietaryNotes()) > 500 || len(req.specialRequest()) > 500) throw bad("Notes are limited to 500 characters");

        // Serialise bookings for this kind of table, then count what's left in the slot.
        SeatingOption seating = seatingRepository.lockById(req.seatingOptionId())
                .filter(SeatingOption::isActive)
                .orElseThrow(() -> bad("That table type isn't available"));
        if (req.guests() < seating.getMinGuests() || req.guests() > seating.getMaxGuests()) {
            throw bad(seating.getName() + " seats " + seating.getMinGuests() + "–" + seating.getMaxGuests() + " guests");
        }
        List<Reservation> sameSlot = reservationRepository.findByBookingDateAndSlotTimeAndSeatingOptionId(
                req.date(), req.time(), seating.getId());
        long taken = liveOrderIds(sameSlot.stream().map(Reservation::getOrderId).toList()).size();
        if (taken >= seating.getSlotCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sorry — that slot was just taken. Please pick another time.");
        }
        boolean duplicate = reservationRepository.findByUserIdOrderByBookingDateDescSlotTimeDesc(userId).stream()
                .filter(r -> r.getBookingDate().equals(req.date()) && r.getSlotTime().equals(req.time()))
                .anyMatch(r -> !liveOrderIds(List.of(r.getOrderId())).isEmpty());
        if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a table booked at this time");

        Long branchId = branchRepository.findByActiveTrue().stream().findFirst().map(b -> b.getId()).orElse(null);
        OrderDto order = orderService.placeOrder(userId, PlaceOrderRequest.builder()
                .items(List.of(CartLineInput.builder().itemType(DiningConstants.TABLE).itemId(seating.getId()).quantity(1).build()))
                .branchId(branchId)
                .fulfillmentType(FulfillmentType.SELF_PICKUP)
                .paymentMode(PaymentMode.PAY_AT_COUNTER)
                .build());

        Reservation r = reservationRepository.save(Reservation.builder()
                .userId(userId).orderId(order.getId()).seatingOptionId(seating.getId())
                .bookingDate(req.date()).slotTime(req.time()).guests(req.guests())
                .occasion(req.occasion() == null ? Occasion.NONE : req.occasion())
                .dietaryNotes(trim(req.dietaryNotes())).specialRequest(trim(req.specialRequest()))
                .createdAt(Instant.now())
                .build());
        auditService.record("RESERVATION_CREATED", AuditActions.SUCCESS, "RESERVATION", String.valueOf(r.getId()),
                "date=" + r.getBookingDate() + " time=" + r.getSlotTime() + " guests=" + r.getGuests() + " seating=" + seating.getId());
        return toDto(r, orderRepository.findById(order.getId()).orElse(null), seating, order.isCancellable());
    }

    // ── Read ──

    @Transactional(readOnly = true)
    public List<ReservationDto> mine(Integer userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
        List<Reservation> rows = reservationRepository.findByUserIdOrderByBookingDateDescSlotTimeDesc(userId);
        Map<Long, SeatingOption> seats = seatingMap();
        Map<Long, Order> orders = orderRepository.findAllById(rows.stream().map(Reservation::getOrderId).toList())
                .stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        return rows.stream().map(r -> {
            Order o = orders.get(r.getOrderId());
            boolean cancellable = o != null && isCancellable(o);
            return toDto(r, o, seats.get(r.getSeatingOptionId()), cancellable);
        }).toList();
    }

    @Transactional(readOnly = true)
    public ReservationDto one(Integer userId, Long id) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
        Reservation r = reservationRepository.findById(id)
                .filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        Order o = orderRepository.findById(r.getOrderId()).orElse(null);
        return toDto(r, o, seatingRepository.findById(r.getSeatingOptionId()).orElse(null), o != null && isCancellable(o));
    }

    /** Admin day sheet (host stand): bookings for a date range with the guest's name + phone. */
    @Transactional(readOnly = true)
    public List<AdminReservationRow> adminSheet(LocalDate from, LocalDate to) {
        LocalDate f = from == null ? LocalDate.now(DiningConstants.ZONE) : from;
        LocalDate t = to == null ? f : to;
        if (t.isBefore(f) || f.plusDays(62).isBefore(t)) throw bad("Choose a range of up to two months");
        List<Reservation> rows = reservationRepository.findByBookingDateBetweenOrderByBookingDateAscSlotTimeAsc(f, t);
        Map<Long, SeatingOption> seats = seatingMap();
        Map<Long, Order> orders = orderRepository.findAllById(rows.stream().map(Reservation::getOrderId).toList())
                .stream().collect(Collectors.toMap(Order::getId, Function.identity()));
        Map<Integer, User> users = userRepository.findAllById(rows.stream().map(Reservation::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return rows.stream().map(r -> {
            Order o = orders.get(r.getOrderId());
            User u = users.get(r.getUserId());
            SeatingOption s = seats.get(r.getSeatingOptionId());
            String stage = o == null ? null : o.getCurrentStageCode();
            return new AdminReservationRow(r.getId(), r.getOrderId(), o == null ? null : o.getOrderNumber(),
                    r.getBookingDate(), r.getSlotTime(), r.getGuests(), s == null ? "—" : s.getName(), r.getOccasion(),
                    r.getDietaryNotes(), r.getSpecialRequest(),
                    u == null ? "Guest" : (nz(u.getFirstName()) + " " + nz(u.getLastName())).trim(),
                    u == null ? null : u.getPhone(), stage, stageLabel(stage));
        }).toList();
    }

    // ── helpers ──

    private boolean isCancellable(Order o) {
        try {
            WorkflowStage st = workflowService.stage(o.getWorkflowCode(), o.getCurrentStageCode());
            return st.isCancellable() && !st.isTerminal();
        } catch (ResponseStatusException e) {
            return false;
        }
    }

    private String stageLabel(String code) {
        if (code == null) return null;
        try {
            return workflowService.stage(DiningConstants.WF_TABLE, code).getLabel();
        } catch (ResponseStatusException e) {
            return code;
        }
    }

    private Map<Long, SeatingOption> seatingMap() {
        return seatingRepository.findAll().stream().collect(Collectors.toMap(SeatingOption::getId, Function.identity()));
    }

    private ReservationDto toDto(Reservation r, Order o, SeatingOption s, boolean cancellable) {
        String stage = o == null ? null : o.getCurrentStageCode();
        boolean upcoming = !LocalDateTime.of(r.getBookingDate(), r.getSlotTime()).atZone(DiningConstants.ZONE)
                .plusHours(3).isBefore(ZonedDateTime.now(DiningConstants.ZONE));
        return new ReservationDto(r.getId(), r.getOrderId(), o == null ? null : o.getOrderNumber(), r.getBookingDate(),
                r.getSlotTime(), r.getGuests(), r.getSeatingOptionId(), s == null ? "Table" : s.getName(), r.getOccasion(),
                r.getDietaryNotes(), r.getSpecialRequest(), stage, stageLabel(stage), cancellable, upcoming, r.getCreatedAt());
    }

    private static void validateDate(LocalDate date) {
        if (date == null) throw bad("Pick a date");
        LocalDate today = LocalDate.now(DiningConstants.ZONE);
        if (date.isBefore(today)) throw bad("That date has passed");
        if (date.isAfter(today.plusDays(DiningConstants.BOOKING_WINDOW_DAYS))) {
            throw bad("We take bookings up to " + DiningConstants.BOOKING_WINDOW_DAYS + " days ahead");
        }
    }

    private static void validateGuests(int guests) {
        if (guests < 1 || guests > 20) throw bad("Party size must be 1–20 (call us for larger groups)");
    }

    private static int len(String s) {
        return s == null ? 0 : s.length();
    }

    private static String trim(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
