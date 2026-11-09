import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { diningService } from '@/services/diningService';
import { withToast } from '@/lib/apiToast';
import { useAuth } from '@/context/AuthContext';
import type { CreateReservationRequest } from '@/types/dining';

export const diningKeys = {
  menu: ['dining', 'menu'] as const,
  story: ['dining', 'story'] as const,
  seating: ['dining', 'seating'] as const,
  availability: (date: string, guests: number) => ['dining', 'availability', date, guests] as const,
  reservations: ['dining', 'reservations'] as const,
  passport: ['dining', 'passport'] as const,
  favourites: ['dining', 'favourites'] as const,
};

export const useMenu = () => useQuery({ queryKey: diningKeys.menu, queryFn: diningService.menu, staleTime: 5 * 60_000 });
export const useStory = () => useQuery({ queryKey: diningKeys.story, queryFn: diningService.story, staleTime: 10 * 60_000 });
export const useSeating = () => useQuery({ queryKey: diningKeys.seating, queryFn: diningService.seating, staleTime: 10 * 60_000 });

export const useAvailability = (date: string | null, guests: number) =>
  useQuery({
    queryKey: diningKeys.availability(date ?? '', guests),
    queryFn: () => diningService.availability(date as string, guests),
    enabled: !!date && guests > 0,
    refetchInterval: 60_000,
  });

/** My bookings; polls while any is live so the guest sees "arrived → seated" without refreshing. */
export function useMyReservations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: diningKeys.reservations,
    queryFn: diningService.myReservations,
    enabled: isAuthenticated,
    refetchInterval: (q) => ((q.state.data ?? []).some((r) => r.upcoming && r.stageCode !== 'CANCELLED') ? 20_000 : false),
  });
}

export function useBookTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateReservationRequest) => withToast(diningService.book(req), 'Your table is booked'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diningKeys.reservations });
      qc.invalidateQueries({ queryKey: ['dining', 'availability'] });
    },
  });
}

export function usePassport() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: diningKeys.passport, queryFn: diningService.passport, enabled: isAuthenticated });
}

export function useFavourites() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: diningKeys.favourites, queryFn: diningService.favourites, enabled: isAuthenticated });
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dishId, on }: { dishId: number; on: boolean }) =>
      on ? withToast(diningService.addFavourite(dishId), 'Saved to favourites') : diningService.removeFavourite(dishId),
    onSuccess: (ids) => qc.setQueryData(diningKeys.favourites, ids),
  });
}
