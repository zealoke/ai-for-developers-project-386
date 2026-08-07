import { Injectable } from '@nestjs/common';
import type { Store } from './db.types';

/**
 * In-memory синглтон-хранилище всего состояния приложения.
 *
 * Сбрасывается при перезапуске процесса — это намеренно (см. AGENTS.md и
 * README). Хранится в виде Map-коллекций для O(1) lookup по id и удобной
 * итерации. График доступности один на календарь — не Map, а объект.
 */
@Injectable()
export class StoreService {
  private readonly store: Store = createStore();

  /** Доступ к корневому состоянию (мутации — через методы сервисов модулей). */
  get(): Store {
    return this.store;
  }
}

/** Создаёт пустое хранилище с дефолтным (пустым) графиком доступности. */
export function createStore(): Store {
  return {
    eventTypes: new Map(),
    availability: { timeZone: 'UTC', intervals: [] },
    bookings: new Map(),
  };
}
