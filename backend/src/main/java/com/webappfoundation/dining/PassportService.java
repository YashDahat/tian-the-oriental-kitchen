package com.webappfoundation.dining;

import com.webappfoundation.dining.DiningDtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The Dumpling Passport: one stamp per distinct dish a guest has tasted (from collected takeaway orders) plus
 * one per dine-in visit (when a booking is seated). Stamps are written only by {@link DiningConnector} on
 * workflow stages, never by the client, so they can't be gamed.
 */
@Service
public class PassportService {

    private static final Logger log = LoggerFactory.getLogger(PassportService.class);

    private final PassportStampRepository stampRepository;
    private final DiningVisitRepository visitRepository;
    private final PassportMilestoneRepository milestoneRepository;
    private final DishRepository dishRepository;
    private final FavouriteDishRepository favouriteRepository;

    public PassportService(PassportStampRepository stampRepository, DiningVisitRepository visitRepository,
                           PassportMilestoneRepository milestoneRepository, DishRepository dishRepository,
                           FavouriteDishRepository favouriteRepository) {
        this.stampRepository = stampRepository;
        this.visitRepository = visitRepository;
        this.milestoneRepository = milestoneRepository;
        this.dishRepository = dishRepository;
        this.favouriteRepository = favouriteRepository;
    }

    @Transactional(readOnly = true)
    public PassportDto me(Integer userId) {
        requireUser(userId);
        List<PassportStamp> stamps = stampRepository.findByUserIdOrderByStampedAtAsc(userId);
        Map<Long, Dish> dishes = dishRepository.findByIdIn(stamps.stream().map(PassportStamp::getDishId).toList())
                .stream().collect(Collectors.toMap(Dish::getId, Function.identity()));
        List<PassportStampDto> stampDtos = stamps.stream()
                .filter(s -> dishes.containsKey(s.getDishId()))
                .map(s -> {
                    Dish d = dishes.get(s.getDishId());
                    return new PassportStampDto(d.getId(), d.getName(), d.getKitchen(), s.getStampedAt());
                }).toList();
        long visits = visitRepository.countByUserId(userId);
        int total = stampDtos.size() + (int) visits;
        List<PassportMilestoneDto> milestones = milestoneRepository.findByActiveTrueOrderByStampsAsc().stream()
                .map(DiningContentService::toDto).toList();
        PassportMilestoneDto next = milestones.stream().filter(m -> m.stamps() > total).findFirst().orElse(null);
        int totalDishes = dishRepository.findByActiveTrueOrderByKitchenAscSortOrderAscNameAsc().size();
        return new PassportDto(stampDtos.size(), visits, total, totalDishes, stampDtos, milestones, next);
    }

    /** Called by the connector when a takeaway order is collected. Idempotent per (user, dish). */
    @Transactional
    public int stampDishes(Integer userId, Long orderId, Collection<Long> dishIds) {
        if (userId == null || dishIds == null) return 0;
        int added = 0;
        for (Long dishId : new LinkedHashSet<>(dishIds)) {
            if (dishId == null || stampRepository.existsByUserIdAndDishId(userId, dishId)) continue;
            try {
                stampRepository.save(PassportStamp.builder().userId(userId).dishId(dishId).orderId(orderId)
                        .stampedAt(Instant.now()).build());
                added++;
            } catch (DataIntegrityViolationException e) {
                log.debug("Stamp already present for dish {}", dishId);
            }
        }
        return added;
    }

    /** Called by the connector when a table booking is seated. Idempotent per order. */
    @Transactional
    public boolean recordVisit(Integer userId, Long orderId) {
        if (userId == null || orderId == null || visitRepository.existsByOrderId(orderId)) return false;
        visitRepository.save(DiningVisit.builder().userId(userId).orderId(orderId).visitedAt(Instant.now()).build());
        return true;
    }

    // ── Favourites ──

    @Transactional(readOnly = true)
    public List<Long> favourites(Integer userId) {
        requireUser(userId);
        return favouriteRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(FavouriteDish::getDishId).toList();
    }

    @Transactional
    public List<Long> addFavourite(Integer userId, Long dishId) {
        requireUser(userId);
        dishRepository.findById(dishId).filter(Dish::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dish not found"));
        if (favouriteRepository.findByUserIdAndDishId(userId, dishId).isEmpty()) {
            favouriteRepository.save(FavouriteDish.builder().userId(userId).dishId(dishId).createdAt(Instant.now()).build());
        }
        return favourites(userId);
    }

    @Transactional
    public List<Long> removeFavourite(Integer userId, Long dishId) {
        requireUser(userId);
        favouriteRepository.findByUserIdAndDishId(userId, dishId).ifPresent(favouriteRepository::delete);
        return favourites(userId);
    }

    private static void requireUser(Integer userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
    }
}
