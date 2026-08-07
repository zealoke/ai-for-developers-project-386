import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StoreService } from '../db/store.service';
import type { EventTypeRecord } from '../db/db.types';

const SEED_EVENT_TYPES: Array<Omit<EventTypeRecord, 'id'>> = [
  {
    title: 'Знакомство 30 минут',
    description:
      'Короткая встреча, чтобы обсудить детали и понять, чем можем быть полезны друг другу.',
    durationMinutes: 30,
  },
  {
    title: 'Консультация 60 минут',
    description: 'Подробный разбор задачи, вопросов и совместное планирование следующих шагов.',
    durationMinutes: 60,
  },
  {
    title: 'Демо продукта 45 минут',
    description: 'Онлайн-демонстрация возможностей продукта с ответами на вопросы.',
    durationMinutes: 45,
  },
];

const SEED_AVAILABILITY = {
  timeZone: 'Europe/Moscow',
  intervals: [
    { weekday: 'monday', startTime: '09:00:00', endTime: '18:00:00' },
    { weekday: 'tuesday', startTime: '09:00:00', endTime: '18:00:00' },
    { weekday: 'wednesday', startTime: '09:00:00', endTime: '18:00:00' },
    { weekday: 'thursday', startTime: '09:00:00', endTime: '18:00:00' },
    { weekday: 'friday', startTime: '09:00:00', endTime: '18:00:00' },
  ],
} as const;

/**
 * Заполняет in-memory хранилище начальными данными: 3 типа события и рабочий
 * график (пн–пт, 09:00–18:00) в Europe/Moscow. Брони стартуют пустыми.
 *
 * Управляется env `SEED`: любое значение кроме "false" оставляет сидинг
 * включённым (по умолчанию). Сидинг выполняется синхронно в OnModuleInit,
 * до первого HTTP-запроса — поэтому гонок нет.
 *
 * При перезапуске процесса данные сбрасываются (in-memory).
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly store: StoreService) {}

  onModuleInit(): void {
    if (process.env.SEED === 'false') {
      this.logger.log('SEED=false — starting with empty in-memory store');
      return;
    }
    const store = this.store.get();

    for (const et of SEED_EVENT_TYPES) {
      const id = uuidv4();
      store.eventTypes.set(id, { id, ...et });
    }

    store.availability = {
      timeZone: SEED_AVAILABILITY.timeZone,
      intervals: SEED_AVAILABILITY.intervals.map((i) => ({ ...i })),
    };

    this.logger.log(
      `seed done: ${store.eventTypes.size} event type(s), ${store.availability.intervals.length} interval(s), tz=${store.availability.timeZone}`,
    );
  }
}
