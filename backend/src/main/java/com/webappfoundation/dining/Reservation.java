package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A table booking's details. Its lifecycle (confirmed → arrived → seated → completed / cancelled) lives on
 * the linked order in the "table-booking" workflow — this row only holds what the order spine can't.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reservation", indexes = @Index(name = "ix_reservation_slot", columnList = "bookingDate,slotTime,seatingOptionId"))
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer userId;

    @Column(nullable = false, unique = true)
    private Long orderId;

    @Column(nullable = false)
    private Long seatingOptionId;

    @Column(nullable = false)
    private LocalDate bookingDate;

    @Column(nullable = false)
    private LocalTime slotTime;

    private int guests;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Occasion occasion = Occasion.NONE;

    @Column(length = 500)
    private String dietaryNotes;

    @Column(length = 500)
    private String specialRequest;

    private Instant createdAt;
}
