package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A reward the restaurant offers when a guest's passport reaches {@code stamps} (dishes + visits). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "passport_milestone")
public class PassportMilestone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private int stamps;
    @Column(nullable = false)
    private String title;
    @Column(length = 500)
    private String reward;
    @Builder.Default
    private boolean active = true;
}
