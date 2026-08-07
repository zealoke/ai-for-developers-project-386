import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

/** 400 — start брони не совпадает ни с одним сгенерированным слотом. Контракт: SLOT_NOT_ALIGNED. */
export class SlotNotAlignedError extends DomainError {
  constructor(message: string) {
    super('SLOT_NOT_ALIGNED', HttpStatus.BAD_REQUEST, message);
  }
}
