package com.webappfoundation.dining;

import com.webappfoundation.dining.DiningDtos.*;
import com.webappfoundation.dto.BulkUploadResult;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/** Admin dining management (ADMIN-gated by SecurityConfig's /api/v1/admin/** rule). Writes are audited in the services. */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminDiningController {

    private final DiningContentService content;
    private final ReservationService reservations;

    public AdminDiningController(DiningContentService content, ReservationService reservations) {
        this.content = content;
        this.reservations = reservations;
    }

    // Dishes
    @GetMapping("/dishes") public List<DishDto> dishes() { return content.adminDishes(); }
    @PostMapping("/dishes") @ResponseStatus(HttpStatus.CREATED)
    public DishDto createDish(@RequestBody UpsertDishRequest r) { return content.createDish(r); }
    @PutMapping("/dishes/{id}") public DishDto updateDish(@PathVariable Long id, @RequestBody UpsertDishRequest r) { return content.updateDish(id, r); }
    @DeleteMapping("/dishes/{id}") public ResponseEntity<Void> deleteDish(@PathVariable Long id) { content.deleteDish(id); return ResponseEntity.noContent().build(); }
    @PostMapping(value = "/dishes/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult bulkDishes(@RequestParam("file") MultipartFile file) { return content.bulkImportDishes(file); }

    // Seating options
    @GetMapping("/seating") public List<SeatingOptionDto> seating() { return content.adminSeating(); }
    @PostMapping("/seating") @ResponseStatus(HttpStatus.CREATED)
    public SeatingOptionDto createSeating(@RequestBody UpsertSeatingOptionRequest r) { return content.upsertSeating(null, r); }
    @PutMapping("/seating/{id}") public SeatingOptionDto updateSeating(@PathVariable Long id, @RequestBody UpsertSeatingOptionRequest r) { return content.upsertSeating(id, r); }
    @DeleteMapping("/seating/{id}") public ResponseEntity<Void> deleteSeating(@PathVariable Long id) { content.deactivateSeating(id); return ResponseEntity.noContent().build(); }
    @PostMapping(value = "/seating/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult bulkSeating(@RequestParam("file") MultipartFile file) { return content.bulkImportSeating(file); }

    // Story chapters
    @GetMapping("/story") public List<StoryChapterDto> story() { return content.adminStory(); }
    @PostMapping("/story") @ResponseStatus(HttpStatus.CREATED)
    public StoryChapterDto createStory(@RequestBody UpsertStoryChapterRequest r) { return content.upsertStory(null, r); }
    @PutMapping("/story/{id}") public StoryChapterDto updateStory(@PathVariable Long id, @RequestBody UpsertStoryChapterRequest r) { return content.upsertStory(id, r); }
    @DeleteMapping("/story/{id}") public ResponseEntity<Void> deleteStory(@PathVariable Long id) { content.deleteStory(id); return ResponseEntity.noContent().build(); }
    @PostMapping(value = "/story/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult bulkStory(@RequestParam("file") MultipartFile file) { return content.bulkImportStory(file); }

    // Passport milestones
    @GetMapping("/passport-milestones") public List<PassportMilestoneDto> milestones() { return content.adminMilestones(); }
    @PostMapping("/passport-milestones") @ResponseStatus(HttpStatus.CREATED)
    public PassportMilestoneDto createMilestone(@RequestBody UpsertPassportMilestoneRequest r) { return content.upsertMilestone(null, r); }
    @PutMapping("/passport-milestones/{id}") public PassportMilestoneDto updateMilestone(@PathVariable Long id, @RequestBody UpsertPassportMilestoneRequest r) { return content.upsertMilestone(id, r); }
    @DeleteMapping("/passport-milestones/{id}") public ResponseEntity<Void> deleteMilestone(@PathVariable Long id) { content.deleteMilestone(id); return ResponseEntity.noContent().build(); }
    @PostMapping(value = "/passport-milestones/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult bulkMilestones(@RequestParam("file") MultipartFile file) { return content.bulkImportMilestones(file); }

    // Reservations day sheet (read-only view over table-booking orders; stage moves go through the order board API)
    @GetMapping("/reservations")
    public List<AdminReservationRow> reservations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reservations.adminSheet(from, to);
    }
}
