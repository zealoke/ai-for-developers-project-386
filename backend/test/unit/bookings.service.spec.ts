import { describe, it, expect } from 'vitest';
import { StoreService, createStore } from '../../src/db/store.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { NotFoundError } from '../../src/common/errors/not-found.error';
import { SlotOutOfRangeError } from '../../src/common/errors/slot-out-of-range.error';
import { SlotNotAlignedError } from '../../src/common/errors/slot-not-aligned.error';
import { SlotTakenError } from '../../src/common/errors/slot-taken.error';
import type {
  Store,
  BookingRecord,
  EventTypeRecord,
  AvailabilityIntervalRecord,
} from '../../src/db/db.types';

// Конструкторы для использования в instanceof-проверках через `.toThrow(ctor)`:
const T = {
  NotFound: NotFoundError,
  SlotOutOfRange: SlotOutOfRangeError,
  SlotNotAligned: SlotNotAlignedError,
  SlotTaken: SlotTakenError,
};

// Фиксированный now (Wed Aug 5 2026, 00:30 UTC = Aug 5 03:30 MSK — Wed).
const NOW = new Date('2026-08-05T00:30:00Z');

function setup(opts: {
  durationMinutes?: number;
  intervals?: Array<{ weekday: string; startTime: string; endTime: string }>;
  timeZone?: string;
}) {
  const store: Store = createStore();
  const storeService = { get: () => store } as unknown as StoreService;
  // Сидим тип события и график напрямую в store (быcтро, без HTTP).
  const eventType: EventTypeRecord = {
    id: 'et-1',
    title: 'Встреча 30м',
    description: 'описание',
    durationMinutes: opts.durationMinutes ?? 30,
  };
  store.eventTypes.set('et-1', eventType);
  const intervals: AvailabilityIntervalRecord[] = (
    opts.intervals ?? [{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }]
  ).map((i) => ({ ...i }) as AvailabilityIntervalRecord);
  store.availability = {
    timeZone: opts.timeZone ?? 'Europe/Moscow',
    intervals,
  };
  const bookings = new BookingsService(storeService);
  return { store, bookings };
}

describe('BookingsService.create (unit)', () => {
  it('happy: создаёт бронь с end=start+duration, snapshot полей', () => {
    const { bookings, store } = setup({});
    const res = bookings.create(
      {
        eventTypeId: 'et-1',
        start: '2026-08-05T06:00:00.000Z', // 09:00 MSK — первый слот
        guestName: 'Иван',
        guestEmail: 'ivan@example.com',
        notes: 'привет',
      },
      NOW,
    );

    expect(res).toMatchObject({
      eventTypeId: 'et-1',
      start: '2026-08-05T06:00:00.000Z',
      end: '2026-08-05T06:30:00.000Z', // 30 минут
      guestName: 'Иван',
      guestEmail: 'ivan@example.com',
      notes: 'привет',
    });
    expect(res.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.createdAt).toBe(NOW.toISOString());

    // Запись в Store содержит snapshot-поля (eventTypeTitle, durationMinutes):
    const record = store.bookings.get(res.id);
    expect(record).toMatchObject({ eventTypeTitle: 'Встреча 30м', durationMinutes: 30 });
  });

  it('NOT_FOUND: отсутствует eventTypeId', () => {
    const { bookings } = setup({});
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'no-such-id',
          start: '2026-08-05T06:00:00.000Z',
          guestName: 'X',
          guestEmail: 'x@x.com',
        },
        NOW,
      ),
    ).toThrow(T.NotFound);
  });

  it('SLOT_OUT_OF_RANGE: start до rangeStart', () => {
    const { bookings } = setup({});
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'et-1',
          start: '2026-07-31T06:00:00.000Z', // до Aug 5 (rangeStart)
          guestName: 'X',
          guestEmail: 'x@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotOutOfRange);
  });

  it('SLOT_OUT_OF_RANGE: start в день rangeEnd и позднее 00:00', () => {
    const { bookings } = setup({});
    // rangeEnd = Aug 19; start в дневной части Aug 19 уже в окне. Но за UTC
    // границей rangeEndUtc = Aug 19 00:00 MSK = Aug 18 21:00 UTC.
    // Если start = "2026-08-19T06:00:00Z" = 09:00 MSK Aug 19 — это уже за
    // пределами window. SIMULATE: start = Aug 20 чтобы гарантированно outside.
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'et-1',
          start: '2026-08-20T06:00:00.000Z',
          guestName: 'X',
          guestEmail: 'x@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotOutOfRange);
  });

  it('SLOT_NOT_ALIGNED: start внутри окна, но не совпадает со slot.start', () => {
    const { bookings } = setup({});
    // Слоты генерируются на 06:00, 06:30 UTC. 06:15 — не выровнен.
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'et-1',
          start: '2026-08-05T06:15:00.000Z',
          guestName: 'X',
          guestEmail: 'x@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotNotAligned);
  });

  it('SLOT_NOT_ALIGNED: start на месте слота другого дня недели (нет графика)', () => {
    // График только на Wed; Thu调度 нет. Очень близкий, но не возможный слот.
    const { bookings } = setup({});
    // Thu Aug 6 06:00 UTC было бы 09:00 MSK Aug 6 — но на Thu нет интервалов.
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'et-1',
          start: '2026-08-06T06:00:00.000Z',
          guestName: 'X',
          guestEmail: 'x@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotNotAligned);
  });

  it('SLOT_TAKEN: повторная бронь того же слота', () => {
    const { bookings } = setup({});
    bookings.create(
      {
        eventTypeId: 'et-1',
        start: '2026-08-05T06:00:00.000Z',
        guestName: 'A',
        guestEmail: 'a@x.com',
      },
      NOW,
    );
    expect(() =>
      bookings.create(
        {
          eventTypeId: 'et-1',
          start: '2026-08-05T06:00:00.000Z',
          guestName: 'B',
          guestEmail: 'b@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotTaken);
  });

  it('SLOT_TAKEN: бронь другим типом события с пересечением времени блокирует и первый', () => {
    // Два типа событий: 30 мин и 60 мин. Слот 60-мин типа с 06:00 UTC
    // пересекает 30-мин слот 06:00. Хотя слот стыкуется, бронь 60-мин
    // занимает [06:00, 07:00). После неё 30-мин в 06:00 — TAKEEN.
    const store: Store = createStore();
    const storeService = { get: () => store } as unknown as StoreService;
    store.eventTypes.set('et-30', {
      id: 'et-30',
      title: '30м',
      description: '',
      durationMinutes: 30,
    });
    store.eventTypes.set('et-60', {
      id: 'et-60',
      title: '60м',
      description: '',
      durationMinutes: 60,
    });
    store.availability = {
      timeZone: 'Europe/Moscow',
      intervals: [{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }],
    };
    const svc = new BookingsService(storeService);

    svc.create(
      {
        eventTypeId: 'et-60',
        start: '2026-08-05T06:00:00.000Z',
        guestName: 'A',
        guestEmail: 'a@x.com',
      },
      NOW,
    );
    expect(() =>
      svc.create(
        {
          eventTypeId: 'et-30',
          start: '2026-08-05T06:30:00.000Z', // 30-min slot at 06:30 starts inside booking 06:00-07:00
          guestName: 'B',
          guestEmail: 'b@x.com',
        },
        NOW,
      ),
    ).toThrow(T.SlotTaken);
  });
});

describe('BookingsService.list (unit)', () => {
  function setupWithBookings(records: Array<Partial<BookingRecord> & { id: string }>) {
    const store: Store = createStore();
    const storeService = { get: () => store } as unknown as StoreService;
    store.availability = {
      timeZone: 'Europe/Moscow',
      intervals: [],
    };
    for (const r of records) {
      store.bookings.set(r.id, {
        id: r.id,
        eventTypeId: r.eventTypeId ?? 'et-1',
        start: r.start!,
        end: r.end ?? r.start!,
        guestName: r.guestName ?? 'Г',
        guestEmail: r.guestEmail ?? 'g@x.com',
        createdAt: r.createdAt ?? '2026-08-05T00:00:00.000Z',
        eventTypeTitle: r.eventTypeTitle ?? 'T',
        durationMinutes: r.durationMinutes ?? 30,
      } as never);
    }
    return new BookingsService(storeService);
  }

  it('возвращает все брони отсортированные по start asc, без upcoming=false', () => {
    const svc = setupWithBookings([
      { id: 'b2', start: '2026-08-10T06:30:00.000Z', end: '2026-08-10T07:00:00.000Z' },
      { id: 'b1', start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z' },
      { id: 'b3', start: '2026-08-10T07:00:00.000Z', end: '2026-08-10T07:30:00.000Z' },
    ]);
    const list = svc.list({ upcoming: false }, NOW);
    expect(list.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('upcoming=false; фильтр from берёт inclusion date', () => {
    const svc = setupWithBookings([
      { id: 'b1', start: '2026-08-05T06:00:00.000Z' }, // Aug 5 MSK = Aug 5 09:00 → plainDate 2026-08-05
      { id: 'b2', start: '2026-08-06T06:00:00.000Z' }, // Aug 6
      { id: 'b3', start: '2026-08-10T06:00:00.000Z' }, // Aug 10
    ]);
    const list = svc.list({ upcoming: false, from: '2026-08-06' }, NOW);
    expect(list.map((b) => b.id)).toEqual(['b2', 'b3']);
  });

  it('upcoming=false; фильтр to берёт inclusion date', () => {
    const svc = setupWithBookings([
      { id: 'b1', start: '2026-08-06T06:00:00.000Z' },
      { id: 'b2', start: '2026-08-10T06:00:00.000Z' },
      { id: 'b3', start: '2026-08-15T06:00:00.000Z' },
    ]);
    const list = svc.list({ upcoming: false, to: '2026-08-10' }, NOW);
    expect(list.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('upcoming=true (default): только start >= now', () => {
    // NOW = Aug 5 00:30 UTC. Каждое бронь с start >= now в искомом результате.
    const svc = setupWithBookings([
      { id: 'past', start: '2026-08-04T06:00:00.000Z' }, // before now
      { id: 'ok1', start: '2026-08-05T01:00:00.000Z' }, // after now (this same day)
      { id: 'ok2', start: '2026-08-10T06:00:00.000Z' },
    ]);
    const list = svc.list({}, NOW); // upcoming defaults to true
    expect(list.map((b) => b.id)).toEqual(['ok1', 'ok2']);
  });

  it('upcoming=true и from/to применяются совместно (AND)', () => {
    const svc = setupWithBookings([
      { id: 'past', start: '2026-08-04T06:00:00.000Z' }, // Aug 4 MSK, past
      { id: 'ok', start: '2026-08-06T06:00:00.000Z' }, // Aug 6 MSK, upcoming, in [Aug 6, Aug 10]
      { id: 'future_far', start: '2026-08-20T06:00:00.000Z' }, // Aug 20 MSK, upcoming, outside [Aug 6, Aug 10]
    ]);
    const list = svc.list({ upcoming: true, from: '2026-08-06', to: '2026-08-10' }, NOW);
    expect(list.map((b) => b.id)).toEqual(['ok']);
  });

  it('plainDate границы считаются в часовом поясе владельца', () => {
    // Проверка boundary: booking с start 23:00 UTC Aug 10 = 02:00 MSK Aug 11
    // при tz=Europe/Moscow должен попасть в plainDate 2026-08-11.
    const svc = setupWithBookings([
      { id: 'b_msk_am', start: '2026-08-10T20:00:00.000Z' }, // 23:00 MSK Aug 10
      { id: 'b_msk_pm', start: '2026-08-10T23:00:00.000Z' }, // 02:00 MSK Aug 11
    ]);
    // фильтр by owner TZ — брони по Aug 11
    const list = svc.list({ upcoming: false, from: '2026-08-11', to: '2026-08-11' }, NOW);
    expect(list.map((b) => b.id)).toEqual(['b_msk_pm']);
  });
});

// Конец файла
