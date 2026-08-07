import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupIntegration, type IntegrationSetup } from './setup';
import type {
  EventTypeRecord,
  AvailabilityIntervalRecord,
  BookingRecord,
} from '../../src/db/db.types';

/**
 * Integration-тесты `POST/GET /v1/bookings` (specs/routes/bookings.tsp):
 *  - happy path POST (201) и проверка snapshot полей в GET
 *  - все контракные коды ошибок:
 *      VALIDATION_ERROR (body), NOT_FOUND (eventTypeId),
 *      SLOT_OUT_OF_RANGE, SLOT_NOT_ALIGNED, SLOT_TAKEN (409)
 *  - GET: фильтры from/to/upcoming, сортировка по start asc.
 *
 * Fixture-данные (id типа события) — настоящие UUID v4, потому что
 * `CreateBookingDto.eventTypeId` провалидируется `@IsUUID()` (контракт:
 * `format: uuid`), и произвольные строки вроде 'et-1' клиент отправить не
 * сможет — это сделано намеренно по контракту.
 *
 * Состояние изолировано в каждом тесте.
 */
describe('Bookings integration', () => {
  let ctx: IntegrationSetup;

  beforeEach(async () => {
    ctx = await setupIntegration();
  });
  afterEach(async () => {
    await ctx.stop();
  });

  function seedEventType(opts: Partial<EventTypeRecord> & { title?: string }): EventTypeRecord {
    const id = opts.id ?? randomUUID();
    const et: EventTypeRecord = {
      id,
      title: opts.title ?? 'Встреча 30м',
      description: opts.description ?? '',
      durationMinutes: opts.durationMinutes ?? 30,
    };
    ctx.store.eventTypes.set(et.id, et);
    return et;
  }

  function seedSchedule(intervals: AvailabilityIntervalRecord[], timeZone = 'Europe/Moscow') {
    ctx.store.availability = { timeZone, intervals: intervals.map((i) => ({ ...i })) };
  }

  /** Находит первый plainDate в окне 14 дней от сегодня, у которого weekday совпадает. */
  function firstDateForWeekday(weekday: number): string {
    const today = new Date();
    const startDateStr = today.toISOString().slice(0, 10);
    const startDate = new Date(startDateStr + 'T00:00:00Z');
    for (let offset = 0; offset < 14; offset++) {
      const d = new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000);
      if (d.getUTCDay() === weekday) {
        return d.toISOString().slice(0, 10);
      }
    }
    throw new Error(`no ${weekday} in next 14 days from ${startDateStr}`);
  }

  describe('POST /v1/bookings', () => {
    it('201: создаёт бронь, возвращает Booking с server-computed end', async () => {
      const et = seedEventType({ durationMinutes: 45 });
      // Wednesday slot 09:00 MSK = 06:00 UTC, 45min
      seedSchedule([{ weekday: 'wednesday', startTime: '09:00:00', endTime: '11:00:00' }]);

      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'Иван',
        guestEmail: 'ivan@example.com',
        notes: 'привет',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        eventTypeId: et.id,
        start: slotStart,
        end: `${firstDateForWeekday(3)}T06:45:00.000Z`, // +45min
        guestName: 'Иван',
        guestEmail: 'ivan@example.com',
        notes: 'привет',
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Созданная бронь появляется в GET /bookings
      const listRes = await ctx.request.get('/v1/bookings?upcoming=false');
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0]).toMatchObject({ id: res.body.id });
      // Snapshot поля в BookingListItem:
      expect(listRes.body[0].eventTypeTitle).toBe('Встреча 30м');
      expect(listRes.body[0].durationMinutes).toBe(45);
    });

    it('400 VALIDATION_ERROR: отсутствует обязательное поле', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'Иван',
        // нет guestEmail
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('guestEmail');
    });

    it('400 VALIDATION_ERROR: невалидный email', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'Иван',
        guestEmail: 'не-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('guestEmail');
    });

    it('400 VALIDATION_ERROR: guestName > 200 символов', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'x'.repeat(201),
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('guestName');
    });

    it('400 VALIDATION_ERROR: start не ISO 8601', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: 'not-a-date',
        guestName: 'Иван',
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('start');
    });

    it('400 VALIDATION_ERROR: eventTypeId не UUID', async () => {
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: 'not-uuid',
        start: '2026-08-05T06:00:00.000Z',
        guestName: 'Иван',
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('eventTypeId');
    });

    it('404 NOT_FOUND: eventTypeId не существует (но валидный UUID)', async () => {
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: '00000000-0000-0000-0000-000000000000',
        start: '2026-08-05T06:00:00.000Z',
        guestName: 'Иван',
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('400 SLOT_OUT_OF_RANGE: start до rangeStart', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      seedSchedule([{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }]);
      // start в далёком прошлом — точно до rangeStart
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: '2020-01-01T06:00:00.000Z',
        guestName: 'Иван',
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SLOT_OUT_OF_RANGE');
    });

    it('400 SLOT_NOT_ALIGNED: start в окне, но не совпадает со slot.start', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      seedSchedule([{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }]);
      const slotStart = `${firstDateForWeekday(3)}T06:15:00.000Z`; // 06:15 — не slot.start
      const res = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'Иван',
        guestEmail: 'a@b.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SLOT_NOT_ALIGNED');
    });

    it('409 SLOT_TAKEN: повторная бронь того же слота', async () => {
      const et = seedEventType({ durationMinutes: 30 });
      seedSchedule([{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }]);
      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;

      const first = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'A',
        guestEmail: 'a@x.com',
      });
      expect(first.status).toBe(201);

      const second = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et.id,
        start: slotStart,
        guestName: 'B',
        guestEmail: 'b@x.com',
      });
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('SLOT_TAKEN');
    });

    it('409 SLOT_TAKEN: бронь другим event-type с пересекающимся временем блокирует слот', async () => {
      const et30 = seedEventType({ durationMinutes: 30, title: '30м' });
      const et60 = seedEventType({ durationMinutes: 60, title: '60м' });
      seedSchedule([{ weekday: 'wednesday', startTime: '09:00:00', endTime: '10:00:00' }]);
      const slotStart = `${firstDateForWeekday(3)}T06:00:00.000Z`;

      // 60-min бронь в 09:00 MSK = [06:00, 07:00) UTC
      const first = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et60.id,
        start: slotStart,
        guestName: 'A',
        guestEmail: 'a@x.com',
      });
      expect(first.status).toBe(201);

      // 30-min бронь в 09:30 MSK = 06:30 UTC — попадает в [06:00, 07:00) → 409
      const second = await ctx.request.post('/v1/bookings').send({
        eventTypeId: et30.id,
        start: `${firstDateForWeekday(3)}T06:30:00.000Z`,
        guestName: 'B',
        guestEmail: 'b@x.com',
      });
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('SLOT_TAKEN');
    });
  });

  describe('GET /v1/bookings', () => {
    function putBooking(
      id: string,
      start: string,
      end: string,
      overrides: Partial<BookingRecord> = {},
    ) {
      const b: BookingRecord = {
        id,
        eventTypeId: overrides.eventTypeId ?? '00000000-0000-0000-0000-000000000000',
        start,
        end,
        guestName: 'Гость',
        guestEmail: 'g@example.com',
        createdAt: '2026-08-07T00:00:00.000Z',
        eventTypeTitle: 'Встреча 30м',
        durationMinutes: 30,
        ...overrides,
      };
      ctx.store.bookings.set(id, b);
    }

    it('200: пустой список при отсутствии броней', async () => {
      const res = await ctx.request.get('/v1/bookings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('upcoming=true (default): только будущие брони, отсортированы по start asc', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const future1 = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const future2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      // намеренно вставляем в «неправильном» порядке
      putBooking('b2', future2, future2);
      putBooking('b_past', past, past);
      putBooking('b1', future1, future1);

      const res = await ctx.request.get('/v1/bookings');
      expect(res.status).toBe(200);
      expect(res.body.map((b: { id: string }) => b.id)).toEqual(['b1', 'b2']);
    });

    it('upcoming=false: возвращает все брони (вкл. прошедшие)', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      putBooking('b_past', past, past);
      putBooking('b_future', future, future);

      const res = await ctx.request.get('/v1/bookings?upcoming=false');
      expect(res.status).toBe(200);
      expect(res.body.map((b: { id: string }) => b.id).sort()).toEqual(['b_future', 'b_past']);
    });

    it('filter from/to по plainDate (в часовом поясе владельца)', async () => {
      ctx.store.availability = { timeZone: 'Europe/Moscow', intervals: [] };
      // 23:00 UTC Aug 10 = 02:00 MSK Aug 11 → попадёт в plainDate 2026-08-11
      putBooking('b_msk_am', '2026-08-10T20:00:00.000Z', '2026-08-10T20:30:00.000Z'); // 23:00 MSK Aug 10
      putBooking('b_msk_pm', '2026-08-10T23:00:00.000Z', '2026-08-10T23:30:00.000Z'); // 02:00 MSK Aug 11

      // только Aug 11 (по owner-tz): ожидаем b_msk_pm
      const res = await ctx.request.get(
        '/v1/bookings?upcoming=false&from=2026-08-11&to=2026-08-11',
      );
      expect(res.status).toBe(200);
      expect(res.body.map((b: { id: string }) => b.id)).toEqual(['b_msk_pm']);
    });

    it('400 VALIDATION_ERROR: невалидный формат from', async () => {
      const res = await ctx.request.get('/v1/bookings?from=08-11-2026');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('from');
    });

    it('BookingListItem содержит snapshot eventTypeTitle/durationMinutes', async () => {
      const etId = randomUUID();
      ctx.store.eventTypes.set(etId, {
        id: etId,
        title: 'Удалённый тип',
        description: '',
        durationMinutes: 90,
      });
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const end = new Date(now.getTime() + 60 * 60 * 1000 + 90 * 60 * 1000).toISOString();
      putBooking('b_snap', start, end, {
        eventTypeId: etId,
        eventTypeTitle: 'Удалённый тип',
        durationMinutes: 90,
      });
      // После создания тип `etId` удаляем — snapshot в брони должен остаться.
      ctx.store.eventTypes.delete(etId);

      const res = await ctx.request.get('/v1/bookings');
      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({
        eventTypeTitle: 'Удалённый тип',
        durationMinutes: 90,
        eventTypeId: etId,
      });
    });

    it('snapshot остаётся после изменения title типа события', async () => {
      const etId = randomUUID();
      ctx.store.eventTypes.set(etId, {
        id: etId,
        title: 'Старый заголовок',
        description: '',
        durationMinutes: 30,
      });
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      putBooking('b_old', start, start, {
        eventTypeId: etId,
        eventTypeTitle: 'Старый заголовок',
        durationMinutes: 30,
      });
      // теперь меняем title в типе события
      ctx.store.eventTypes.get(etId)!.title = 'Новый заголовок';

      const res = await ctx.request.get('/v1/bookings');
      expect(res.body[0].eventTypeTitle).toBe('Старый заголовок');
    });
  });
});
