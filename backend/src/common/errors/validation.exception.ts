import { HttpException, HttpStatus } from '@nestjs/common';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationExceptionBody {
  code: 'VALIDATION_ERROR';
  message: string;
  details: ValidationErrorDetail[];
}

/**
 * 400 — ошибка валидации входных данных. Тело уже приведено к контрактному
 * формату ValidationError из specs/lib/errors.tsp (с details[]).
 *
 * Глобальный ValidationPipe бросает это исключение через exceptionFactory,
 * преобразуя constraints class-validator'а в details[].field/detail.message.
 */
export class ValidationException extends HttpException {
  constructor(message: string, details: ValidationErrorDetail[]) {
    const body: ValidationExceptionBody = {
      code: 'VALIDATION_ERROR',
      message,
      details,
    };
    super(body, HttpStatus.BAD_REQUEST);
  }
}
