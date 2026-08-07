import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupIntegration, type IntegrationSetup } from './setup';

/**
 * Integration-тесты роутов `POST/GET/PATCH/DELETE /v1/event-types` из
 * specs/routes/event-types.tsp. Happy path + все контракные коды ошибок
 * (VALIDATION_ERROR для body, NOT_FOUND для lookup по id).
 *
 * Состояние изолировано в каждом it: setupIntegration() часто вызывать
 * не дёргаем (Nest init недёшевый), но beforeEach перезапускает его.
 */
describe('EventTypes integration', () => {
  let ctx: IntegrationSetup;

  beforeEach(async () => {
    ctx = await setupIntegration();
  });
  afterEach(async () => {
    await ctx.stop();
  });

  describe('POST /v1/event-types', () => {
    it('201: создаёт тип события и возвращает его с id', async () => {
      const res = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'Встреча', description: ' descr ', durationMinutes: 45 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Встреча',
        description: ' descr ',
        durationMinutes: 45,
      });
      expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Запись реально в хранилище:
      expect(ctx.store.eventTypes.has(res.body.id)).toBe(true);
    });

    it('400 VALIDATION_ERROR: title < 1 и durationMinutes < 5 — details[] по полям', async () => {
      const res = await ctx.request
        .post('/v1/event-types')
        .send({ title: '', description: 'ok', durationMinutes: 2 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.details)).toBe(true);
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('title');
      expect(fields).toContain('durationMinutes');
      // description валидно (пустая строка допустима по контракту):
      expect(fields).not.toContain('description');
    });

    it('400 VALIDATION_ERROR: отсутствует обязательное поле', async () => {
      const res = await ctx.request.post('/v1/event-types').send({ title: 'Без описания' }); // нет description, durationMinutes

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['description', 'durationMinutes']));
    });

    it('400 VALIDATION_ERROR: durationMinutes > 480', async () => {
      const res = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'x', description: 'y', durationMinutes: 481 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('durationMinutes');
    });

    it('whitelist: лишние поля отброшены, запрос проходит', async () => {
      const res = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'X', description: 'Y', durationMinutes: 10, surplus: 'drop me' });

      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('surplus');
    });
  });

  describe('GET /v1/event-types', () => {
    it('200: пустой список в свежем хранилище', async () => {
      const res = await ctx.request.get('/v1/event-types');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('200: список растёт после создания', async () => {
      await ctx.request
        .post('/v1/event-types')
        .send({ title: 'Встреча', description: 'd', durationMinutes: 15 });

      const res = await ctx.request.get('/v1/event-types');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Встреча');
    });
  });

  describe('GET /v1/event-types/:id', () => {
    it('200: возвращает существующий тип', async () => {
      const created = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'T', description: 'D', durationMinutes: 30 });
      const res = await ctx.request.get(`/v1/event-types/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('404 NOT_FOUND для несуществующего id', async () => {
      const res = await ctx.request.get('/v1/event-types/nope');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('nope');
    });
  });

  describe('PATCH /v1/event-types/:id', () => {
    it('200: частичное обновление title', async () => {
      const created = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'До', description: 'D', durationMinutes: 30 });
      const res = await ctx.request
        .patch(`/v1/event-types/${created.body.id}`)
        .send({ title: 'После' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('После');
      expect(res.body.description).toBe('D');
      expect(res.body.durationMinutes).toBe(30);
    });

    it('200: пустой body ничего не меняет', async () => {
      const created = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'До', description: 'D', durationMinutes: 30 });
      const res = await ctx.request.patch(`/v1/event-types/${created.body.id}`).send({});
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        title: 'До',
        description: 'D',
        durationMinutes: 30,
      });
    });

    it('404 NOT_FOUND для несуществующего id', async () => {
      const res = await ctx.request.patch('/v1/event-types/does-not-exist').send({ title: 'x' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('400 VALIDATION_ERROR: обновление durationMinutes невалидным значением', async () => {
      const created = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'T', description: 'D', durationMinutes: 30 });
      const res = await ctx.request
        .patch(`/v1/event-types/${created.body.id}`)
        .send({ durationMinutes: 1 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('durationMinutes');
    });
  });

  describe('DELETE /v1/event-types/:id', () => {
    it('204: удаляет существующий тип', async () => {
      const created = await ctx.request
        .post('/v1/event-types')
        .send({ title: 'T', description: 'D', durationMinutes: 30 });
      const res = await ctx.request.delete(`/v1/event-types/${created.body.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(ctx.store.eventTypes.has(created.body.id)).toBe(false);
    });

    it('404 NOT_FOUND для несуществующего id', async () => {
      const res = await ctx.request.delete('/v1/event-types/nope');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
