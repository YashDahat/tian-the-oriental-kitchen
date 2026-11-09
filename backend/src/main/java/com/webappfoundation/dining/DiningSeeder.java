package com.webappfoundation.dining;

import com.webappfoundation.connector.builtin.EmailConnector;
import com.webappfoundation.connector.demo.DemoRefundConnector;
import com.webappfoundation.dto.WorkflowDto;
import com.webappfoundation.dto.WorkflowDto.BindingDto;
import com.webappfoundation.dto.WorkflowDto.StageDto;
import com.webappfoundation.model.Branch;
import com.webappfoundation.model.CatalogRecommendation;
import com.webappfoundation.model.RecommendationType;
import com.webappfoundation.model.RefundPolicy;
import com.webappfoundation.model.Workflow;
import com.webappfoundation.repository.BranchRepository;
import com.webappfoundation.repository.CatalogRecommendationRepository;
import com.webappfoundation.repository.WorkflowRepository;
import com.webappfoundation.service.WorkflowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Idempotent startup seed for TIAN: the two workflows this restaurant runs (table bookings + takeaway
 * pre-orders), the Law College Road branch, the menu, seating options, story chapters, passport milestones and
 * a few "goes well with" pairings. Runs after the foundation's workflow seed (@Order 0) and before loyalty
 * bindings (@Order 50) and sprint bootstrap (@Order 100) so both pick the new workflows up.
 *
 * <p>Menu facts come from public listings (magicpin "popular items" with prices; dish names from District,
 * restaurant-guru and Google reviews). Only magicpin's five prices are marked {@code priceVerified}; the rest
 * are indicative and flagged on the site until the owner confirms them in /admin/menu.
 */
@Component
public class DiningSeeder {

    private static final Logger log = LoggerFactory.getLogger(DiningSeeder.class);

    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;
    private final BranchRepository branchRepository;
    private final DishRepository dishRepository;
    private final SeatingOptionRepository seatingRepository;
    private final StoryChapterRepository storyRepository;
    private final PassportMilestoneRepository milestoneRepository;
    private final CatalogRecommendationRepository recommendationRepository;

    public DiningSeeder(WorkflowRepository workflowRepository, WorkflowService workflowService,
                        BranchRepository branchRepository, DishRepository dishRepository,
                        SeatingOptionRepository seatingRepository, StoryChapterRepository storyRepository,
                        PassportMilestoneRepository milestoneRepository,
                        CatalogRecommendationRepository recommendationRepository) {
        this.workflowRepository = workflowRepository;
        this.workflowService = workflowService;
        this.branchRepository = branchRepository;
        this.dishRepository = dishRepository;
        this.seatingRepository = seatingRepository;
        this.storyRepository = storyRepository;
        this.milestoneRepository = milestoneRepository;
        this.recommendationRepository = recommendationRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(10)
    @Transactional
    public void seed() {
        seedWorkflows();
        seedBranch();
        seedDishes();
        seedSeating();
        seedStory();
        seedMilestones();
        seedPairings();
    }

    // ── Workflows ──

    private void seedWorkflows() {
        if (!workflowRepository.existsByCode(DiningConstants.WF_TABLE)) {
            log.info("Seeding TIAN table-booking workflow");
            workflowRepository.save(Workflow.builder().code(DiningConstants.WF_TABLE).label("Table bookings")
                    .isDefault(false).staffRole("Host").build());
            // A booking is a ₹0 order: placement auto-advances to CONFIRMED (onPaidEntry). Guests can cancel any
            // time before arrival; ARRIVED has a 10-minute SLA so the board flags anyone kept waiting at the door.
            workflowService.replaceWorkflow(DiningConstants.WF_TABLE, WorkflowDto.builder()
                    .label("Table bookings").staffRole("Host")
                    .stages(List.of(
                            stage("REQUESTED", "Requested", true, false, false, true, RefundPolicy.FULL, null, 15, List.of()),
                            stage("CONFIRMED", "Confirmed", false, true, false, true, RefundPolicy.FULL, null, null, List.of(
                                    bind(DiningConnector.ID, DiningConnector.RES_CONFIRM),
                                    bind(DiningConnector.ID, DiningConnector.RES_HOST))),
                            stage("ARRIVED", "Guests arrived", false, false, false, false, RefundPolicy.NONE, null, 10, List.of()),
                            stage("SEATED", "Seated", false, false, false, false, RefundPolicy.NONE, null, 120, List.of(
                                    bind(DiningConnector.ID, DiningConnector.PASSPORT_VISIT))),
                            stage("COMPLETED", "Completed", false, false, true, false, RefundPolicy.NONE, null, null, List.of()),
                            stage(WorkflowService.CANCELLED_CODE, "Cancelled", false, false, true, false, RefundPolicy.NONE, null, null, List.of(
                                    bind(DiningConnector.ID, DiningConnector.RES_CANCELLED)))))
                    .build());
        }
        if (!workflowRepository.existsByCode(DiningConstants.WF_TAKEAWAY)) {
            log.info("Seeding TIAN takeaway workflow");
            workflowRepository.save(Workflow.builder().code(DiningConstants.WF_TAKEAWAY).label("Takeaway pre-orders")
                    .isDefault(false).staffRole("Packer").build());
            // Pick-up only (no delivery). Full refund until the kitchen starts, 50% while cooking, none once ready.
            workflowService.replaceWorkflow(DiningConstants.WF_TAKEAWAY, WorkflowDto.builder()
                    .label("Takeaway pre-orders").staffRole("Packer")
                    .stages(List.of(
                            stage("PLACED", "Placed", true, false, false, true, RefundPolicy.FULL, null, 5, List.of()),
                            stage("CONFIRMED", "Confirmed", false, true, false, true, RefundPolicy.FULL, null, 10, List.of(
                                    bind(EmailConnector.ID, EmailConnector.EMAIL_CUSTOMER),
                                    bind(EmailConnector.ID, EmailConnector.EMAIL_STORE))),
                            stage("IN_KITCHEN", "In the kitchen", false, false, false, true, RefundPolicy.PARTIAL, 50, 25, List.of()),
                            stage("READY", "Ready at the counter", false, false, false, false, RefundPolicy.NONE, null, 30, List.of(
                                    bind(EmailConnector.ID, EmailConnector.EMAIL_CUSTOMER))),
                            stage("COLLECTED", "Collected", false, false, true, false, RefundPolicy.NONE, null, null, List.of(
                                    bind(DiningConnector.ID, DiningConnector.PASSPORT_STAMP))),
                            stage(WorkflowService.CANCELLED_CODE, "Cancelled", false, false, true, false, RefundPolicy.NONE, null, null, List.of(
                                    bind(EmailConnector.ID, EmailConnector.EMAIL_CUSTOMER),
                                    bind(DemoRefundConnector.ID, DemoRefundConnector.REFUND_ISSUE)))))
                    .build());
        }
    }

    private static StageDto stage(String code, String label, boolean initial, boolean onPaid, boolean terminal,
                                  boolean cancellable, RefundPolicy policy, Integer pct, Integer target, List<BindingDto> bindings) {
        return StageDto.builder().code(code).label(label).initial(initial).onPaidEntry(onPaid).terminal(terminal)
                .cancellable(cancellable).refundPolicy(policy).refundPercent(pct).targetMinutes(target)
                .bindings(bindings).build();
    }

    private static BindingDto bind(String connectorId, String action) {
        return BindingDto.builder().connectorId(connectorId).actionCode(action).enabled(true).params(Map.of()).build();
    }

    // ── Branch ──

    private void seedBranch() {
        if (branchRepository.existsBySlug("law-college-road")) return;
        Instant now = Instant.now();
        branchRepository.save(Branch.builder()
                .name("TIAN — Law College Road").slug("law-college-road").phone("+91 78229 10626")
                .addressLine("Showroom No 1, Pradeep Chambers, Law College Rd, Shivajinagar")
                .city("Pune").state("Maharashtra").pincode("411004")
                .latitude(18.5191543).longitude(73.8305353)
                .googleMapsUrl("https://www.google.com/maps/search/?api=1&query=TIAN%20The%20Oriental%20Kitchen&query_place_id=ChIJbXi1c6q_wjsRDJcvZDkx9iQ")
                .openingHours("Daily 11 am–3:30 pm, 6:30–11:30 pm")
                .active(true).createdAt(now).updatedAt(now).build());
    }

    // ── Menu ──

    private record D(String name, Kitchen k, int price, boolean verified, boolean veg, int spice, boolean sig, Integer pcs, String desc) {}

    private void seedDishes() {
        if (dishRepository.count() > 0) return;
        List<D> menu = List.of(
                // The steamer — dim sum. Five prices below are from magicpin's public listing (verified=true).
                new D("Steamed Vegetable with Coriander Dumpling", Kitchen.STEAMER, 375, true, true, 0, false, null,
                        "Garden vegetables and fresh coriander in a fine steamed wrapper."),
                new D("Chilli Garlic Cheese Dumpling", Kitchen.STEAMER, 375, true, true, 2, false, null,
                        "Molten cheese with chilli and garlic — for those who like a little heat."),
                new D("Corn and Water Chestnut Dumpling", Kitchen.STEAMER, 375, true, true, 0, false, null,
                        "Sweet corn and crunchy water chestnut, steamed to order."),
                new D("Crystal Dumplings", Kitchen.STEAMER, 425, false, true, 0, true, 4,
                        "Translucent wrappers you can almost see through — a guest favourite."),
                new D("Edamame Truffle Dumplings", Kitchen.STEAMER, 450, false, true, 0, true, 4,
                        "Edamame with a whisper of truffle."),
                new D("Chilli Oil Chicken Dumpling", Kitchen.STEAMER, 450, false, false, 2, true, 4,
                        "Chicken dumplings finished in fragrant chilli oil."),
                new D("Prawn and Crab Dumplings", Kitchen.STEAMER, 525, false, false, 0, false, 4,
                        "Seafood dumplings, delicate and sweet."),
                new D("Custard Buns", Kitchen.STEAMER, 350, false, true, 0, true, null,
                        "Soft steamed buns with a warm custard centre."),
                // The sushi table
                new D("Sushi Board", Kitchen.SUSHI, 1450, false, false, 0, true, null,
                        "The board guests photograph before they eat — an assortment from the sushi table. Ask about a vegetarian board."),
                new D("Avocado Cucumber Cream Cheese Uramaki", Kitchen.SUSHI, 545, false, true, 0, false, 8,
                        "Inside-out roll of avocado, cucumber and cream cheese."),
                new D("Spicy Tuna Uramaki", Kitchen.SUSHI, 695, false, false, 1, true, 8,
                        "Tuna with a gentle chilli kick, rolled inside-out."),
                // The wok
                new D("Hong Kong Style Noodles", Kitchen.WOK, 425, false, true, 1, true, null,
                        "Wok-tossed noodles with that smoky wok breath."),
                new D("Veg Crispy Pan-Fried Noodles", Kitchen.WOK, 445, false, true, 2, false, null,
                        "Crisp noodle nest under a vegetable-packed sauce — spicy, but balanced."),
                new D("Seafood Wok-Tossed Hakka Noodles", Kitchen.WOK, 595, false, false, 1, false, null,
                        "Hakka noodles tossed with seafood over high flame."),
                new D("Sizzling Sichuan Chicken", Kitchen.WOK, 575, false, false, 3, false, null,
                        "Chicken in a numbing, sizzling Sichuan sauce."),
                new D("Garlic Edamame Fried Rice", Kitchen.WOK, 395, false, true, 0, false, null,
                        "Fried rice with garlic and edamame — pairs with the house vegetable curry."),
                new D("TIAN Special Mixed Vegetable Curry", Kitchen.WOK, 475, false, true, 1, true, null,
                        "The house curry of mixed vegetables; guests pair it with garlic edamame fried rice."),
                new D("Clay Pot Rice in Black Bean Sauce", Kitchen.WOK, 495, false, true, 1, false, null,
                        "Rice cooked in a clay pot with savoury black bean sauce."),
                // Small plates
                new D("Edamame Bean Pods — Salted", Kitchen.SMALL_PLATES, 350, true, true, 0, false, null,
                        "Warm edamame pods with sea salt."),
                new D("Edamame Bean Pods — Spicy", Kitchen.SMALL_PLATES, 375, true, true, 2, false, null,
                        "Edamame pods tossed in chilli."),
                new D("Sesame Potato Toast", Kitchen.SMALL_PLATES, 345, false, true, 0, false, null,
                        "Crisp sesame toast with a soft potato layer."),
                new D("Salt and Pepper Squid", Kitchen.SMALL_PLATES, 545, false, false, 1, true, null,
                        "Crisp squid with cracked pepper and salt."),
                new D("Volcano Prawn Tempura", Kitchen.SMALL_PLATES, 625, false, false, 2, false, null,
                        "Light tempura prawns with a fiery glaze."),
                new D("Chicken Coriander Soup", Kitchen.SMALL_PLATES, 295, false, false, 0, false, null,
                        "A clear, warming soup with fresh coriander."),
                // Sweets
                new D("Chocolate Bao", Kitchen.SWEETS, 345, false, true, 0, false, null,
                        "Steamed bao with a molten chocolate centre."));
        Instant now = Instant.now();
        int i = 0;
        for (D d : menu) {
            dishRepository.save(Dish.builder().name(d.name()).slug(DiningContentService.slugify(d.name()))
                    .kitchen(d.k()).price(BigDecimal.valueOf(d.price())).priceVerified(d.verified()).veg(d.veg())
                    .spiceLevel(d.spice()).signature(d.sig()).pieces(d.pcs()).description(d.desc())
                    .active(true).takeaway(!d.name().equals("Sushi Board")).sortOrder(i++)
                    .workflowCode(DiningConstants.WF_TAKEAWAY).createdAt(now).updatedAt(now).build());
        }
    }

    private void seedSeating() {
        if (seatingRepository.count() > 0) return;
        seatingRepository.saveAll(List.of(
                SeatingOption.builder().name("Table for two").description("A quiet table for a date night or a long catch-up.")
                        .minGuests(1).maxGuests(2).slotCapacity(4).sortOrder(0).active(true).build(),
                SeatingOption.builder().name("Family table").description("Room for the whole family and lots of shared plates.")
                        .minGuests(3).maxGuests(6).slotCapacity(4).sortOrder(1).active(true).build(),
                SeatingOption.builder().name("Group dining").description("For celebrations and team dinners — we'll set the table together.")
                        .minGuests(7).maxGuests(12).slotCapacity(1).sortOrder(2).active(true).build()));
    }

    private void seedStory() {
        if (storyRepository.count() > 0) return;
        storyRepository.saveAll(List.of(
                StoryChapter.builder().ordinal(1).label("The street").title("A doorway on Law College Road")
                        .body("TIAN sits in Pradeep Chambers on Law College Road, Shivajinagar — a short walk from Pune's college campuses. "
                                + "Step inside and the street falls away: fretwork screens throw red shadows across deep walnut tones, "
                                + "and the room settles into an old-Shanghai calm.").active(true).build(),
                StoryChapter.builder().ordinal(2).label("The steamer").title("Folds, steam and patience")
                        .body("Dim sum is a craft of small things done precisely: a wrapper thin enough to glow, a fold that holds, "
                                + "a few minutes of steam. Crystal dumplings, edamame with truffle, chilli-oil chicken — each basket "
                                + "is made to be shared.").active(true).build(),
                StoryChapter.builder().ordinal(3).label("The sushi table").title("Built to be looked at first")
                        .body("Guests talk about the sushi board as much as they talk about the taste — it arrives as a small piece "
                                + "of theatre. Uramaki rolls inside-out, from avocado and cream cheese to spicy tuna.").active(true).build(),
                StoryChapter.builder().ordinal(4).label("The wok").title("Heat, speed and balance")
                        .body("Over high flame the wok gives noodles their smoky edge. Regulars say the flavours are bold without "
                                + "being heavy — spicy, but never at the cost of the dish.").active(true).build(),
                StoryChapter.builder().ordinal(5).label("Why people return").title("A 4.8 that guests keep earning")
                        .body("Over 1,500 Google reviews average 4.8 stars. The reasons repeat: presentation that turns food into an "
                                + "occasion, warm and attentive service, and plenty of thoughtful vegetarian choices.").active(true).build()));
    }

    private void seedMilestones() {
        if (milestoneRepository.count() > 0) return;
        // Placeholder rewards — the restaurant edits or replaces these in /admin/dining before launch.
        milestoneRepository.saveAll(List.of(
                PassportMilestone.builder().stamps(3).title("First basket").reward("Your name on our regulars' list — and first word on new dishes.").active(true).build(),
                PassportMilestone.builder().stamps(8).title("Steamer apprentice").reward("A reward chosen by the restaurant — shown here once it's set.").active(true).build(),
                PassportMilestone.builder().stamps(15).title("Three-kitchen explorer").reward("A reward chosen by the restaurant — shown here once it's set.").active(true).build()));
    }

    private void seedPairings() {
        if (recommendationRepository.count() > 0) return;
        Map<String, Long> ids = new java.util.HashMap<>();
        dishRepository.findAll().forEach(d -> ids.put(d.getName(), d.getId()));
        List<String[]> pairs = List.of(
                new String[]{"TIAN Special Mixed Vegetable Curry", "Garlic Edamame Fried Rice"},
                new String[]{"Garlic Edamame Fried Rice", "TIAN Special Mixed Vegetable Curry"},
                new String[]{"Crystal Dumplings", "Edamame Truffle Dumplings"},
                new String[]{"Chilli Oil Chicken Dumpling", "Hong Kong Style Noodles"},
                new String[]{"Spicy Tuna Uramaki", "Avocado Cucumber Cream Cheese Uramaki"},
                new String[]{"Hong Kong Style Noodles", "Salt and Pepper Squid"},
                new String[]{"Veg Crispy Pan-Fried Noodles", "Crystal Dumplings"},
                new String[]{"Edamame Bean Pods — Salted", "Spicy Tuna Uramaki"},
                new String[]{"Custard Buns", "Chocolate Bao"});
        Instant now = Instant.now();
        List<CatalogRecommendation> rows = new ArrayList<>();
        double score = 1.0;
        for (String[] p : pairs) {
            Long a = ids.get(p[0]);
            Long b = ids.get(p[1]);
            if (a == null || b == null) continue;
            rows.add(CatalogRecommendation.builder().sourceItemType(DiningConstants.DISH).sourceItemId(a)
                    .targetItemType(DiningConstants.DISH).targetItemId(b).relationType(RecommendationType.CROSS_SELL)
                    .score(score).active(true).createdAt(now).updatedAt(now).build());
        }
        recommendationRepository.saveAll(rows);
    }
}
