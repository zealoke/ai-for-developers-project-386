import { Injectable } from '@nestjs/common';
import { StoreService } from '../db/store.service';
import type { AvailabilityScheduleRecord } from '../db/db.types';
import type { AvailabilityScheduleDto } from './dto/availability-schedule.dto';
import {
  ValidationException,
  type ValidationErrorDetail,
} from '../common/errors/validation.exception';

/**
 * Сервис графика доступности: единый на всё приложение (как и сам календарь).
 *
 * `replace()` (PUT /v1/availability) выполняет дополнительную семантическую
 * валидацию, которую class-validator сделать не может:
 *  - каждый интервал: startTime < endTime (хронологически в течение суток)
 *  - интервалы в пределах одного дня недели не пересекаются.
 *
 * Все семантические ошибки упаковываются в ОДИН `VALIDATION_ERROR` с
 * постатейной разбивкой по `intervals[N]` (поле `field` указывает индекс),
 * как ожидает фронтенд (может показать общий alert или爬 по полям).
 *
 * Мутация sync внутри одного event-loop-tick'а — атомарность безопасна.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly store: StoreService) {}

  read(): AvailabilityScheduleRecord {
    return cloneSchedule(this.store.get().availability);
  }

  replace(dto: AvailabilityScheduleDto): AvailabilityScheduleRecord {
    const details = this.validateSemantics(dto);
    if (details.length > 0) {
      throw new ValidationException(semanticSummary(details), details);
    }

    const saved: AvailabilityScheduleRecord = {
      timeZone: dto.timeZone,
      intervals: dto.intervals.map((i) => ({
        weekday: i.weekday,
        startTime: i.startTime,
        endTime: i.endTime,
      })),
    };
    this.store.get().availability = saved;
    return cloneSchedule(saved);
  }

  /**
   * Дополнительная семантическая валидация поверх DTO:
   *   - каждый интервал: startTime < endTime
   *   - интервалы одного дня недели не перекрываются.
   * Возвращает список ValidationErrorDetail (пустой, если всё ок).
   */
  private validateSemantics(dto: AvailabilityScheduleDto): ValidationErrorDetail[] {
    const details: ValidationErrorDetail[] = [];

    for (let i = 0; i < dto.intervals.length; i++) {
      const iv = dto.intervals[i];
      const field = `intervals.${i}`;
      if (iv.startTime >= iv.endTime) {
        details.push({
          field,
          message: `startTime (${iv.startTime}) must be earlier than endTime (${iv.endTime})`,
        });
      }
    }

    // Перекрытия по каждому дню недели: сортируем интервалы этого дня по
    // startTime и проверяем, что каждый следующий начинается не раньше
    // конца предыдущего. Лексикографическое сравнение HH:mm:ss работает
    // корректно (строки фиксированной длины и zero-padded).
    type IndexedInterval = { idx: number; weekday: string; startTime: string; endTime: string };
    const byWeekday = new Map<string, IndexedInterval[]>();
    for (let i = 0; i < dto.intervals.length; i++) {
      const iv = dto.intervals[i];
      const list = byWeekday.get(iv.weekday) ?? [];
      list.push({ idx: i, weekday: iv.weekday, startTime: iv.startTime, endTime: iv.endTime });
      byWeekday.set(iv.weekday, list);
    }

    for (const [, list] of byWeekday) {
      const sorted = [...list].sort((a, b) =>
        a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0,
      );
      for (let k = 1; k < sorted.length; k++) {
        const prev = sorted[k - 1];
        const curr = sorted[k];
        if (curr.startTime < prev.endTime) {
          details.push({
            field: `intervals.${curr.idx}`,
            message: `overlaps with intervals.${prev.idx} on ${curr.weekday}`,
          });
        }
      }
    }

    return details;
  }
}

function cloneSchedule(s: AvailabilityScheduleRecord): AvailabilityScheduleRecord {
  return {
    timeZone: s.timeZone,
    intervals: s.intervals.map((i) => ({ ...i })),
  };
}

function semanticSummary(details: ValidationErrorDetail[]): string {
  return `Availability schedule invalid: ${details.map((d) => d.message).join('; ')}`;
}
