import { Injectable, ValidationPipe } from '@nestjs/common';
import { ValidationException, type ValidationExceptionBody } from '../errors/validation.exception';

/**
 * Глобальный `ValidationPipe`, переопределяющий только `exceptionFactory`:
 * ошибки class-validator'а упаковываются в контрактный `VALIDATION_ERROR`
 * (с details[].field/details[].message), как ожидает фронтенд по контракту
 * (specs/lib/errors.tsp).
 *
 * Опции:
 *  - `transform: true` — DTO-инстанциация через class-transformer + преобразование
 *    типов (напр., строка -> enum/number для query/body).
 *  - `transformOptions: { enableImplicitConversion: false }` — без неявной
 *    конверсии; полагаемся только на @Type() и явные decorators.
 *  - `whitelist: true` — отбрасывает поля, не описанные в DTO (защита от лишних
 *    полей в body/query, приводящих к молчаливым багам).
 *  - `forbidNonWhitelisted: false` — НЕ бросаем 400 на лишних полях, просто
 *    молча отбрасываем (снисходительный API; контракт не запрещает).
 *
 * Применяется ко всем `@Body`/`@Query`/`@Param`, у которых указан тип-DTO.
 */
@Injectable()
export class ContractValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
      forbidNonWhitelisted: false,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) => {
        const details = flattenErrors(errors);
        const message =
          details.length <= 1
            ? (details[0]?.message ?? 'Validation failed')
            : `Validation failed for ${new Set(details.map((d) => d.field.split('.')[0])).size} field(s)`;
        return new ValidationException(message, details);
      },
    });
  }
}

// ValidationError is exported as the type-only alias for backwards-compat shape.
export type { ValidationExceptionBody };

/** Разворачивает дерево ValidationError в плоский список {field, message}. */
function flattenErrors(
  errors: import('class-validator').ValidationError[],
  parentPath = '',
): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        out.push({ field, message });
      }
    }
    if (error.children && error.children.length > 0) {
      out.push(...flattenErrors(error.children, field));
    }
  }
  return out;
}
