import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';

/**
 * Проверяет, что строка — валидное IANA-имя часового пояса, напр.
 * "Europe/Moscow". Использует `Intl.DateTimeFormat`, как и фронтенд
 * (frontend/src/lib/datetime.ts) — единый критерий валидности пояса.
 */
export function IsIanaTimeZone(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isIanaTimeZone',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          if (typeof value !== 'string' || value.length === 0) {
            return false;
          }
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'timeZone must be a valid IANA time zone, e.g. "Europe/Moscow"';
        },
      },
    });
  };
}
