package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/** A menu dish — TIAN's sellable for takeaway pre-orders (itemType "DISH"). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dish")
public class Dish {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kitchen kitchen;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** False until the owner confirms the listed price (seeded prices from public listings or estimates). */
    @Builder.Default
    private boolean priceVerified = false;

    @Builder.Default
    private boolean veg = true;

    /** 0 = mild … 3 = hot. */
    @Builder.Default
    private int spiceLevel = 0;

    @Builder.Default
    private boolean signature = false;

    /** Pieces per portion (dumplings, uramaki), nullable. */
    private Integer pieces;

    @Column(columnDefinition = "text")
    private String imageUrl;

    @Builder.Default
    private boolean active = true;

    /** Can be pre-ordered for takeaway. */
    @Builder.Default
    private boolean takeaway = true;

    @Builder.Default
    private int sortOrder = 0;

    private String workflowCode;

    private Instant createdAt;
    private Instant updatedAt;
}
