package com.webappfoundation.dining;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** An admin-editable chapter of TIAN's story (home page + Our Story timeline). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "story_chapter")
public class StoryChapter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private int ordinal;
    /** Small label above the title, e.g. "The street". */
    private String label;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String body;
    @Column(columnDefinition = "text")
    private String imageUrl;
    @Builder.Default
    private boolean active = true;
}
