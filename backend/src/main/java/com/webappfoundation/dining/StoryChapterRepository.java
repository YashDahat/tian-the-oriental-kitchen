package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoryChapterRepository extends JpaRepository<StoryChapter, Long> {
    List<StoryChapter> findByActiveTrueOrderByOrdinalAsc();
    List<StoryChapter> findAllByOrderByOrdinalAsc();
}
