package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** One dish "tasted" in a guest's Dumpling Passport — first time only (unique per user + dish). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "passport_stamp", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "dishId"}))
public class PassportStamp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Integer userId;
    @Column(nullable = false)
    private Long dishId;
    private Long orderId;
    private Instant stampedAt;
}
