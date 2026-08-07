import { describe, it, expect, beforeEach } from 'vitest';
import { EventTypesService } from '../../src/event-types/event-types.service';
import { StoreService, createStore } from '../../src/db/store.service';
import { NotFoundError } from '../../src/common/errors/not-found.error';
import type { Store } from '../../src/db/db.types';

/**
 * Unit-тесты `EventTypesService` в изоляции: создаём Stack-store напрямую,
 * сервис работает с ним. Не поднимаем NestJS HTTP — это太快 и точечно
 * проверяет доменную логику (CRUD, NOT_FOUND поведение).
 */
describe('EventTypesService (unit)', () => {
  let store: Store;
  let service: EventTypesService;

  beforeEach(() => {
    store = createStore();
    const storeService = { get: () => store } as unknown as StoreService;
    service = new EventTypesService(storeService);
  });

  it('list() пустого хранилища возвращает []', () => {
    expect(service.list()).toEqual([]);
  });

  it('create() присваивает UUID и сохраняет запись', () => {
    const et = service.create({ title: 'T', description: 'D', durationMinutes: 15 });
    expect(et.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.eventTypes.get(et.id)).toEqual(et);
    expect(service.list()).toHaveLength(1);
  });

  it('get() для несуществующего id бросает NotFoundError', () => {
    expect(() => service.get('missing')).toThrow(NotFoundError);
    expect(() => service.get('missing')).toThrow(/missing/);
  });

  it('get() возвращает запись по id', () => {
    const created = service.create({ title: 'T', description: 'D', durationMinutes: 15 });
    expect(service.get(created.id)).toEqual(created);
  });

  it('update() применяет только переданные поля', () => {
    const created = service.create({ title: 'До', description: 'D', durationMinutes: 15 });
    const updated = service.update(created.id, { title: 'После' });
    expect(updated).toMatchObject({ title: 'После', description: 'D', durationMinutes: 15 });
    expect(store.eventTypes.get(created.id)).toMatchObject({ title: 'После' });
  });

  it('update() с {} noop — сохраняет запись без изменений', () => {
    const created = service.create({ title: 'T', description: 'D', durationMinutes: 15 });
    const updated = service.update(created.id, {});
    expect(updated).toEqual(created);
  });

  it('update() для несуществующего id бросает NotFoundError', () => {
    expect(() => service.update('missing', { title: 'x' })).toThrow(NotFoundError);
  });

  it('remove() удаляет запись', () => {
    const created = service.create({ title: 'T', description: 'D', durationMinutes: 15 });
    service.remove(created.id);
    expect(store.eventTypes.has(created.id)).toBe(false);
  });

  it('remove() для несуществующего id бросает NotFoundError', () => {
    expect(() => service.remove('missing')).toThrow(NotFoundError);
  });

  it('remove() не рушится при наличии броней (каскад отсутствует по контракту)', () => {
    const created = service.create({ title: 'T', description: 'D', durationMinutes: 15 });
    // эмулируем бронь, ссылающуюся на этот тип (snapshot хранится отдельно):
    store.bookings.set('b1', {
      id: 'b1',
      eventTypeId: created.id,
      start: '2026-08-07T06:00:00.000Z',
      end: '2026-08-07T06:15:00.000Z',
      guestName: 'Гость',
      guestEmail: 'g@example.com',
      createdAt: '2026-08-07T00:00:00.000Z',
      eventTypeTitle: 'T',
      durationMinutes: 15,
    });
    // remove должно работать — никаких FK-барьеров:
    expect(() => service.remove(created.id)).not.toThrow();
    // бронь остаётся:
    expect(store.bookings.has('b1')).toBe(true);
  });
});
