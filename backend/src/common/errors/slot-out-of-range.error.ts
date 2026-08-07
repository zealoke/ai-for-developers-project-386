import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

/** 400 — start брони вне окна доступных слотов. Контракт: SLOT_OUT_OF_RANGE. */
export class SlotOutOfRangeError extends DomainError {
  constructor(message: string) {
    super('SLOT_OUT_OF_RANGE', HttpStatus.BAD_REQUEST, message);
  }
}
