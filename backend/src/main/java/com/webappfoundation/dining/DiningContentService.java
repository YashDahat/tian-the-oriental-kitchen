package com.webappfoundation.dining;

import com.webappfoundation.dining.DiningDtos.*;
import com.webappfoundation.dto.BulkUploadResult;
import com.webappfoundation.exception.ResourceNotFoundException;
import com.webappfoundation.service.AuditActions;
import com.webappfoundation.service.AuditService;
import com.webappfoundation.service.SpreadsheetParser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Menu (dishes), seating options, story chapters and passport milestones — public reads + admin CRUD,
 * bulk import and audit. Every admin write records an audit event (never any PII).
 */
@Service
public class DiningContentService {

    private final DishRepository dishRepository;
    private final SeatingOptionRepository seatingRepository;
    private final StoryChapterRepository storyRepository;
    private final PassportMilestoneRepository milestoneRepository;
    private final SpreadsheetParser spreadsheetParser;
    private final AuditService auditService;

    public DiningContentService(DishRepository dishRepository, SeatingOptionRepository seatingRepository,
                                StoryChapterRepository storyRepository, PassportMilestoneRepository milestoneRepository,
                                SpreadsheetParser spreadsheetParser, AuditService auditService) {
        this.dishRepository = dishRepository;
        this.seatingRepository = seatingRepository;
        this.storyRepository = storyRepository;
        this.milestoneRepository = milestoneRepository;
        this.spreadsheetParser = spreadsheetParser;
        this.auditService = auditService;
    }

    // ── Mapping ──

    static DishDto toDto(Dish d) {
        return new DishDto(d.getId(), d.getName(), d.getSlug(), d.getDescription(), d.getKitchen(), d.getPrice(),
                d.isPriceVerified(), d.isVeg(), d.getSpiceLevel(), d.isSignature(), d.getPieces(), d.getImageUrl(),
                d.isActive(), d.isTakeaway(), d.getSortOrder(),
                d.getWorkflowCode() == null ? DiningConstants.WF_TAKEAWAY : d.getWorkflowCode());
    }

    static SeatingOptionDto toDto(SeatingOption s) {
        return new SeatingOptionDto(s.getId(), s.getName(), s.getDescription(), s.getMinGuests(), s.getMaxGuests(),
                s.getSlotCapacity(), s.isActive(), s.getSortOrder());
    }

    static StoryChapterDto toDto(StoryChapter c) {
        return new StoryChapterDto(c.getId(), c.getOrdinal(), c.getLabel(), c.getTitle(), c.getBody(), c.getImageUrl(), c.isActive());
    }

    static PassportMilestoneDto toDto(PassportMilestone m) {
        return new PassportMilestoneDto(m.getId(), m.getStamps(), m.getTitle(), m.getReward(), m.isActive());
    }

    // ── Dishes ──

    public List<DishDto> menu() {
        return dishRepository.findByActiveTrueOrderByKitchenAscSortOrderAscNameAsc().stream().map(DiningContentService::toDto).toList();
    }

    public List<DishDto> adminDishes() {
        return dishRepository.findAllByOrderByKitchenAscSortOrderAscNameAsc().stream().map(DiningContentService::toDto).toList();
    }

    @Transactional
    public DishDto createDish(UpsertDishRequest req) {
        Dish d = Dish.builder().createdAt(Instant.now()).workflowCode(DiningConstants.WF_TAKEAWAY).build();
        applyDish(d, req, true);
        d = dishRepository.save(d);
        auditService.record("DISH_CREATED", AuditActions.SUCCESS, "DISH", String.valueOf(d.getId()), d.getName());
        return toDto(d);
    }

    @Transactional
    public DishDto updateDish(Long id, UpsertDishRequest req) {
        Dish d = dishRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
        applyDish(d, req, false);
        d = dishRepository.save(d);
        auditService.record("DISH_UPDATED", AuditActions.SUCCESS, "DISH", String.valueOf(id), d.getName());
        return toDto(d);
    }

    @Transactional
    public void deleteDish(Long id) {
        Dish d = dishRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
        // Soft-delete: past orders and passport stamps keep pointing at it.
        d.setActive(false);
        d.setUpdatedAt(Instant.now());
        dishRepository.save(d);
        auditService.record("DISH_DEACTIVATED", AuditActions.SUCCESS, "DISH", String.valueOf(id), d.getName());
    }

    private void applyDish(Dish d, UpsertDishRequest r, boolean creating) {
        if (r == null || isBlank(r.name())) throw bad("Dish name is required");
        if (r.kitchen() == null) throw bad("Choose which kitchen the dish belongs to");
        if (r.price() == null || r.price().signum() <= 0) throw bad("Price must be greater than zero");
        if (r.spiceLevel() != null && (r.spiceLevel() < 0 || r.spiceLevel() > 3)) throw bad("Spice level is 0–3");
        if (r.pieces() != null && r.pieces() <= 0) throw bad("Pieces must be positive");
        String slug = isBlank(r.slug()) ? slugify(r.name()) : slugify(r.slug());
        if ((creating || !slug.equals(d.getSlug())) && dishRepository.existsBySlug(slug)) {
            slug = slug + "-" + (System.currentTimeMillis() % 10000);
        }
        d.setName(r.name().trim());
        d.setSlug(slug);
        d.setDescription(r.description());
        d.setKitchen(r.kitchen());
        d.setPrice(r.price());
        if (r.priceVerified() != null) d.setPriceVerified(r.priceVerified());
        if (r.veg() != null) d.setVeg(r.veg());
        if (r.spiceLevel() != null) d.setSpiceLevel(r.spiceLevel());
        if (r.signature() != null) d.setSignature(r.signature());
        d.setPieces(r.pieces());
        d.setImageUrl(isBlank(r.imageUrl()) ? null : r.imageUrl());
        if (r.active() != null) d.setActive(r.active());
        if (r.takeaway() != null) d.setTakeaway(r.takeaway());
        if (r.sortOrder() != null) d.setSortOrder(r.sortOrder());
        d.setUpdatedAt(Instant.now());
    }

    /** Columns: name,kitchen,price,veg,spiceLevel,signature,pieces,description,takeaway. */
    @Transactional
    public BulkUploadResult bulkImportDishes(MultipartFile file) {
        BulkUploadResult result = BulkUploadResult.builder().build();
        List<Map<String, String>> rows = spreadsheetParser.parse(file);
        int rowNum = 1;
        for (Map<String, String> row : rows) {
            rowNum++;
            try {
                String name = row.get("name");
                if (isBlank(name)) { result.addError(rowNum, "name is required"); continue; }
                if (dishRepository.existsBySlug(slugify(name))) { result.setSkipped(result.getSkipped() + 1); continue; }
                Kitchen kitchen = Kitchen.valueOf(req(row, "kitchen").trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
                UpsertDishRequest r = new UpsertDishRequest(name, null, row.get("description"), kitchen,
                        new BigDecimal(req(row, "price").trim()), false, bool(row.get("veg"), true),
                        isBlank(row.get("spicelevel")) ? 0 : Integer.parseInt(row.get("spicelevel").trim()),
                        bool(row.get("signature"), false),
                        isBlank(row.get("pieces")) ? null : Integer.parseInt(row.get("pieces").trim()),
                        null, true, bool(row.get("takeaway"), true), 0);
                Dish d = Dish.builder().createdAt(Instant.now()).workflowCode(DiningConstants.WF_TAKEAWAY).build();
                applyDish(d, r, true);
                dishRepository.save(d);
                result.setCreated(result.getCreated() + 1);
            } catch (IllegalArgumentException | ResponseStatusException e) {
                result.addError(rowNum, e instanceof ResponseStatusException rse ? rse.getReason() : "Invalid value: " + e.getMessage());
            }
        }
        auditService.record("DISH_BULK_IMPORT", AuditActions.SUCCESS, "DISH", null,
                "created=" + result.getCreated() + " failed=" + result.getFailed());
        return result;
    }

    // ── Seating options ──

    public List<SeatingOptionDto> seating() {
        return seatingRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(DiningContentService::toDto).toList();
    }

    public List<SeatingOptionDto> adminSeating() {
        return seatingRepository.findAllByOrderBySortOrderAsc().stream().map(DiningContentService::toDto).toList();
    }

    @Transactional
    public SeatingOptionDto upsertSeating(Long id, UpsertSeatingOptionRequest r) {
        SeatingOption s = id == null ? new SeatingOption()
                : seatingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Seating option not found"));
        if (r == null || isBlank(r.name())) throw bad("Name is required");
        int min = r.minGuests() == null ? 1 : r.minGuests();
        int max = r.maxGuests() == null ? min : r.maxGuests();
        int cap = r.slotCapacity() == null ? 1 : r.slotCapacity();
        if (min < 1 || max < min || max > 40) throw bad("Guests must be 1–40 with min ≤ max");
        if (cap < 0 || cap > 50) throw bad("Tables per slot must be 0–50");
        s.setName(r.name().trim());
        s.setDescription(r.description());
        s.setMinGuests(min);
        s.setMaxGuests(max);
        s.setSlotCapacity(cap);
        if (r.active() != null) s.setActive(r.active());
        if (r.sortOrder() != null) s.setSortOrder(r.sortOrder());
        s = seatingRepository.save(s);
        auditService.record(id == null ? "SEATING_CREATED" : "SEATING_UPDATED", AuditActions.SUCCESS, "SEATING_OPTION",
                String.valueOf(s.getId()), s.getName() + " cap=" + cap);
        return toDto(s);
    }

    @Transactional
    public void deactivateSeating(Long id) {
        SeatingOption s = seatingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Seating option not found"));
        s.setActive(false);
        seatingRepository.save(s);
        auditService.record("SEATING_DEACTIVATED", AuditActions.SUCCESS, "SEATING_OPTION", String.valueOf(id), s.getName());
    }

    /** Columns: name,minGuests,maxGuests,slotCapacity,description. */
    @Transactional
    public BulkUploadResult bulkImportSeating(MultipartFile file) {
        BulkUploadResult result = BulkUploadResult.builder().build();
        int rowNum = 1;
        for (Map<String, String> row : spreadsheetParser.parse(file)) {
            rowNum++;
            try {
                upsertSeating(null, new UpsertSeatingOptionRequest(req(row, "name"), row.get("description"),
                        Integer.parseInt(req(row, "minguests").trim()), Integer.parseInt(req(row, "maxguests").trim()),
                        Integer.parseInt(req(row, "slotcapacity").trim()), true, 0));
                result.setCreated(result.getCreated() + 1);
            } catch (IllegalArgumentException | ResponseStatusException e) {
                result.addError(rowNum, e instanceof ResponseStatusException rse ? rse.getReason() : "Invalid value: " + e.getMessage());
            }
        }
        return result;
    }

    // ── Story chapters ──

    public List<StoryChapterDto> story() {
        return storyRepository.findByActiveTrueOrderByOrdinalAsc().stream().map(DiningContentService::toDto).toList();
    }

    public List<StoryChapterDto> adminStory() {
        return storyRepository.findAllByOrderByOrdinalAsc().stream().map(DiningContentService::toDto).toList();
    }

    @Transactional
    public StoryChapterDto upsertStory(Long id, UpsertStoryChapterRequest r) {
        StoryChapter c = id == null ? new StoryChapter()
                : storyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Chapter not found"));
        if (r == null || isBlank(r.title())) throw bad("Title is required");
        if (isBlank(r.body())) throw bad("Write a few lines for this chapter");
        c.setOrdinal(r.ordinal() == null ? 0 : r.ordinal());
        c.setLabel(r.label());
        c.setTitle(r.title().trim());
        c.setBody(r.body());
        c.setImageUrl(isBlank(r.imageUrl()) ? null : r.imageUrl());
        c.setActive(r.active() == null || r.active());
        c = storyRepository.save(c);
        auditService.record(id == null ? "STORY_CREATED" : "STORY_UPDATED", AuditActions.SUCCESS, "STORY_CHAPTER",
                String.valueOf(c.getId()), c.getTitle());
        return toDto(c);
    }

    @Transactional
    public void deleteStory(Long id) {
        StoryChapter c = storyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Chapter not found"));
        storyRepository.delete(c);
        auditService.record("STORY_DELETED", AuditActions.SUCCESS, "STORY_CHAPTER", String.valueOf(id), c.getTitle());
    }

    /** Columns: ordinal,label,title,body. */
    @Transactional
    public BulkUploadResult bulkImportStory(MultipartFile file) {
        BulkUploadResult result = BulkUploadResult.builder().build();
        int rowNum = 1;
        for (Map<String, String> row : spreadsheetParser.parse(file)) {
            rowNum++;
            try {
                upsertStory(null, new UpsertStoryChapterRequest(
                        isBlank(row.get("ordinal")) ? rowNum : Integer.parseInt(row.get("ordinal").trim()),
                        row.get("label"), req(row, "title"), req(row, "body"), null, true));
                result.setCreated(result.getCreated() + 1);
            } catch (IllegalArgumentException | ResponseStatusException e) {
                result.addError(rowNum, e instanceof ResponseStatusException rse ? rse.getReason() : "Invalid value: " + e.getMessage());
            }
        }
        return result;
    }

    // ── Passport milestones ──

    public List<PassportMilestoneDto> adminMilestones() {
        return milestoneRepository.findAllByOrderByStampsAsc().stream().map(DiningContentService::toDto).toList();
    }

    @Transactional
    public PassportMilestoneDto upsertMilestone(Long id, UpsertPassportMilestoneRequest r) {
        PassportMilestone m = id == null ? new PassportMilestone()
                : milestoneRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Milestone not found"));
        if (r == null || isBlank(r.title())) throw bad("Title is required");
        if (r.stamps() == null || r.stamps() < 1 || r.stamps() > 100) throw bad("Stamps must be 1–100");
        m.setStamps(r.stamps());
        m.setTitle(r.title().trim());
        m.setReward(r.reward());
        m.setActive(r.active() == null || r.active());
        m = milestoneRepository.save(m);
        auditService.record(id == null ? "MILESTONE_CREATED" : "MILESTONE_UPDATED", AuditActions.SUCCESS,
                "PASSPORT_MILESTONE", String.valueOf(m.getId()), m.getTitle());
        return toDto(m);
    }

    @Transactional
    public void deleteMilestone(Long id) {
        PassportMilestone m = milestoneRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Milestone not found"));
        milestoneRepository.delete(m);
        auditService.record("MILESTONE_DELETED", AuditActions.SUCCESS, "PASSPORT_MILESTONE", String.valueOf(id), m.getTitle());
    }

    /** Columns: stamps,title,reward. */
    @Transactional
    public BulkUploadResult bulkImportMilestones(MultipartFile file) {
        BulkUploadResult result = BulkUploadResult.builder().build();
        int rowNum = 1;
        for (Map<String, String> row : spreadsheetParser.parse(file)) {
            rowNum++;
            try {
                upsertMilestone(null, new UpsertPassportMilestoneRequest(Integer.parseInt(req(row, "stamps").trim()),
                        req(row, "title"), row.get("reward"), true));
                result.setCreated(result.getCreated() + 1);
            } catch (IllegalArgumentException | ResponseStatusException e) {
                result.addError(rowNum, e instanceof ResponseStatusException rse ? rse.getReason() : "Invalid value: " + e.getMessage());
            }
        }
        return result;
    }

    // ── helpers ──

    static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String req(Map<String, String> row, String key) {
        String v = row.get(key);
        if (isBlank(v)) throw new IllegalArgumentException(key + " is required");
        return v;
    }

    private static boolean bool(String v, boolean def) {
        if (isBlank(v)) return def;
        String s = v.trim().toLowerCase(Locale.ROOT);
        return s.equals("true") || s.equals("yes") || s.equals("1") || s.equals("y");
    }

    static String slugify(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "dish" : slug;
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
