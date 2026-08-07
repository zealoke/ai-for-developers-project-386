import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';

export type EmptyOk = true;

const PLAIN_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export type ClassValidatorConstraint = 'isPlainTime';

/**
 * Проверяет, что строка имеет формат plainTime `HH:mm:ss` (контракт
 * AvailabilityInterval.startTime/endTime). Принимает в т.ч. «00:00:00»
 * и рефжектит «24:00:00», «9:00» и «09:00» (без секунд).
 */
export function IsPlainTime(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isPlainTime',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          return typeof value === 'string' && PLAIN_TIME_RE.test(value);
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'time must be in HH:mm:ss format, e.g. "09:30:00"';
        },
      },
    });
  };
}

export default PLAIN_TIME_RE; // for tests
export { PLAIN_TIME_RE };
