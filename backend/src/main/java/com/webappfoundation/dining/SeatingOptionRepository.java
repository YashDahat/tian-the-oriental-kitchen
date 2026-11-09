package com.webappfoundation.dining;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SeatingOptionRepository extends JpaRepository<SeatingOption, Long> {
    List<SeatingOption> findByActiveTrueOrderBySortOrderAsc();
    List<SeatingOption> findAllByOrderBySortOrderAsc();
    List<SeatingOption> findByIdIn(Collection<Long> ids);

    /** Row lock that serialises concurrent bookings for the same kind of table (no double-booking). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SeatingOption s where s.id = :id")
    Optional<SeatingOption> lockById(@Param("id") Long id);
}
