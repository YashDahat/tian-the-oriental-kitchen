package com.webappfoundation.dining;

import com.webappfoundation.catalog.CatalogItemResolver;
import com.webappfoundation.dto.CatalogItemDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * A table booking as a ₹0 sellable (itemType "TABLE") on the "table-booking" workflow. Not cartable — a
 * booking is placed by {@link ReservationService} (which checks slot capacity first), never via the cart.
 */
@Component
public class SeatingCatalogResolver implements CatalogItemResolver {

    private final SeatingOptionRepository repository;

    public SeatingCatalogResolver(SeatingOptionRepository repository) {
        this.repository = repository;
    }

    @Override
    public String itemType() {
        return DiningConstants.TABLE;
    }

    @Override
    public List<CatalogItemDto> resolve(Collection<Long> ids) {
        return repository.findByIdIn(ids).stream().filter(SeatingOption::isActive)
                .map(s -> CatalogItemDto.builder()
                        .itemType(DiningConstants.TABLE)
                        .itemId(s.getId())
                        .name(s.getName())
                        .description(s.getDescription())
                        .price(BigDecimal.ZERO)
                        .priceUnit("per booking")
                        .detailPath("/reserve")
                        .category("TABLE")
                        .active(true)
                        .cartable(false)
                        .workflowCode(DiningConstants.WF_TABLE)
                        .attributes(Map.of("minGuests", s.getMinGuests(), "maxGuests", s.getMaxGuests()))
                        .build())
                .toList();
    }
}
