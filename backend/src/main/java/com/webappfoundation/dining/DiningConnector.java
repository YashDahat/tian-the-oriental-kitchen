package com.webappfoundation.dining;

import com.webappfoundation.connector.*;
import com.webappfoundation.model.User;
import com.webappfoundation.repository.UserRepository;
import com.webappfoundation.service.ConnectorConfigService;
import com.webappfoundation.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * TIAN's dining connector ({@code id="tian.dining"}), bound to workflow stages at /admin/workflow:
 * <ul>
 *   <li>{@code reservation.confirmation} — emails the guest their booking (date, time, party, occasion);</li>
 *   <li>{@code reservation.cancelled} — emails the guest that the booking was cancelled;</li>
 *   <li>{@code reservation.host} — emails the restaurant a new-booking note;</li>
 *   <li>{@code passport.stamp} — stamps the guest's passport with each dish of a collected takeaway order;</li>
 *   <li>{@code passport.visit} — records a dine-in visit when a booking is seated.</li>
 * </ul>
 * Emails carry no secrets; the guest's own address is looked up only to send.
 */
@Component
public class DiningConnector implements ActionConnector {

    public static final String ID = "tian.dining";
    public static final String RES_CONFIRM = "reservation.confirmation";
    public static final String RES_CANCELLED = "reservation.cancelled";
    public static final String RES_HOST = "reservation.host";
    public static final String PASSPORT_STAMP = "passport.stamp";
    public static final String PASSPORT_VISIT = "passport.visit";

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    private final ReservationRepository reservationRepository;
    private final SeatingOptionRepository seatingRepository;
    private final PassportService passportService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final ConnectorConfigService configService;

    @Value("${admin.email:}")
    private String adminEmail;

    @Value("${app.base-url:}")
    private String baseUrl;

    public DiningConnector(ReservationRepository reservationRepository, SeatingOptionRepository seatingRepository,
                           PassportService passportService, EmailService emailService, UserRepository userRepository,
                           ConnectorConfigService configService) {
        this.reservationRepository = reservationRepository;
        this.seatingRepository = seatingRepository;
        this.passportService = passportService;
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.configService = configService;
    }

    @Override public String id() { return ID; }
    @Override public String displayName() { return "TIAN dining (bookings + passport)"; }
    @Override public ConnectorCategory category() { return ConnectorCategory.OTHER; }
    @Override public boolean enabled() { return configService.isEnabled(ID, true); }

    @Override
    public Set<ConnectorAction> actions() {
        return Set.of(
                new ConnectorAction(RES_CONFIRM, "Email guest booking confirmation"),
                new ConnectorAction(RES_CANCELLED, "Email guest booking cancelled"),
                new ConnectorAction(RES_HOST, "Email restaurant new booking"),
                new ConnectorAction(PASSPORT_STAMP, "Stamp passport with dishes"),
                new ConnectorAction(PASSPORT_VISIT, "Stamp passport with a visit"));
    }

    @Override
    public ConnectorResult execute(String actionCode, OrderStageContext ctx) {
        return switch (actionCode) {
            case PASSPORT_STAMP -> {
                List<Long> dishIds = ctx.getItems() == null ? List.of() : ctx.getItems().stream()
                        .filter(i -> DiningConstants.DISH.equals(i.getItemType()))
                        .map(OrderItemSnapshot::getItemId).filter(Objects::nonNull).toList();
                int added = passportService.stampDishes(ctx.getUserId(), ctx.getOrderId(), dishIds);
                yield ConnectorResult.ok("Stamped " + added + " new dish(es)");
            }
            case PASSPORT_VISIT -> ConnectorResult.ok(passportService.recordVisit(ctx.getUserId(), ctx.getOrderId())
                    ? "Visit recorded" : "Visit already recorded");
            case RES_CONFIRM, RES_CANCELLED, RES_HOST -> email(actionCode, ctx);
            default -> ConnectorResult.fail("Unknown action " + actionCode);
        };
    }

    private ConnectorResult email(String action, OrderStageContext ctx) {
        Reservation r = reservationRepository.findByOrderId(ctx.getOrderId()).orElse(null);
        if (r == null) return ConnectorResult.fail("No booking linked to order " + ctx.getOrderId());
        String seating = seatingRepository.findById(r.getSeatingOptionId()).map(SeatingOption::getName).orElse("Table");
        String to = RES_HOST.equals(action) ? adminEmail
                : userRepository.findById(r.getUserId()).map(User::getEmail).orElse(null);
        if (to == null || to.isBlank()) return ConnectorResult.fail("No recipient for " + action);
        String when = DATE.format(r.getBookingDate()) + " at " + TIME.format(r.getSlotTime());
        String subject;
        String lead;
        switch (action) {
            case RES_CONFIRM -> { subject = "Your table at TIAN is confirmed — " + when; lead = "Your table is confirmed. We look forward to welcoming you."; }
            case RES_CANCELLED -> { subject = "Your TIAN booking was cancelled"; lead = "Your booking has been cancelled. We hope to see you another time."; }
            default -> { subject = "New booking — " + when + " · " + r.getGuests() + " guests"; lead = "A new table booking has been placed online."; }
        }
        String occasion = r.getOccasion() == null || r.getOccasion() == Occasion.NONE ? null
                : r.getOccasion().name().replace('_', ' ').toLowerCase(Locale.ENGLISH);
        String link = (baseUrl == null ? "" : baseUrl) + "/my-table";
        String html = "<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1d1d1d'>"
                + "<p style='letter-spacing:.2em;font-size:12px;color:#8a6a12'>TIAN · THE ORIENTAL KITCHEN</p>"
                + "<h2 style='font-weight:600'>" + esc(lead) + "</h2>"
                + "<table style='border-collapse:collapse;font-size:15px'>"
                + row("When", when) + row("Party", r.getGuests() + (r.getGuests() == 1 ? " guest" : " guests"))
                + row("Table", seating) + (occasion == null ? "" : row("Occasion", occasion))
                + (r.getDietaryNotes() == null ? "" : row("Dietary notes", r.getDietaryNotes()))
                + (r.getSpecialRequest() == null ? "" : row("Request", r.getSpecialRequest()))
                + "</table>"
                + (RES_HOST.equals(action) ? "" : "<p><a href='" + esc(link) + "' style='color:#8a6a12'>Track or manage your booking</a></p>"
                + "<p style='font-size:13px;color:#666'>Pradeep Chambers, Law College Road, Shivajinagar, Pune 411004 · +91 78229 10626</p>")
                + "</div>";
        boolean sent = emailService.sendHtml(to, subject, html);
        return sent ? ConnectorResult.ok("Emailed " + action) : ConnectorResult.fail("Email failed for " + action);
    }

    private static String row(String k, String v) {
        return "<tr><td style='padding:4px 16px 4px 0;color:#666'>" + esc(k) + "</td><td style='padding:4px 0'>" + esc(v) + "</td></tr>";
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#39;");
    }
}
