import type { EventTypeId, SlotsResponse } from '../../../src/api/types';

/**
 * Фиксированные даты вместо реального "сегодня" — фронтенд не делает
 * собственных вычислений "это сегодня?" над днями сетки, поэтому для тестов
 * достаточно любых консистентных дат.
 */
export function buildSlotsResponse(eventTypeId: EventTypeId): SlotsResponse {
  return {
    eventTypeId,
    durationMinutes: 30,
    timeZone: 'Europe/Moscow',
    rangeStart: '2026-08-10',
    rangeEnd: '2026-08-24',
    days: [
      {
        date: '2026-08-10',
        slots: [
          { start: '2026-08-10T06:00:00Z', end: '2026-08-10T06:30:00Z', available: true },
          { start: '2026-08-10T06:30:00Z', end: '2026-08-10T07:00:00Z', available: false },
          { start: '2026-08-10T07:00:00Z', end: '2026-08-10T07:30:00Z', available: true },
        ],
      },
      {
        date: '2026-08-11',
        slots: [],
      },
      {
        date: '2026-08-12',
        slots: [{ start: '2026-08-12T06:00:00Z', end: '2026-08-12T06:30:00Z', available: true }],
      },
    ],
  };
}
