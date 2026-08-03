import type { Page, Route } from '@playwright/test';
import type {
  AvailabilitySchedule,
  BookingCreate,
  BookingListItem,
  EventType,
  EventTypeCreate,
  EventTypeUpdate,
  KnownApiErrorBody,
  SlotsResponse,
} from '../../../src/api/types';

export interface CreateBookingResult {
  status: number;
  body: unknown;
}

export interface MockApiOptions {
  eventTypes?: EventType[];
  availability?: AvailabilitySchedule;
  /** Ключ — eventTypeId. */
  slots?: Record<string, SlotsResponse>;
  bookings?: BookingListItem[];
  /** Переопределяет поведение POST /bookings (например, чтобы вернуть 409 SLOT_TAKEN). */
  onCreateBooking?: (body: BookingCreate) => CreateBookingResult;
  /** Переопределяет поведение PUT /availability (например, чтобы вернуть 400 ValidationError). */
  onReplaceAvailability?: (body: AvailabilitySchedule) => CreateBookingResult;
  /** Вызывается на каждый перехваченный запрос — удобно для проверки query-параметров. */
  onRequest?: (info: { method: string; path: string; url: URL }) => void;
}

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function notFound(route: Route) {
  const error: KnownApiErrorBody = { code: 'NOT_FOUND', message: 'Не найдено' };
  return fulfillJson(route, 404, error);
}

/**
 * Перехватывает все запросы к /api/** (см. VITE_API_BASE_URL в .env) и
 * отвечает заранее заданными фикстурами — без реального бэкенда и без
 * Prism. Реализует ровно то подмножество контракта, которое использует
 * фронтенд (см. specs/routes/*.tsp).
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<void> {
  const state = {
    eventTypes: [...(options.eventTypes ?? [])],
    availability: options.availability ?? { timeZone: 'UTC', intervals: [] },
    slots: { ...(options.slots ?? {}) },
    bookings: [...(options.bookings ?? [])],
    onCreateBooking: options.onCreateBooking,
    onReplaceAvailability: options.onReplaceAvailability,
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(/^\/api/, '');
    options.onRequest?.({ method, path, url });

    if (path === '/event-types') {
      if (method === 'GET') {
        return fulfillJson(route, 200, state.eventTypes);
      }
      if (method === 'POST') {
        const body = request.postDataJSON() as EventTypeCreate;
        const created: EventType = {
          id: `generated-${state.eventTypes.length + 1}`,
          title: body.title,
          description: body.description,
          durationMinutes: body.durationMinutes,
        };
        state.eventTypes.push(created);
        return fulfillJson(route, 201, created);
      }
    }

    const eventTypeMatch = /^\/event-types\/([^/]+)$/.exec(path);
    if (eventTypeMatch) {
      const id = eventTypeMatch[1];
      const eventType = state.eventTypes.find((item) => item.id === id);

      if (method === 'GET') {
        return eventType ? fulfillJson(route, 200, eventType) : notFound(route);
      }
      if (method === 'PATCH') {
        if (!eventType) return notFound(route);
        Object.assign(eventType, request.postDataJSON() as EventTypeUpdate);
        return fulfillJson(route, 200, eventType);
      }
      if (method === 'DELETE') {
        const index = state.eventTypes.findIndex((item) => item.id === id);
        if (index === -1) return notFound(route);
        state.eventTypes.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
    }

    const slotsMatch = /^\/event-types\/([^/]+)\/slots$/.exec(path);
    if (slotsMatch && method === 'GET') {
      const slotsResponse = state.slots[slotsMatch[1]];
      return slotsResponse ? fulfillJson(route, 200, slotsResponse) : notFound(route);
    }

    if (path === '/availability') {
      if (method === 'GET') {
        return fulfillJson(route, 200, state.availability);
      }
      if (method === 'PUT') {
        const body = request.postDataJSON() as AvailabilitySchedule;
        if (state.onReplaceAvailability) {
          const result = state.onReplaceAvailability(body);
          return fulfillJson(route, result.status, result.body);
        }
        state.availability = body;
        return fulfillJson(route, 200, state.availability);
      }
    }

    if (path === '/bookings') {
      if (method === 'GET') {
        return fulfillJson(route, 200, state.bookings);
      }
      if (method === 'POST') {
        const body = request.postDataJSON() as BookingCreate;
        if (state.onCreateBooking) {
          const result = state.onCreateBooking(body);
          return fulfillJson(route, result.status, result.body);
        }
        return fulfillJson(route, 201, {
          id: 'booking-new',
          eventTypeId: body.eventTypeId,
          start: body.start,
          end: body.start,
          guestName: body.guestName,
          guestEmail: body.guestEmail,
          notes: body.notes,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return route.continue();
  });
}
