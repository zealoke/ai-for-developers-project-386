import type { KnownApiErrorBody, ValidationErrorDetail } from './types';

/**
 * Единая ошибка API. Оборачивает тело ошибки контракта (поле `code`) плюс
 * HTTP-статус, чтобы вызывающий код мог как проверить конкретный `code`,
 * так и упасть в общий обработчик для неизвестных случаев (сеть, 5xx).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: KnownApiErrorBody | undefined;

  constructor(status: number, body: KnownApiErrorBody | undefined) {
    super(body?.message ?? `Запрос к API завершился с ошибкой (HTTP ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get code(): KnownApiErrorBody['code'] | undefined {
    return this.body?.code;
  }

  is<C extends KnownApiErrorBody['code']>(code: C): boolean {
    return this.body?.code === code;
  }
}

/** Ошибка сети / недоступный сервер (fetch выбросил до получения ответа). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/** Достаёт из ValidationError удобную карту `field -> сообщение` для Mantine form.setErrors. */
export function validationErrorsToFieldMap(
  details: ValidationErrorDetail[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const detail of details) {
    map[detail.field] = detail.message;
  }
  return map;
}

/** Человекочитаемое сообщение по умолчанию для нотификаций. */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
