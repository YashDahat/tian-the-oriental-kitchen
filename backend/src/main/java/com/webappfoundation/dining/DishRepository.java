package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DishRepository extends JpaRepository<Dish, Long> {
    List<Dish> findByActiveTrueOrderByKitchenAscSortOrderAscNameAsc();
    List<Dish> findAllByOrderByKitchenAscSortOrderAscNameAsc();
    List<Dish> findByIdIn(Collection<Long> ids);
    Optional<Dish> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
