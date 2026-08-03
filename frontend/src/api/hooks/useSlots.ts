import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { unwrap } from '../unwrap';
import { queryKeys } from '../queryKeys';
import type { EventTypeId } from '../types';

/**
 * GET /event-types/{id}/slots — сетка слотов на 14 дней вперёд от сегодня
 * (окно задаётся сервером, без параметров запроса). Запрос выключен, пока
 * id не определён.
 */
export function useSlots(eventTypeId: EventTypeId | undefined) {
  return useQuery({
    queryKey: queryKeys.slots.forEventType(eventTypeId ?? ''),
    queryFn: () =>
      unwrap(
        apiClient.GET('/event-types/{eventTypeId}/slots', {
          params: { path: { eventTypeId: eventTypeId as EventTypeId } },
        }),
      ),
    enabled: Boolean(eventTypeId),
    // Слоты могут занять другие гости в реальном времени — не держим их
    // «свежими» слишком долго, но и не спамим сервер на каждый рендер.
    staleTime: 30_000,
  });
}
