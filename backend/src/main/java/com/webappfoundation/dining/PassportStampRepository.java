package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PassportStampRepository extends JpaRepository<PassportStamp, Long> {
    List<PassportStamp> findByUserIdOrderByStampedAtAsc(Integer userId);
    boolean existsByUserIdAndDishId(Integer userId, Long dishId);
}
