package com.webappfoundation.dining;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PassportMilestoneRepository extends JpaRepository<PassportMilestone, Long> {
    List<PassportMilestone> findByActiveTrueOrderByStampsAsc();
    List<PassportMilestone> findAllByOrderByStampsAsc();
}
