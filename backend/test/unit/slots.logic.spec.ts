import { describe, it, expect } from 'vitest';
import {
  buildSlotsResponse,
  sliceInterval,
  markAvailability,
  overlapsAnyBooking,
  intersects,
  isStartAlignedToSlots,
  findSlotByStart,
  type SlotView,
} from '../../src/slots/slots.logic';
import type { AvailabilityIntervalRecord, BookingRecord } from '../../src/db/db.types';

const MOW = 'Europe/Moscow'; // UTC+3 (no DST) — stable for any date

function booking(overrides: Partial<BookingRecord>): BookingRecord {
  return {
    id: 'b1',
    eventTypeId: 'et-1',
    start: '2026-08-10T06:00:00.000Z',
    end: '2026-08-10T06:30:00.000Z', // 09:00–09:30 MSK
    guestName: 'Гость',
    guestEmail: 'g@example.com',
    createdAt: '2026-08-07T00:00:00.000Z',
    eventTypeTitle: 'T',
    durationMinutes: 30,
    ...overrides,
  };
}

describe('slots.logic — sliceInterval', () => {
  it('нарезает слоты с шагом durationMinutes до конца (точное кратное)', () => {
    // 09:00–18:00 MSK — 9 часов = 540 минут, /30 = 18 слотов.
    // MSK = UTC+3 (без DST), поэтому 09:00 MSK = 06:00 UTC.
    const slots = sliceInterval('2026-08-10', '09:00:00', '18:00:00', 30, MOW);
    expect(slots).toHaveLength(18);
    expect(slots[0]).toMatchObject({
      start: '2026-08-10T06:00:00.000Z',
      end: '2026-08-10T06:30:00.000Z',
      available: true,
    });
    expect(slots.at(-1)).toMatchObject({
      start: '2026-08-10T14:30:00.000Z', // 17:30 MSK = 14:30 UTC
      end: '2026-08-10T15:00:00.000Z', // 18:00 MSK = 15:00 UTC
      available: true,
    });
  });

  it('отбрасывает хвост короче durationMinutes', () => {
    // 09:00–10:00, 45min → 1 слот (09:00–09:45). cursor=09:45, +45=10:30 > 10:00 → stop.
    const slots = sliceInterval('2026-08-10', '09:00:00', '10:00:00', 45, MOW);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      start: '2026-08-10T06:00:00.000Z',
      end: '2026-08-10T06:45:00.000Z',
      available: true,
    });
  });

  it('возвращает [] если интервал короче durationMinutes', () => {
    expect(sliceInterval('2026-08-10', '09:00:00', '09:10:00', 30, MOW)).toEqual([]);
  });

  it('повторяет слоты последовательно без перекрытия', () => {
    const slots = sliceInterval('2026-08-10', '09:00:00', '11:00:00', 30, MOW);
    expect(slots).toHaveLength(4);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start).toBe(slots[i - 1].end);
    }
  });
});

describe('slots.logic — TZ conversion', () => {
  it('MSK (UTC+3) 09:00 → 06:00 UTC', () => {
    const slots = sliceInterval('2026-08-10', '09:00:00', '09:30:00', 30, MOW);
    expect(slots[0].start).toBe('2026-08-10T06:00:00.000Z');
    expect(slots[0].end).toBe('2026-08-10T06:30:00.000Z');
  });

  it('он же в UT诶 America/New_York (UTC−4 EDT в августе): 09:00 → 13:00 UTC', () => {
    const slots = sliceInterval('2026-08-10', '09:00:00', '09:30:00', 30, 'America/New_York');
    expect(slots[0].start).toBe('2026-08-10T13:00:00.000Z');
    expect(slots[0].end).toBe('2026-08-10T13:30:00.000Z');
  });

  it('переход 23:00 MSK переходит на следующий день в UTC: 23:00 MSK = 20:00 UTC', () => {
    const slots = sliceInterval('2026-08-10', '23:00:00', '23:30:00', 30, MOW);
    expect(slots[0].start).toBe('2026-08-10T20:00:00.000Z');
    expect(slots[0].end).toBe('2026-08-10T20:30:00.000Z');
  });
});

describe('slots.logic — intersects / overlapsAnyBooking', () => {
  const cases: Array<{
    name: string;
    a: [number, number];
    b: [number, number];
    expected: boolean;
  }> = [
    { name: 'no overlap (a before b)', a: [0, 10], b: [10, 20], expected: false },
    { name: 'touching endpoints not overlap', a: [0, 10], b: [10, 20], expected: false },
    { name: 'partial overlap', a: [0, 15], b: [10, 20], expected: true },
    { name: 'a inside b', a: [5, 10], b: [0, 20], expected: true },
    { name: 'b inside a', a: [0, 20], b: [5, 10], expected: true },
    { name: 'fully disjoint', a: [0, 10], b: [100, 200], expected: false },
    { name: 'exact match', a: [0, 30], b: [0, 30], expected: true },
  ];
  for (const c of cases) {
    it(`intersects: ${c.name}`, () => {
      expect(intersects(c.a[0], c.a[1], c.b[0], c.b[1])).toBe(c.expected);
    });
  }

  it('overlapsAnyBooking: нет броней → false', () => {
    expect(overlapsAnyBooking('2026-08-10T06:00:00.000Z', '2026-08-10T06:30:00.000Z', [])).toBe(
      false,
    );
  });

  it('overlapsAnyBooking: точное совпадение слота и брони → true', () => {
    expect(
      overlapsAnyBooking('2026-08-10T06:00:00.000Z', '2026-08-10T06:30:00.000Z', [
        booking({ start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z' }),
      ]),
    ).toBe(true);
  });

  it('overlapsAnyBooking: частичное перекрытие слота с бронью (06:15–06:45 vs 06:30–07:00) → true', () => {
    expect(
      overlapsAnyBooking('2026-08-10T06:15:00.000Z', '2026-08-10T06:45:00.000Z', [
        booking({ start: '2026-08-10T06:30:00.000Z', end: '2026-08-10T07:00:00.000Z' }),
      ]),
    ).toBe(true);
  });

  it('overlapsAnyBooking: касание endpoints без перекрытия (06:00–06:30 vs 06:30–07:00) → false', () => {
    expect(
      overlapsAnyBooking('2026-08-10T06:00:00.000Z', '2026-08-10T06:30:00.000Z', [
        booking({ start: '2026-08-10T06:30:00.000Z', end: '2026-08-10T07:00:00.000Z' }),
      ]),
    ).toBe(false);
  });
});

describe('slots.logic — markAvailability', () => {
  it('слот без броней available по умолчанию остаётся (маркируем только false)', () => {
    const slots: SlotView[] = [
      { start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z', available: true },
    ];
    markAvailability(slots, []);
    expect(slots[0].available).toBe(true);
  });

  it('точное совпадение слота и брони → available=false', () => {
    const slots: SlotView[] = [
      { start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z', available: true },
      { start: '2026-08-10T06:30:00.000Z', end: '2026-08-10T07:00:00.000Z', available: true },
    ];
    markAvailability(slots, [
      booking({ start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z' }),
    ]);
    expect(slots[0].available).toBe(false);
    expect(slots[1].available).toBe(true);
  });

  it('бронь любого типа события учитывается', () => {
    const slots: SlotView[] = [
      { start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z', available: true },
    ];
    markAvailability(slots, [
      booking({
        eventTypeId: 'OTHER-EVENT-TYPE',
        start: '2026-08-10T06:00:00.000Z',
        end: '2026-08-10T06:30:00.000Z',
      }),
    ]);
    expect(slots[0].available).toBe(false);
  });

  it('бронь с другим временем не блокирует слот', () => {
    const slots: SlotView[] = [
      { start: '2026-08-10T06:00:00.000Z', end: '2026-08-10T06:30:00.000Z', available: true },
    ];
    markAvailability(slots, [
      booking({ start: '2026-08-10T07:00:00.000Z', end: '2026-08-10T07:30:00.000Z' }),
    ]);
    expect(slots[0].available).toBe(true);
  });
});

describe('slots.logic — buildSlotsResponse', () => {
  const intervals: AvailabilityIntervalRecord[] = [
    { weekday: 'monday', startTime: '09:00:00', endTime: '11:00:00' },
  ];

  it('rangeStart = «сегодня по владельцу», rangeEnd = rangeStart + 14 дней', () => {
    // 2026-08-05T12:00:00Z в Moscow (UTC+3) = 15:00 local → plainDate 2026-08-05
    const now = new Date('2026-08-05T12:00:00Z');
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 60,
      timeZone: MOW,
      intervals,
      bookings: [],
      now,
    });
    expect(res.rangeStart).toBe('2026-08-05');
    expect(res.rangeEnd).toBe('2026-08-19');
  });

  it('days содержит 14 записей (от rangeStart до rangeEnd-1)', () => {
    const now = new Date('2026-08-05T12:00:00Z');
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 60,
      timeZone: MOW,
      intervals,
      bookings: [],
      now,
    });
    expect(res.days).toHaveLength(14);
    expect(res.days[0].date).toBe('2026-08-05');
    expect(res.days.at(-1)!.date).toBe('2026-08-18');
  });

  it('days включают записи без единого слота (по контракту)', () => {
    const now = new Date('2026-08-05T12:00:00Z'); // Aug 5 2026 — Wednesday
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 60,
      timeZone: MOW,
      intervals, // only monday receives slots
      bookings: [],
      now,
    });
    const emptyDays = res.days.filter((d) => d.slots.length === 0);
    expect(emptyDays.length).toBeGreaterThan(0);
    // Дни без monday — все пустые. Aug 5 2026 through Aug 18 2026 содержит 2 понедельника
    // (10 и 17): это 2 не-пустых дня, остальные 12 — пустые.
    expect(emptyDays.length).toBe(12);
  });

  it('weekday подбирается из графика по calendar-day в TZ владельца', () => {
    // Aug 5 2026 = Wednesday (per the env). Verify slots appear only on Mondays.
    const now = new Date('2026-08-05T12:00:00Z');
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 60,
      timeZone: MOW,
      intervals,
      bookings: [],
      now,
    });
    const daysWithSlots = res.days.filter((d) => d.slots.length > 0);
    // Aug 5..Aug 18 содержит понедельники 2026-08-10 и 2026-08-17
    expect(daysWithSlots).toHaveLength(2);
    expect(daysWithSlots[0].date).toBe('2026-08-10');
    expect(daysWithSlots[1].date).toBe('2026-08-17');
    expect(daysWithSlots[0].slots.length).toBe(2); // 09:00–11:00 / 60min = 2 slots
  });

  it('несколько интервалов одного дня дают слоты в порядке', () => {
    const intervals: AvailabilityIntervalRecord[] = [
      { weekday: 'monday', startTime: '09:00:00', endTime: '10:00:00' },
      { weekday: 'monday', startTime: '11:00:00', endTime: '12:00:00' },
    ];
    const now = new Date('2026-08-05T12:00:00Z');
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 30,
      timeZone: MOW,
      intervals,
      bookings: [],
      now,
    });
    const monday = res.days.find((d) => d.date === '2026-08-10');
    expect(monday?.slots).toHaveLength(4);
    expect(monday?.slots.map((s) => s.start)).toEqual([
      '2026-08-10T06:00:00.000Z',
      '2026-08-10T06:30:00.000Z',
      '2026-08-10T08:00:00.000Z',
      '2026-08-10T08:30:00.000Z',
    ]);
  });

  it('бронь любого типа блокирует слот в сетке', () => {
    const now = new Date('2026-08-05T12:00:00Z');
    const res = buildSlotsResponse({
      eventTypeId: 'et1',
      durationMinutes: 30,
      timeZone: MOW,
      intervals,
      bookings: [
        booking({
          eventTypeId: 'OTHER',
          start: '2026-08-10T06:00:00.000Z',
          end: '2026-08-10T06:30:00.000Z',
        }),
      ],
      now,
    });
    const monday = res.days.find((d) => d.date === '2026-08-10');
    // 09:00–11:00 / 30min = 4 слота. Бронь 09:00–09:30 занимает первый.
    expect(monday?.slots[0]).toMatchObject({
      start: '2026-08-10T06:00:00.000Z',
      available: false,
    });
    expect(monday?.slots.slice(1).every((s) => s.available)).toBe(true);
  });
});

describe('slots.logic — alignment helpers', () => {
  const slots: { start: string }[] = [
    { start: '2026-08-10T06:00:00.000Z' },
    { start: '2026-08-10T06:30:00.000Z' },
  ];
  it('isStartAlignedToSlots: точное совпадение строк', () => {
    expect(isStartAlignedToSlots('2026-08-10T06:30:00.000Z', slots)).toBe(true);
    expect(isStartAlignedToSlots('2026-08-10T07:00:00.000Z', slots)).toBe(false);
    expect(isStartAlignedToSlots('2026-08-10T06:30:00Z', slots)).toBe(false); // strictly byte-match
  });
  it('findSlotByStart: находит или undefined', () => {
    expect(findSlotByStart('2026-08-10T06:00:00.000Z', slots as SlotView[]))?.toBeDefined();
    expect(findSlotByStart('nope', slots as SlotView[]))?.toBeUndefined();
  });
});
