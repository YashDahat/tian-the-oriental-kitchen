package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A bookable kind of table (itemType "TABLE", ₹0) — e.g. "Table for two". {@code slotCapacity} is how many
 * such tables exist per seating slot; the reservation service never books beyond it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "seating_option")
public class SeatingOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    private int minGuests;
    private int maxGuests;
    private int slotCapacity;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private int sortOrder = 0;
}
