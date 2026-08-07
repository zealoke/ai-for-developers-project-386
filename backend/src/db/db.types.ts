/**
 * Внутренние доменные модели in-memory хранилища.
 *
 * Совпадают по составу полей с моделями TypeSpec-контракта (../specs/models),
 * но kept local, чтобы сервисы и тесты зависели только от домена, а не от
 * HTTP-слоя. Брони дополнительно содержат snapshot полей типа события
 * (`eventTypeTitle`, `durationMinutes`) — требуется для BookingListItem.
 */

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface EventTypeRecord {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface AvailabilityIntervalRecord {
  weekday: Weekday;
  /** Локальное время владельца, HH:mm:ss. */
  startTime: string;
  /** Локальное время владельца, HH:mm:ss. */
  endTime: string;
}

export interface AvailabilityScheduleRecord {
  /** IANA-имя часового пояса владельца, напр. "Europe/Moscow". */
  timeZone: string;
  intervals: AvailabilityIntervalRecord[];
}

/**
 * Внутренняя модель брони. Расширяет контрактную модель `Booking`
 * полями-снапшотами, нужными для BookingListItem: eventTypeTitle и
 * durationMinutes на момент создания брони — чтобы список броней не
 * зависел от текущего состояния (или существования) типа события.
 */
export interface BookingRecord {
  id: string;
  eventTypeId: string;
  /** UTC ISO 8601. */
  start: string;
  /** UTC ISO 8601, start + durationMinutes. */
  end: string;
  guestName: string;
  guestEmail: string;
  notes?: string;
  /** UTC ISO 8601. */
  createdAt: string;
  // snapshot поля (не возвращаются в `Booking`, только в `BookingListItem`):
  eventTypeTitle: string;
  durationMinutes: number;
}

export interface Store {
  eventTypes: Map<string, EventTypeRecord>;
  availability: AvailabilityScheduleRecord;
  bookings: Map<string, BookingRecord>;
}
