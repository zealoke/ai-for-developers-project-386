import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

/**
 * Тело `PATCH /v1/event-types/{id}`. Частичное обновление: все поля
 * необязательны (соответствует `EventTypeUpdate`). Если поле передано,
 * валидируется теми же правилами, что и в `CreateEventTypeDto`.
 *
 * `@IsOptional` обязателен — иначе class-validator требует наличия поля,
 * даже для PATCH. Пустой body `{}` валиден и ничего не меняет.
 */
export class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;
}
