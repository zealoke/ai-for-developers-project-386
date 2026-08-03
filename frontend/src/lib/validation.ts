import type { AvailabilityInterval } from '../api/types';

/** Ограничения полей из контракта (specs/models/event-type.tsp). */
export const EVENT_TYPE_LIMITS = {
  titleMin: 1,
  titleMax: 120,
  descriptionMax: 2000,
  durationMin: 5,
  durationMax: 480,
} as const;

/** Ограничения полей из контракта (specs/models/booking.tsp). */
export const BOOKING_LIMITS = {
  guestNameMin: 1,
  guestNameMax: 200,
  notesMax: 2000,
} as const;

export interface IntervalValidationError {
  /** Индекс интервала в исходном массиве. */
  index: number;
  message: string;
}

/**
 * Клиентская проверка графика доступности перед отправкой `PUT /availability`
 * (сервер отвечает только `ValidationError` на плохой JSON, но не проверяет
 * пересечения интервалов и порядок времени — это забота фронтенда).
 */
export function validateIntervals(intervals: AvailabilityInterval[]): IntervalValidationError[] {
  const errors: IntervalValidationError[] = [];

  intervals.forEach((interval, index) => {
    if (interval.startTime >= interval.endTime) {
      errors.push({ index, message: 'Время окончания должно быть позже времени начала' });
    }
  });

  const byWeekday = new Map<string, { index: number; interval: AvailabilityInterval }[]>();
  intervals.forEach((interval, index) => {
    const list = byWeekday.get(interval.weekday) ?? [];
    list.push({ index, interval });
    byWeekday.set(interval.weekday, list);
  });

  for (const list of byWeekday.values()) {
    const sorted = [...list].sort((a, b) =>
      a.interval.startTime.localeCompare(b.interval.startTime),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.interval.startTime < prev.interval.endTime) {
        errors.push({
          index: curr.index,
          message: 'Интервал пересекается с другим интервалом этого дня',
        });
      }
    }
  }

  return errors;
}
