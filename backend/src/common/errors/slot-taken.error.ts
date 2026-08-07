import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

/** 409 — слот уже занят другой бронью (любого типа события). Контракт: SLOT_TAKEN. */
export class SlotTakenError extends DomainError {
  constructor(message: string) {
    super('SLOT_TAKEN', HttpStatus.CONFLICT, message);
  }
}
