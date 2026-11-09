package com.webappfoundation.dining;

import com.webappfoundation.catalog.CatalogItemResolver;
import com.webappfoundation.dto.CatalogItemDto;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/** Maps TIAN's {@link Dish} to the universal catalog shape (itemType "DISH", takeaway workflow). */
@Component
public class DishCatalogResolver implements CatalogItemResolver {

    private final DishRepository dishRepository;

    public DishCatalogResolver(DishRepository dishRepository) {
        this.dishRepository = dishRepository;
    }

    @Override
    public String itemType() {
        return DiningConstants.DISH;
    }

    @Override
    public List<CatalogItemDto> resolve(Collection<Long> ids) {
        return dishRepository.findByIdIn(ids).stream().filter(Dish::isActive).map(DishCatalogResolver::toDto).toList();
    }

    static CatalogItemDto toDto(Dish d) {
        return CatalogItemDto.builder()
                .itemType(DiningConstants.DISH)
                .itemId(d.getId())
                .name(d.getName())
                .description(d.getDescription())
                .price(d.getPrice())
                .imageUrl(d.getImageUrl())
                .slug(d.getSlug())
                .detailPath("/menu?dish=" + d.getSlug())
                .category(d.getKitchen().name())
                .active(d.isActive())
                .cartable(d.isTakeaway())
                .workflowCode(d.getWorkflowCode() == null ? DiningConstants.WF_TAKEAWAY : d.getWorkflowCode())
                .attributes(Map.of("veg", d.isVeg(), "spiceLevel", d.getSpiceLevel(), "signature", d.isSignature()))
                .build();
    }
}
