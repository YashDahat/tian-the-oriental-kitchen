package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** A completed dine-in visit (recorded when a booking is seated) — counts toward passport milestones. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dining_visit")
public class DiningVisit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Integer userId;
    @Column(nullable = false, unique = true)
    private Long orderId;
    private Instant visitedAt;
}
