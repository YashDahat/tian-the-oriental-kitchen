import apiClient from '@/api/client';
import type { BulkUploadResult } from '@/types/bulkUpload';
import type {
  AdminReservationRow, AvailabilityDto, CreateReservationRequest, DishDto, PassportDto, PassportMilestoneDto,
  ReservationDto, SeatingOptionDto, StoryChapterDto, UpsertDishRequest, UpsertPassportMilestoneRequest,
  UpsertSeatingOptionRequest, UpsertStoryChapterRequest,
} from '@/types/dining';

const upload = async (path: string, file: File): Promise<BulkUploadResult> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<BulkUploadResult>(path, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
};

/** TIAN dining API — menu, story, bookings, passport, favourites (+ admin). Identity is server-derived. */
export const diningService = {
  menu: async () => (await apiClient.get<DishDto[]>('/api/v1/menu')).data,
  story: async () => (await apiClient.get<StoryChapterDto[]>('/api/v1/story')).data,
  seating: async () => (await apiClient.get<SeatingOptionDto[]>('/api/v1/seating')).data,
  availability: async (date: string, guests: number) =>
    (await apiClient.get<AvailabilityDto>('/api/v1/reservations/availability', { params: { date, guests } })).data,
  book: async (req: CreateReservationRequest) => (await apiClient.post<ReservationDto>('/api/v1/reservations', req)).data,
  myReservations: async () => (await apiClient.get<ReservationDto[]>('/api/v1/reservations')).data,
  passport: async () => (await apiClient.get<PassportDto>('/api/v1/passport')).data,
  favourites: async () => (await apiClient.get<number[]>('/api/v1/favourites')).data,
  addFavourite: async (dishId: number) => (await apiClient.put<number[]>(`/api/v1/favourites/${dishId}`)).data,
  removeFavourite: async (dishId: number) => (await apiClient.delete<number[]>(`/api/v1/favourites/${dishId}`)).data,

  admin: {
    dishes: async () => (await apiClient.get<DishDto[]>('/api/v1/admin/dishes')).data,
    createDish: async (r: UpsertDishRequest) => (await apiClient.post<DishDto>('/api/v1/admin/dishes', r)).data,
    updateDish: async (id: number, r: UpsertDishRequest) => (await apiClient.put<DishDto>(`/api/v1/admin/dishes/${id}`, r)).data,
    deleteDish: async (id: number) => { await apiClient.delete(`/api/v1/admin/dishes/${id}`); },
    bulkDishes: (file: File) => upload('/api/v1/admin/dishes/bulk-upload', file),

    seating: async () => (await apiClient.get<SeatingOptionDto[]>('/api/v1/admin/seating')).data,
    saveSeating: async (id: number | null, r: UpsertSeatingOptionRequest) =>
      (id == null ? await apiClient.post<SeatingOptionDto>('/api/v1/admin/seating', r)
        : await apiClient.put<SeatingOptionDto>(`/api/v1/admin/seating/${id}`, r)).data,
    deleteSeating: async (id: number) => { await apiClient.delete(`/api/v1/admin/seating/${id}`); },
    bulkSeating: (file: File) => upload('/api/v1/admin/seating/bulk-upload', file),

    story: async () => (await apiClient.get<StoryChapterDto[]>('/api/v1/admin/story')).data,
    saveStory: async (id: number | null, r: UpsertStoryChapterRequest) =>
      (id == null ? await apiClient.post<StoryChapterDto>('/api/v1/admin/story', r)
        : await apiClient.put<StoryChapterDto>(`/api/v1/admin/story/${id}`, r)).data,
    deleteStory: async (id: number) => { await apiClient.delete(`/api/v1/admin/story/${id}`); },
    bulkStory: (file: File) => upload('/api/v1/admin/story/bulk-upload', file),

    milestones: async () => (await apiClient.get<PassportMilestoneDto[]>('/api/v1/admin/passport-milestones')).data,
    saveMilestone: async (id: number | null, r: UpsertPassportMilestoneRequest) =>
      (id == null ? await apiClient.post<PassportMilestoneDto>('/api/v1/admin/passport-milestones', r)
        : await apiClient.put<PassportMilestoneDto>(`/api/v1/admin/passport-milestones/${id}`, r)).data,
    deleteMilestone: async (id: number) => { await apiClient.delete(`/api/v1/admin/passport-milestones/${id}`); },
    bulkMilestones: (file: File) => upload('/api/v1/admin/passport-milestones/bulk-upload', file),

    reservations: async (from: string, to: string) =>
      (await apiClient.get<AdminReservationRow[]>('/api/v1/admin/reservations', { params: { from, to } })).data,
  },
};
