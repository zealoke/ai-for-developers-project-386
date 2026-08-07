import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

/** 404 — ресурс не найден (тип события, бронь и т.п.). Контракт: NOT_FOUND. */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super('NOT_FOUND', HttpStatus.NOT_FOUND, message);
  }
}
