import { dayjs } from '../common/dayjs';
import type { AvailabilityIntervalRecord, BookingRecord, Weekday } from '../db/db.types';

// Public API of pure slot-generation logic. Без зависимостей от Nest/DI/Store,
// только чистые функции — для прямого unit-тестирования.

/**
 * Один слот в сетке бронирования.
 * Контрактный `Slot` (specs/models/slot.tsp): start/end — UTC ISO 8601,
 * available — false, если слот пересекается с любой бронью.
 */
export interface SlotView {
  start: string;
  end: string;
  available: boolean;
}

/** Слоты одного календарного дня. */
export interface DaySlotsView {
  date: string; // plainDate YYYY-MM-DD
  slots: SlotView[];
}

/** Ответ на GET /v1/event-types/{id}/slots. */
export interface SlotsResponseView {
  eventTypeId: string;
  durationMinutes: number;
  timeZone: string;
  rangeStart: string; // plainDate (today in owner TZ)
  rangeEnd: string; // plainDate = rangeStart + 14 days (exclusive)
  days: DaySlotsView[];
}

/** Дни недели по dayjs format('dddd').toLowerCase(). */
const DAYJS_WEEKDAY_BY_NAME: Record<string, Weekday> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

/**
 * Строит SlotsResponse из переданных параметров. Используется и service'ом
 * (который читает хранилище), и в unit-тестах напрямую.
 *
 * `now` — опционально; по умолчанию new Date(). Тесты передают фиксированное
 * значение, чтобы получить детерминированную сетку слотов.
 */
export function buildSlotsResponse(opts: {
  eventTypeId: string;
  durationMinutes: number;
  timeZone: string;
  intervals: AvailabilityIntervalRecord[];
  bookings: BookingRecord[];
  now?: Date;
}): SlotsResponseView {
  const { eventTypeId, durationMinutes, timeZone, intervals, bookings } = opts;
  const now = opts.now ?? new Date();

  const today = dayjs(now).tz(timeZone);
  const rangeStart = today.format('YYYY-MM-DD');
  const rangeEnd = today.add(14, 'day').format('YYYY-MM-DD');

  const days: DaySlotsView[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const day = today.add(offset, 'day');
    const date = day.format('YYYY-MM-DD');
    const weekdayName = day.format('dddd').toLowerCase();
    const weekday = DAYJS_WEEKDAY_BY_NAME[weekdayName];
    const dayIntervals = intervals.filter((iv) => iv.weekday === weekday);

    const slots: SlotView[] = [];
    for (const iv of dayIntervals) {
      slots.push(...sliceInterval(date, iv.startTime, iv.endTime, durationMinutes, timeZone));
    }

    markAvailability(slots, bookings);
    days.push({ date, slots });
  }

  return { eventTypeId, durationMinutes, timeZone, rangeStart, rangeEnd, days };
}

/**
 * Нарезает один интервал дня на слоты фиксированной длины `durationMinutes`.
 * Начинает с `startTime` (владельческий локал), шаг = duration, хвост
 * короче duration отбрасывается. Возвращает слоты с UTC ISO start/end.
 *
 * Слоты возвращаются с `available: true` по умолчанию; последующая
 * `markAvailability` перекрашивает в `false` те, что пересекаются с бронями.
 */
export function sliceInterval(
  datePlain: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  timeZone: string,
): SlotView[] {
  const out: SlotView[] = [];
  const start = dayjs.tz(`${datePlain} ${startTime}`, 'YYYY-MM-DD HH:mm:ss', timeZone);
  const end = dayjs.tz(`${datePlain} ${endTime}`, 'YYYY-MM-DD HH:mm:ss', timeZone);

  let cursor = start;
  while (cursor.add(durationMinutes, 'minute').valueOf() <= end.valueOf()) {
    const slotEnd = cursor.add(durationMinutes, 'minute');
    out.push({ start: cursor.toISOString(), end: slotEnd.toISOString(), available: true });
    cursor = slotEnd;
  }
  return out;
}

/**
 * Проставляет `available=false` слотам, пересекающимся с любой бронью.
 * Пересечение = полуоткрытый интервал [start, end): overlap если
 * max(slot.start, booking.start) < min(slot.end, booking.end).
 * Брони любого типа учитываются — по контракту «независимо от типа события».
 */
export function markAvailability(slots: SlotView[], bookings: BookingRecord[]): void {
  if (bookings.length === 0) return;
  for (const slot of slots) {
    if (overlapsAnyBooking(slot.start, slot.end, bookings)) {
      slot.available = false;
    }
  }
}

export function overlapsAnyBooking(
  slotStartIso: string,
  slotEndIso: string,
  bookings: BookingRecord[],
): boolean {
  const slotStart = dayjs.utc(slotStartIso).valueOf();
  const slotEnd = dayjs.utc(slotEndIso).valueOf();
  for (const b of bookings) {
    const bStart = dayjs.utc(b.start).valueOf();
    const bEnd = dayjs.utc(b.end).valueOf();
    if (intersects(slotStart, slotEnd, bStart, bEnd)) {
      return true;
    }
  }
  return false;
}

export function intersects(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Проверяет, выровнен ли UTC ISO `start` по сетке слотов выбранного типа
 * события. Используется в `POST /bookings` для проверки SLOT_NOT_ALIGNED
 * (после проверки, что `start` в пределах rangeStart..rangeEnd → иначе
 * SLOT_OUT_OF_RANGE).
 *
 * Строка, переданная клиентом, должна совпадать со Slot.start побайтово
 * (фронтенд так и делает — см. README фронтенда «start берётся ровно той
 * строкой»). Поэтому сравнение — простое string-равенство со множеством
 * стартов слотов сетки. Если строка не совпала ни с одним — miss = NOT_ALIGNED.
 */
export function isStartAlignedToSlots(startIso: string, slots: { start: string }[]): boolean {
  return slots.some((s) => s.start === startIso);
}

/** Разрешает первый слот (start/end), у которого `start` строго равен значению. */
export function findSlotByStart(startIso: string, slots: SlotView[]): SlotView | undefined {
  return slots.find((s) => s.start === startIso);
}
