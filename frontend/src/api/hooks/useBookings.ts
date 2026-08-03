import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../unwrap';
import { queryKeys } from '../queryKeys';
import type { BookingCreate, EventTypeId } from '../types';

export interface BookingsListParams {
  /** Нижняя граница диапазона по `start`, включительно (plainDate YYYY-MM-DD). */
  from?: string;
  /** Верхняя граница диапазона по `start`, включительно (plainDate YYYY-MM-DD). */
  to?: string;
  /** По умолчанию сервер возвращает только предстоящие встречи. */
  upcoming?: boolean;
}

/** GET /bookings (admin). */
export function useBookings(params: BookingsListParams) {
  return useQuery({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () =>
      unwrap(
        apiClient.GET('/bookings', {
          params: { query: params },
        }),
      ),
  });
}

/** POST /bookings (guest). */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BookingCreate) => unwrap(apiClient.POST('/bookings', { body })),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.slots.forEventType(variables.eventTypeId as EventTypeId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
