import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StoreService } from '../db/store.service';
import type { BookingRecord } from '../db/db.types';
import { NotFoundError } from '../common/errors/not-found.error';
import { SlotOutOfRangeError } from '../common/errors/slot-out-of-range.error';
import { SlotNotAlignedError } from '../common/errors/slot-not-aligned.error';
import { SlotTakenError } from '../common/errors/slot-taken.error';
import { dayjs } from '../common/dayjs';
import { buildSlotsResponse, findSlotByStart, type SlotsResponseView } from '../slots/slots.logic';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { BookingsListQueryDto } from './dto/bookings-list-query.dto';

/** Контрактное представление `Booking` в ответе POST /bookings. */
export interface BookingView {
  id: string;
  eventTypeId: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
  notes?: string;
  createdAt: string;
}

/** Контрактное представление `BookingListItem` в ответе GET /bookings. */
export interface BookingListItemView extends BookingView {
  eventTypeTitle: string;
  durationMinutes: number;
}

/**
 * Сервис бронирования.
 *
 * Создание брони (POST /v1/bookings) реализует валидационную цепочку:
 *   1. event-type существует?           иначе NOT_FOUND
 *   2. start в окне [rangeStart, rangeEnd]? (по owner TZ) иначе SLOT_OUT_OF_RANGE
 *   3. start совпадает со slot.start?    иначе SLOT_NOT_ALIGNED
 *   4. слот свободен?                    иначе SLOT_TAKEN
 *   5. создаём бронь с snapshot eventTypeTitle/durationMinutes
 *
 * Все шаги синхронны (без `await`), поэтому атомарность между проверкой
 * и записью брони защищена однопоточным event loop'ом Node — гонки нет.
 *
 * Список броней (GET /v1/bookings) фильтруется по:
 *   - `upcoming` (default true): start брони >= now (UTC)
 *   - `from`/`to`: plainDate (по owner TZ — см. README фронтенда про груп-
 *     пировку по toOwnerTime(start, timeZone).format('YYYY-MM-DD'))
 */
@Injectable()
export class BookingsService {
  constructor(private readonly store: StoreService) {}

  create(dto: CreateBookingDto, now: Date = new Date()): BookingView {
    const store = this.store.get();
    const eventType = store.eventTypes.get(dto.eventTypeId);
    if (!eventType) {
      throw new NotFoundError(`Event type ${dto.eventTypeId} not found`);
    }

    const slotsResponse = buildSlotsResponse({
      eventTypeId: eventType.id,
      durationMinutes: eventType.durationMinutes,
      timeZone: store.availability.timeZone,
      intervals: store.availability.intervals,
      bookings: [...store.bookings.values()],
      now,
    });

    // 2) Окно бронирования. Трансформируем rangeStart/rangeEnd в UTC instant
    //    (00:00 владельца = момент начала дня в его поясе).
    const tz = store.availability.timeZone;
    const rangeStartUtc = dayjs.tz(`${slotsResponse.rangeStart} 00:00:00`, tz).valueOf();
    const rangeEndUtc = dayjs.tz(`${slotsResponse.rangeEnd} 00:00:00`, tz).valueOf();
    const startMs = dayjs.utc(dto.start).valueOf();

    if (Number.isNaN(startMs) || startMs < rangeStartUtc || startMs >= rangeEndUtc) {
      throw new SlotOutOfRangeError(
        `start (${dto.start}) is outside the booking window ${slotsResponse.rangeStart}..${slotsResponse.rangeEnd}`,
      );
    }

    // 3) Выравнивание: совпадение со slot.start (строгое string-равенство).
    const allSlots = slotsResponse.days.flatMap((d) => d.slots);
    const matchingSlot = findSlotByStart(dto.start, allSlots);
    if (!matchingSlot) {
      throw new SlotNotAlignedError(
        `start (${dto.start}) does not align to any slot for event type ${dto.eventTypeId}`,
      );
    }

    // 4) Занятость слота. Если slot.available=false, слот уже забронирован.
    if (!matchingSlot.available) {
      throw new SlotTakenError(`Slot ${dto.start} is already booked`);
    }

    // 5) Создаём бронь. `end` = start + durationMinutes. Snapshot полей.
    const bookingStart = dto.start;
    const bookingEnd = dayjs
      .utc(bookingStart)
      .add(eventType.durationMinutes, 'minute')
      .toISOString();
    const booking: BookingRecord = {
      id: uuidv4(),
      eventTypeId: eventType.id,
      start: bookingStart,
      end: bookingEnd,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      notes: dto.notes,
      createdAt: now.toISOString(),
      eventTypeTitle: eventType.title,
      durationMinutes: eventType.durationMinutes,
    };
    store.bookings.set(booking.id, booking);

    return toBookingView(booking);
  }

  list(query: BookingsListQueryDto, now: Date = new Date()): BookingListItemView[] {
    const store = this.store.get();
    const tz = store.availability.timeZone;
    const upcoming = query.upcoming ?? true;
    const nowMs = now.getTime();

    const out: BookingRecord[] = [];
    for (const b of store.bookings.values()) {
      const startMs = dayjs.utc(b.start).valueOf();

      if (upcoming && startMs < nowMs) {
        // Фильтр «предстоящие»: пропускаем уже начавшиеся.
        continue;
      }

      if (query.from || query.to) {
        // Границы считаются по plainDate в часовом поясе владельца
        // (это justifyContent'но с группировкой фронтенда по тому же TTz).
        const bookingPlainDate = dayjs.utc(b.start).tz(tz).format('YYYY-MM-DD');
        if (query.from && bookingPlainDate < query.from) continue;
        if (query.to && bookingPlainDate > query.to) continue;
      }

      out.push(b);
    }

    out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    return out.map(toListItemView);
  }
}

function toBookingView(b: BookingRecord): BookingView {
  return {
    id: b.id,
    eventTypeId: b.eventTypeId,
    start: b.start,
    end: b.end,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    ...(b.notes !== undefined ? { notes: b.notes } : null),
    createdAt: b.createdAt,
  };
}

function toListItemView(b: BookingRecord): BookingListItemView {
  return {
    ...toBookingView(b),
    eventTypeTitle: b.eventTypeTitle,
    durationMinutes: b.durationMinutes,
  };
}

// Экспортируем внутренний тип SlotsResponseView для удобства тестов.
export type { SlotsResponseView };
