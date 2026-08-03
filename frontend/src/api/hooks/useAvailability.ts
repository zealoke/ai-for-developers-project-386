import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../unwrap';
import { queryKeys } from '../queryKeys';
import type { AvailabilitySchedule } from '../types';

/** GET /availability (admin). */
export function useAvailability() {
  return useQuery({
    queryKey: queryKeys.availability.all,
    queryFn: () => unwrap(apiClient.GET('/availability')),
  });
}

/** PUT /availability (admin) — полная замена графика. */
export function useReplaceAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AvailabilitySchedule) => unwrap(apiClient.PUT('/availability', { body })),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.availability.all, data);
      // График изменился — все ранее построенные сетки слотов устарели.
      void queryClient.invalidateQueries({ queryKey: queryKeys.slots.all });
    },
  });
}
