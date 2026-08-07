import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupIntegration, type IntegrationSetup } from './setup';
import type { EventTypeRecord, AvailabilityIntervalRecord } from '../../src/db/db.types';

/**
 * Integration-тесты `GET /v1/event-types/:eventTypeId/slots` (specs/routes/slots.tsp):
 *  - happy path: структура SlotsResponse (rangeStart/rangeEnd/days), формат слотов.
 *  - 404 NOT_FOUND для несуществующего eventTypeId.
 *  - слоты появляются только в дни, покрытые интервалами графика.
 *  - available correctness при наличии броней.
 *
 * Тесты фиксированы по дате через `now` (через stub — обёртка над service).
 */
describe('Slots integration', () => {
  let ctx: IntegrationSetup;

  beforeEach(async () => {
    ctx = await setupIntegration();
  });
  afterEach(async () => {
    await ctx.stop();
  });

  function seedEventType(opts: Partial<EventTypeRecord>): EventTypeRecord {
    const et: EventTypeRecord = {
      id: 'et-1',
      title: 'Встреча',
      description: '',
      durationMinutes: 30,
      ...opts,
    };
    ctx.store.eventTypes.set(et.id, et);
    return et;
  }

  function seedSchedule(intervals: AvailabilityIntervalRecord[], timeZone = 'Europe/Moscow') {
    ctx.store.availability = { timeZone, intervals: intervals.map((i) => ({ ...i })) };
  }

  describe('GET /v1/event-types/:eventTypeId/slots', () => {
    it('404 NOT_FOUND для несуществующего eventTypeId', async () => {
      const res = await ctx.request.get('/v1/event-types/does-not-exist/slots');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('200: возвращает SlotsResponse с rangeStart/rangeEnd и days длиной 14', async () => {
      seedEventType({ id: 'et-1', durationMinutes: 60 });
      seedSchedule([{ weekday: 'monday', startTime: '09:00:00', endTime: '11:00:00' }]);

      const res = await ctx.request.get('/v1/event-types/et-1/slots');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        eventTypeId: 'et-1',
        durationMinutes: 60,
        timeZone: 'Europe/Moscow',
      });
      // Не детерминированы — только структурные проверки: rangeEnd = rangeStart + 14d
      const { rangeStart, rangeEnd, days } = res.body;
      expect(rangeStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rangeEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(days).toHaveLength(14);
      expect(days[0].date).toBe(rangeStart);
      // rangeEnd = rangeStart + 14 дней (exclusive)
      const startDate = new Date(rangeStart);
      const expectedEnd = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      expect(rangeEnd).toBe(expectedEnd.toISOString().slice(0, 10));
    });

    it('200: слоты только на дни, покрытые интервалами', async () => {
      seedEventType({ id: 'et-1', durationMinutes: 30 });
      seedSchedule([{ weekday: 'monday', startTime: '09:00:00', endTime: '11:00:00' }]);

      const res = await ctx.request.get('/v1/event-types/et-1/slots');
      const daysWithSlots = res.body.days.filter((d: { slots: unknown[] }) => d.slots.length > 0);
      // Все дни со слотами — это понедельники (дата в ISO), 14 дней содержит 1-3 понедельника
      for (const day of daysWithSlots) {
        const wd = new Date(day.date + 'T00:00:00Z').getUTCDay();
        expect(wd).toBe(1); // Monday
      }
      // Слот соответствует UTC-переводу 09:00 MSK = 06:00 UTC
      for (const day of daysWithSlots) {
        expect(day.slots[0].start).toBe(day.date + 'T06:00:00.000Z');
        expect(day.slots[0].end).toBe(day.date + 'T06:30:00.000Z');
        expect(day.slots[0].available).toBe(true);
      }
      // При 09:00–11:00 / 30min длина = 4
      expect(daysWithSlots[0].slots).toHaveLength(4);
    });

    it('200: доступность слота false при пересечении с бронью', async () => {
      seedEventType({ id: 'et-1', durationMinutes: 30 });
      seedSchedule([{ weekday: 'monday', startTime: '09:00:00', endTime: '11:00:00' }]);
      const today = new Date();
      // Найти ближайший понедельник в окне 14 дней, вычислить его plainDate.
      const startDateStr = today.toISOString().slice(0, 10);
      const startDate = new Date(startDateStr + 'T00:00:00Z');
      for (let offset = 0; offset < 14; offset++) {
        const d = new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000);
        if (d.getUTCDay() === 1) {
          // Monday found. 09:00 MSK = 06:00 UTC. Создаём бронь, занимающую первый слот.
          const bookingStart = `${d.toISOString().slice(0, 10)}T06:00:00.000Z`;
          const bookingEnd = `${d.toISOString().slice(0, 10)}T06:30:00.000Z`;
          ctx.store.bookings.set('b1', {
            id: 'b1',
            eventTypeId: 'et-1',
            start: bookingStart,
            end: bookingEnd,
            guestName: 'Гость',
            guestEmail: 'g@example.com',
            createdAt: '2026-08-07T00:00:00.000Z',
            eventTypeTitle: 'Встреча',
            durationMinutes: 30,
          });
          break;
        }
      }

      const res = await ctx.request.get('/v1/event-types/et-1/slots');
      const monday = res.body.days.find((d: { slots: { available: boolean; start: string }[] }) =>
        d.slots.some((s) => s.available === false),
      );
      expect(monday).toBeDefined();
      expect(monday.slots[0].available).toBe(false);
      expect(monday.slots[1].available).toBe(true);
    });

    it('200: пустой график intervals=[] → все дни с пустыми slots', async () => {
      seedEventType({ id: 'et-1', durationMinutes: 30 });
      seedSchedule([]);

      const res = await ctx.request.get('/v1/event-types/et-1/slots');
      expect(res.status).toBe(200);
      for (const day of res.body.days) {
        expect(day.slots).toEqual([]);
      }
    });

    it('200: разные weekday учитываются по дню', async () => {
      seedEventType({ id: 'et-1', durationMinutes: 30 });
      // Только вторники
      seedSchedule([{ weekday: 'tuesday', startTime: '09:00:00', endTime: '10:00:00' }]);

      const res = await ctx.request.get('/v1/event-types/et-1/slots');
      const daysWithSlots = res.body.days.filter((d: { slots: unknown[] }) => d.slots.length > 0);
      for (const day of daysWithSlots) {
        const wd = new Date(day.date + 'T00:00:00Z').getUTCDay();
        expect(wd).toBe(2);
      }
    });
  });
});
