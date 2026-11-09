package com.webappfoundation.dining;

import com.webappfoundation.dining.DiningDtos.*;
import com.webappfoundation.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Public + guest-facing dining API: menu, story, seating, availability, bookings, passport, favourites. */
@RestController
@RequestMapping("/api/v1")
public class DiningController {

    private final DiningContentService contentService;
    private final ReservationService reservationService;
    private final PassportService passportService;

    public DiningController(DiningContentService contentService, ReservationService reservationService,
                            PassportService passportService) {
        this.contentService = contentService;
        this.reservationService = reservationService;
        this.passportService = passportService;
    }

    @GetMapping("/menu")
    public List<DishDto> menu() {
        return contentService.menu();
    }

    @GetMapping("/story")
    public List<StoryChapterDto> story() {
        return contentService.story();
    }

    @GetMapping("/seating")
    public List<SeatingOptionDto> seating() {
        return contentService.seating();
    }

    @GetMapping("/reservations/availability")
    public AvailabilityDto availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                        @RequestParam int guests) {
        return reservationService.availability(date, guests);
    }

    @PostMapping("/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationDto book(@CurrentUser Integer userId, @RequestBody CreateReservationRequest request) {
        return reservationService.create(userId, request);
    }

    @GetMapping("/reservations")
    public List<ReservationDto> mine(@CurrentUser Integer userId) {
        return reservationService.mine(userId);
    }

    @GetMapping("/reservations/{id}")
    public ReservationDto one(@CurrentUser Integer userId, @PathVariable Long id) {
        return reservationService.one(userId, id);
    }

    @GetMapping("/passport")
    public PassportDto passport(@CurrentUser Integer userId) {
        return passportService.me(userId);
    }

    @GetMapping("/favourites")
    public List<Long> favourites(@CurrentUser Integer userId) {
        return passportService.favourites(userId);
    }

    @PutMapping("/favourites/{dishId}")
    public List<Long> addFavourite(@CurrentUser Integer userId, @PathVariable Long dishId) {
        return passportService.addFavourite(userId, dishId);
    }

    @DeleteMapping("/favourites/{dishId}")
    public List<Long> removeFavourite(@CurrentUser Integer userId, @PathVariable Long dishId) {
        return passportService.removeFavourite(userId, dishId);
    }
}
