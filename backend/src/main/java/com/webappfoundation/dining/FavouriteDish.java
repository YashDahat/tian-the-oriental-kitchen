package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** A dish a guest has saved. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "favourite_dish", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "dishId"}))
public class FavouriteDish {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Integer userId;
    @Column(nullable = false)
    private Long dishId;
    private Instant createdAt;
}
