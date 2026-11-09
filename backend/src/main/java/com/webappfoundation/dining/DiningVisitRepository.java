package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DiningVisitRepository extends JpaRepository<DiningVisit, Long> {
    long countByUserId(Integer userId);
    boolean existsByOrderId(Long orderId);
}
