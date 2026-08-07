import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { IsIanaTimeZone } from '../../common/validators/is-iana-time-zone.validator';
import { AvailabilityIntervalDto } from './availability-interval.dto';

/**
 * Тело `PUT /v1/availability`. Соответствует `AvailabilitySchedule` из
 * specs/models/availability.tsp:
 *   - timeZone: валидное IANA-имя часового пояса
 *   - intervals[] — массив интервалов, валидируется каждый.
 *
 * PUT идемпотентно полностью замещает график. Пустой `intervals: []`
 * валиден — он означает «нет рабочих окон» (никаких слотов ни в один день).
 *
 * Семантические правила (startTime < endTime, отсутствие перекрытий
 * интервалов в пределах одного дня недели) валидируются дополнительно
 * в `AvailabilityService.replace()`, потому что class-validator не умеет
 * cross-field правил внутри массива. Ошибки упаковываются в тот же
 * VALIDATION_ERROR-формат с `details[{field: "intervals[N]", message}]`.
 */
export class AvailabilityScheduleDto {
  @IsIanaTimeZone()
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityIntervalDto)
  intervals!: AvailabilityIntervalDto[];
}
