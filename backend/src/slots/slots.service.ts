import { Injectable } from '@nestjs/common';
import { StoreService } from '../db/store.service';
import { NotFoundError } from '../common/errors/not-found.error';
import { buildSlotsResponse, type SlotsResponseView } from './slots.logic';

/**
 * Сервис построения сетки слотов для типа события.
 *
 * Алгоритм (см. specs/routes/slots.tsp):
 *  - найти тип события по eventTypeId (иначе NOT_FOUND)
 *  - rangeStart = «сегодня» в часовом поясе владельца (AvailabilitySchedule.timeZone)
 *  - за 14 дней вперёд от rangeStart (включительно, верхняя граница rangeEnd = rangeStart + 14 дней — exclusive):
 *      для каждого дня найти интервалы графика доступности того же weekday
 *      нарезать интервал на слоты длительностью `durationMinutes` от startTime
 *      хвост короче durationMinutes отбрасывается
 *      каждый слот получает available=false, если пересекается с любой бронью
 *
 * Часовой пояс и интервалы берутся из `StoreService.get().availability`.
 * Возвращает plain data (без Map-ссылок) — безопасно для сериализации в HTTP.
 */
@Injectable()
export class SlotsService {
  constructor(private readonly store: StoreService) {}

  list(eventTypeId: string, now: Date = new Date()): SlotsResponseView {
    const store = this.store.get();
    const eventType = store.eventTypes.get(eventTypeId);
    if (!eventType) {
      throw new NotFoundError(`Event type ${eventTypeId} not found`);
    }
    const { timeZone, intervals } = store.availability;
    const bookings = [...store.bookings.values()];

    return buildSlotsResponse({
      eventTypeId,
      durationMinutes: eventType.durationMinutes,
      timeZone,
      intervals,
      bookings,
      now,
    });
  }
}
