import type { Booking, BookingCreate, BookingListItem } from '../../../src/api/types';

let counter = 0;

/** Строит Booking-ответ сервера на POST /bookings из тела запроса гостя. */
export function buildBookingFromCreate(body: BookingCreate, durationMinutes: number): Booking {
  counter += 1;
  const start = new Date(body.start);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    id: `booking-${counter}`,
    eventTypeId: body.eventTypeId,
    start: body.start,
    end: end.toISOString(),
    guestName: body.guestName,
    guestEmail: body.guestEmail,
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };
}

export const bookingListItems: BookingListItem[] = [
  {
    id: 'booking-existing-1',
    eventTypeId: '11111111-1111-4111-8111-111111111111',
    start: '2026-08-10T06:00:00Z',
    end: '2026-08-10T06:30:00Z',
    guestName: 'Пётр Петров',
    guestEmail: 'petr@example.com',
    notes: 'Обсудить сроки',
    createdAt: '2026-08-01T10:00:00Z',
    eventTypeTitle: 'Консультация',
    durationMinutes: 30,
  },
  {
    id: 'booking-existing-2',
    eventTypeId: '22222222-2222-4222-8222-222222222222',
    start: '2026-08-12T06:00:00Z',
    end: '2026-08-12T07:00:00Z',
    guestName: 'Анна Смирнова',
    guestEmail: 'anna@example.com',
    createdAt: '2026-08-02T10:00:00Z',
    eventTypeTitle: 'Собеседование',
    durationMinutes: 60,
  },
];
