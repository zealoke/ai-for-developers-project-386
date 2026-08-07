import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupIntegration, type IntegrationSetup } from './setup';

/**
 * Integration-тесты `GET/PUT /v1/availability` из specs/routes/availability.tsp:
 *  - happy path read/replace
 *  - VALIDATION_ERROR (декораторы: timeZone, weekday, plainTime, nested)
 *  - семантическая валидация (startTime<endTime, перекрытия) — в один
 *    VALIDATION_ERROR с details[] полем `intervals[N]`.
 *
 * Важно: PUT идемпотентен и возвращает сохранённое значение.
 */
describe('Availability integration', () => {
  let ctx: IntegrationSetup;

  beforeEach(async () => {
    ctx = await setupIntegration();
  });
  afterEach(async () => {
    await ctx.stop();
  });

  describe('GET /v1/availability', () => {
    it('200: возвращает дефолтный пустой график (UTC, [])', async () => {
      const res = await ctx.request.get('/v1/availability');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ timeZone: 'UTC', intervals: [] });
    });

    it('200: возвращает график после PUT', async () => {
      await ctx.request.put('/v1/availability').send({
        timeZone: 'Europe/Moscow',
        intervals: [{ weekday: 'monday', startTime: '09:00:00', endTime: '18:00:00' }],
      });
      const res = await ctx.request.get('/v1/availability');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        timeZone: 'Europe/Moscow',
        intervals: [{ weekday: 'monday', startTime: '09:00:00', endTime: '18:00:00' }],
      });
    });
  });

  describe('PUT /v1/availability', () => {
    const valid = {
      timeZone: 'Europe/Moscow',
      intervals: [
        { weekday: 'monday', startTime: '09:00:00', endTime: '13:00:00' },
        { weekday: 'monday', startTime: '14:00:00', endTime: '18:00:00' },
        { weekday: 'tuesday', startTime: '09:00:00', endTime: '18:00:00' },
      ],
    };

    it('200: заменяет график и возвращает сохранённое', async () => {
      const res = await ctx.request.put('/v1/availability').send(valid);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(valid);
      // идемпотентность: повторный PUT того же body даёт тот же результат
      const res2 = await ctx.request.put('/v1/availability').send(valid);
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual(valid);
      // реально в хранилище:
      expect(ctx.store.availability).toEqual(valid);
    });

    it('200: пустой массив intervals валиден (нет рабочих окон)', async () => {
      const res = await ctx.request
        .put('/v1/availability')
        .send({ timeZone: 'UTC', intervals: [] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ timeZone: 'UTC', intervals: [] });
    });

    it('400 VALIDATION_ERROR: невалидный timeZone (не IANA)', async () => {
      const res = await ctx.request
        .put('/v1/availability')
        .send({ timeZone: 'Moscow/Russia', intervals: [] });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('timeZone');
    });

    it('400 VALIDATION_ERROR: weekday не из enum', async () => {
      const res = await ctx.request.put('/v1/availability').send({
        timeZone: 'UTC',
        intervals: [{ weekday: 'понедельник', startTime: '09:00:00', endTime: '18:00:00' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields.some((f: string) => f.startsWith('intervals.0'))).toBe(true);
    });

    it('400 VALIDATION_ERROR: plainTime без секунд', async () => {
      const res = await ctx.request.put('/v1/availability').send({
        timeZone: 'UTC',
        intervals: [{ weekday: 'monday', startTime: '09:00', endTime: '18:00:00' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('intervals.0.startTime');
    });

    it('400 VALIDATION_ERROR: startTime >= endTime (семантика)', async () => {
      const res = await ctx.request.put('/v1/availability').send({
        timeZone: 'UTC',
        intervals: [{ weekday: 'monday', startTime: '18:00:00', endTime: '18:00:00' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details[0].field).toBe('intervals.0');
      expect(res.body.details[0].message).toContain('startTime');
    });

    it('400 VALIDATION_ERROR: перекрытие интервалов одного дня (семантика)', async () => {
      const res = await ctx.request.put('/v1/availability').send({
        timeZone: 'UTC',
        intervals: [
          { weekday: 'monday', startTime: '09:00:00', endTime: '13:00:00' },
          { weekday: 'monday', startTime: '12:00:00', endTime: '18:00:00' }, // overlaps
        ],
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details.some((d: { field: string }) => d.field === 'intervals.1')).toBe(true);
    });

    it('400 VALIDATION_ERROR: нет обязательного поля timeZone', async () => {
      const res = await ctx.request.put('/v1/availability').send({ intervals: [] });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('timeZone');
    });
  });
});
