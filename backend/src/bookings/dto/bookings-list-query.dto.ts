import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

/**
 * Query-параметры `GET /v1/bookings` (specs/routes/bookings.tsp):
 *   - from?:  plainDate YYYY-MM-DD (включительно)
 *   - to?:    plainDate YYYY-MM-DD (включительно)
 *   - upcoming?: bool (по умолчанию true — фильтруется в сервисе)
 *
 * Query приходит строками; преобразуем `upcoming` из строк в boolean явно.
 * ВАЖНО: НЕ используем `@Type(() => Boolean)` — `Boolean('false') === true`
 * (любая непустая строка truthy), и это полностью ломает `upcoming=false`.
 * Здесь — кастомный `@Transform` с пониманием строковых `'true'/'false'`.
 *
 * `from`/`to` — точно-формат `YYYY-MM-DD` (контрактный `plainDate`).
 * В случае невалидного формата глобальный `ContractValidationPipe`
 * вернёт `VALIDATION_ERROR` (400).
 */
export class BookingsListQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a YYYY-MM-DD plainDate' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a YYYY-MM-DD plainDate' })
  to?: string;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (value === 'true' || value === true || value === 1) return true;
      if (value === 'false' || value === false || value === 0) return false;
      return undefined; // невалидное значение трактуем как дефолт в сервисе
    },
    { toClassOnly: false },
  )
  @IsBoolean()
  upcoming?: boolean;
}
