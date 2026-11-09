package com.webappfoundation.dining;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Request/response shapes for TIAN's dining API (records — immutable, JSON-friendly). */
public final class DiningDtos {
    private DiningDtos() {}

    public record DishDto(Long id, String name, String slug, String description, Kitchen kitchen, BigDecimal price,
                          boolean priceVerified, boolean veg, int spiceLevel, boolean signature, Integer pieces,
                          String imageUrl, boolean active, boolean takeaway, int sortOrder, String workflowCode) {}

    public record UpsertDishRequest(String name, String slug, String description, Kitchen kitchen, BigDecimal price,
                                    Boolean priceVerified, Boolean veg, Integer spiceLevel, Boolean signature,
                                    Integer pieces, String imageUrl, Boolean active, Boolean takeaway, Integer sortOrder) {}

    public record SeatingOptionDto(Long id, String name, String description, int minGuests, int maxGuests,
                                   int slotCapacity, boolean active, int sortOrder) {}

    public record UpsertSeatingOptionRequest(String name, String description, Integer minGuests, Integer maxGuests,
                                             Integer slotCapacity, Boolean active, Integer sortOrder) {}

    public record StoryChapterDto(Long id, int ordinal, String label, String title, String body, String imageUrl, boolean active) {}

    public record UpsertStoryChapterRequest(Integer ordinal, String label, String title, String body, String imageUrl, Boolean active) {}

    public record PassportMilestoneDto(Long id, int stamps, String title, String reward, boolean active) {}

    public record UpsertPassportMilestoneRequest(Integer stamps, String title, String reward, Boolean active) {}

    /** One open seating option at a slot. */
    public record SlotOption(Long seatingOptionId, String seatingName, int tablesLeft) {}

    /** A seating slot on a day, with the tables that still fit the party. */
    public record SlotAvailability(LocalTime time, String service, boolean available, List<SlotOption> options) {}

    public record AvailabilityDto(LocalDate date, int guests, List<SlotAvailability> slots) {}

    public record CreateReservationRequest(LocalDate date, LocalTime time, Integer guests, Long seatingOptionId,
                                           Occasion occasion, String dietaryNotes, String specialRequest) {}

    public record ReservationDto(Long id, Long orderId, String orderNumber, LocalDate date, LocalTime time, int guests,
                                 Long seatingOptionId, String seatingName, Occasion occasion, String dietaryNotes,
                                 String specialRequest, String stageCode, String stageLabel, boolean cancellable,
                                 boolean upcoming, Instant createdAt) {}

    /** Admin day-sheet row — includes the guest's name/phone so the host can call ahead (admin only). */
    public record AdminReservationRow(Long id, Long orderId, String orderNumber, LocalDate date, LocalTime time,
                                      int guests, String seatingName, Occasion occasion, String dietaryNotes,
                                      String specialRequest, String guestName, String guestPhone,
                                      String stageCode, String stageLabel) {}

    public record PassportStampDto(Long dishId, String dishName, Kitchen kitchen, Instant stampedAt) {}

    public record PassportDto(int dishStamps, long visits, int total, int totalDishes,
                              List<PassportStampDto> stamps, List<PassportMilestoneDto> milestones,
                              PassportMilestoneDto nextMilestone) {}
}
