import { HttpException } from '@nestjs/common';

/**
 * Базовый класс доменных ошибок приложения. Каждая доменная ошибка знает
 * свой контрактный `code` и HTTP-статус — глобальный фильтр исключений
 * превращает их в JSON-тело из specs/lib/errors.tsp.
 *
 * Недоменные ошибки (ненаследованные от DomainError) фильтр логирует и
 * отдаёт как 500 с кодом INTERNAL_ERROR (последнего в контракте нет, но
 * он не нарушает схему ошибок: code+message).
 */
export abstract class DomainError extends HttpException {
  /**
   * @param code    Контрактный код ошибки, напр. "NOT_FOUND".
   * @param status  HTTP-статус, напр. 404.
   * @param message Человекочитаемое сообщение (поле `message` в теле ошибки).
   */
  constructor(
    public readonly code: string,
    status: number,
    message: string,
  ) {
    super({ code, message }, status);
  }
}
