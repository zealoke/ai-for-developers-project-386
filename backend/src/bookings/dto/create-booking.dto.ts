import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * Тело `POST /v1/bookings`. Соответствует `BookingCreate` из
 * specs/models/booking.tsp:
 *   - eventTypeId: UUID (EventTypeId формат контракта)
 *   - start: UTC ISO 8601 date-time
 *   - guestName: 1..200
 *   - guestEmail: формат email
 *   - notes?: ≤ 2000
 *
 * `end` вычисляется сервером из `durationMinutes` типа события и сюда не
 * передаётся (контрактная модель `Booking.end` помечена `@visibility(Read)`).
 */
export class CreateBookingDto {
  @IsUUID()
  eventTypeId!: string;

  /**
   * Строка UTC ISO 8601 (напр. `2026-08-10T06:00:00.000Z`). Должна быть
   * в точности равна `Slot.start` из сетки слотов — фронтенд так и делает
   * (см. README фронтенда про «start берётся ровно той строкой»).
   */
  @IsISO8601({ strict: true })
  @IsString()
  start!: string;

  @IsString()
  @Length(1, 200)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
