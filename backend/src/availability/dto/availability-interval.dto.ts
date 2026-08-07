import { IsEnum } from 'class-validator';
import { IsPlainTime } from '../../common/validators/is-plain-time.validator';
import { WEEKDAYS, type Weekday } from '../../db/db.types';

/**
 * Один интервал доступности в `AvailabilitySchedule.intervals`.
 *
 * `weekday` — значение из enum'а Weekday (строчные monday…sunday).
 * `startTime`/`endTime` — plainTime в формате HH:mm:ss (строго, секунды
 * обязательны — соответствует типу `plainTime` контракта и той же форме,
 * которой фронтенд конвертирует значение Mantine TimeInput, см.
 * frontend/src/lib/datetime.ts `inputValueToPlainTime`).
 *
 * Семантическое правило «startTime < endTime» и «интервалы одного дня
 * не пересекаются» валидируется в сервисе (после class-validator pass),
 * чтобы выдать один `VALIDATION_ERROR` с постатейной разбивкой по
 * `intervals[N]` (см. README фронтенда про общее уведомление для этого
 * эндпоинта).
 */
export class AvailabilityIntervalDto {
  @IsEnum(WEEKDAYS)
  weekday!: Weekday;

  @IsPlainTime()
  startTime!: string;

  @IsPlainTime()
  endTime!: string;
}
