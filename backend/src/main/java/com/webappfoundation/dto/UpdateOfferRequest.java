package com.webappfoundation.dto;

import com.webappfoundation.model.OfferTrigger;
import com.webappfoundation.model.OfferType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Admin edit payload for an existing discount code (used by the foundation's AdminOfferController /
 * OfferAdminService.update). The code string and owning user are immutable, so they are omitted.
 * NOTE: this DTO was referenced by the foundation but missing from it; added here so the project compiles.
 * Shape mirrors the frontend foundation type {@code UpdateOfferRequest} in types/loyalty.ts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOfferRequest {
    private OfferTrigger trigger;
    private OfferType type;
    private BigDecimal value;
    private BigDecimal minSpend;
    private BigDecimal maxDiscount;
    private Integer maxUses;
    private Instant startsAt;
    private Instant expiresAt;
    private String campaignId;
}
