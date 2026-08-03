import type { EventTypeId } from './types';

/** Единые ключи кэша TanStack Query — чтобы инвалидация не разъезжалась по коду. */
export const queryKeys = {
  eventTypes: {
    all: ['event-types'] as const,
    list: () => [...queryKeys.eventTypes.all, 'list'] as const,
    detail: (id: EventTypeId) => [...queryKeys.eventTypes.all, 'detail', id] as const,
  },
  slots: {
    all: ['slots'] as const,
    forEventType: (id: EventTypeId) => [...queryKeys.slots.all, id] as const,
  },
  availability: {
    all: ['availability'] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (params: { from?: string; to?: string; upcoming?: boolean }) =>
      [...queryKeys.bookings.all, 'list', params] as const,
  },
};
