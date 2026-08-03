import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap, unwrapVoid } from '../unwrap';
import { queryKeys } from '../queryKeys';
import type { EventTypeCreate, EventTypeId, EventTypeUpdate } from '../types';

/** GET /event-types — список типов встреч, доступных гостям. */
export function useEventTypes() {
  return useQuery({
    queryKey: queryKeys.eventTypes.list(),
    queryFn: () => unwrap(apiClient.GET('/event-types')),
  });
}

/** GET /event-types/{id}. Запрос выключен, пока id не определён. */
export function useEventType(eventTypeId: EventTypeId | undefined) {
  return useQuery({
    queryKey: queryKeys.eventTypes.detail(eventTypeId ?? ''),
    queryFn: () =>
      unwrap(
        apiClient.GET('/event-types/{eventTypeId}', {
          params: { path: { eventTypeId: eventTypeId as EventTypeId } },
        }),
      ),
    enabled: Boolean(eventTypeId),
  });
}

/** POST /event-types (admin). */
export function useCreateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EventTypeCreate) => unwrap(apiClient.POST('/event-types', { body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.list() });
    },
  });
}

/** PATCH /event-types/{id} (admin). */
export function useUpdateEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventTypeId, body }: { eventTypeId: EventTypeId; body: EventTypeUpdate }) =>
      unwrap(
        apiClient.PATCH('/event-types/{eventTypeId}', {
          params: { path: { eventTypeId } },
          body,
        }),
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.list() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventTypes.detail(variables.eventTypeId),
      });
      // Длительность могла измениться — сетка слотов для этого типа устарела.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.slots.forEventType(variables.eventTypeId),
      });
    },
  });
}

/** DELETE /event-types/{id} (admin). */
export function useDeleteEventType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventTypeId: EventTypeId) =>
      unwrapVoid(
        apiClient.DELETE('/event-types/{eventTypeId}', {
          params: { path: { eventTypeId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.list() });
    },
  });
}
