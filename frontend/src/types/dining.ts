export type Kitchen = 'STEAMER' | 'SUSHI' | 'WOK' | 'SMALL_PLATES' | 'SWEETS';
export type Occasion = 'NONE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'DATE_NIGHT' | 'FAMILY' | 'BUSINESS' | 'CELEBRATION';

export interface DishDto {
  id: number; name: string; slug: string; description: string | null; kitchen: Kitchen; price: number;
  priceVerified: boolean; veg: boolean; spiceLevel: number; signature: boolean; pieces: number | null;
  imageUrl: string | null; active: boolean; takeaway: boolean; sortOrder: number; workflowCode: string;
}
export interface UpsertDishRequest {
  name: string; slug?: string | null; description?: string | null; kitchen: Kitchen; price: number;
  priceVerified?: boolean; veg?: boolean; spiceLevel?: number; signature?: boolean; pieces?: number | null;
  imageUrl?: string | null; active?: boolean; takeaway?: boolean; sortOrder?: number;
}
export interface SeatingOptionDto {
  id: number; name: string; description: string | null; minGuests: number; maxGuests: number;
  slotCapacity: number; active: boolean; sortOrder: number;
}
export type UpsertSeatingOptionRequest = Omit<SeatingOptionDto, 'id'>;
export interface StoryChapterDto { id: number; ordinal: number; label: string | null; title: string; body: string; imageUrl: string | null; active: boolean }
export type UpsertStoryChapterRequest = Omit<StoryChapterDto, 'id'>;
export interface PassportMilestoneDto { id: number; stamps: number; title: string; reward: string | null; active: boolean }
export type UpsertPassportMilestoneRequest = Omit<PassportMilestoneDto, 'id'>;

export interface SlotOption { seatingOptionId: number; seatingName: string; tablesLeft: number }
export interface SlotAvailability { time: string; service: 'LUNCH' | 'DINNER'; available: boolean; options: SlotOption[] }
export interface AvailabilityDto { date: string; guests: number; slots: SlotAvailability[] }

export interface CreateReservationRequest {
  date: string; time: string; guests: number; seatingOptionId: number; occasion: Occasion;
  dietaryNotes?: string | null; specialRequest?: string | null;
}
export interface ReservationDto {
  id: number; orderId: number; orderNumber: string | null; date: string; time: string; guests: number;
  seatingOptionId: number; seatingName: string; occasion: Occasion; dietaryNotes: string | null;
  specialRequest: string | null; stageCode: string | null; stageLabel: string | null; cancellable: boolean;
  upcoming: boolean; createdAt: string;
}
export interface AdminReservationRow {
  id: number; orderId: number; orderNumber: string | null; date: string; time: string; guests: number;
  seatingName: string; occasion: Occasion; dietaryNotes: string | null; specialRequest: string | null;
  guestName: string; guestPhone: string | null; stageCode: string | null; stageLabel: string | null;
}
export interface PassportStampDto { dishId: number; dishName: string; kitchen: Kitchen; stampedAt: string }
export interface PassportDto {
  dishStamps: number; visits: number; total: number; totalDishes: number; stamps: PassportStampDto[];
  milestones: PassportMilestoneDto[]; nextMilestone: PassportMilestoneDto | null;
}
