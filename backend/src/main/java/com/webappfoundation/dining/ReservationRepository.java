package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByBookingDateAndSlotTimeAndSeatingOptionId(LocalDate date, LocalTime time, Long seatingOptionId);
    List<Reservation> findByBookingDate(LocalDate date);
    List<Reservation> findByBookingDateBetweenOrderByBookingDateAscSlotTimeAsc(LocalDate from, LocalDate to);
    List<Reservation> findByUserIdOrderByBookingDateDescSlotTimeDesc(Integer userId);
    Optional<Reservation> findByOrderId(Long orderId);
}
