package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavouriteDishRepository extends JpaRepository<FavouriteDish, Long> {
    List<FavouriteDish> findByUserIdOrderByCreatedAtDesc(Integer userId);
    Optional<FavouriteDish> findByUserIdAndDishId(Integer userId, Long dishId);
}
