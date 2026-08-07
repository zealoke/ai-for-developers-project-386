import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, MaxLength, Min } from 'class-validator';

/**
 * Тело `POST /v1/event-types`. Соответствует `EventTypeCreate` из
 * specs/models/event-type.tsp:
 *   - title: 1..120 символов
 *   - description: ≤ 2000 символов (пустая строка допустима — контрактом
 *     нет @minLength)
 *   - durationMinutes: int32, 5..480
 *
 * `id` генерируется сервером и сюда не передаётся.
 */
export class CreateEventTypeDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;
}
