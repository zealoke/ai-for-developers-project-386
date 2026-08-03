// Удобные псевдонимы для схем и путей контракта.
// Источник истины — src/api/schema.d.ts, сгенерированный из specs/tsp-output/openapi3/openapi.yaml
// командой `npm run gen:api`. Руками schema.d.ts не редактируем.
import type { components } from './schema';

export type EventType = components['schemas']['EventType'];
export type EventTypeCreate = components['schemas']['EventTypeCreate'];
export type EventTypeUpdate = components['schemas']['EventTypeUpdate'];
export type EventTypeId = components['schemas']['EventTypeId'];

export type Weekday = components['schemas']['Weekday'];
export type AvailabilityInterval = components['schemas']['AvailabilityInterval'];
export type AvailabilitySchedule = components['schemas']['AvailabilitySchedule'];

export type Slot = components['schemas']['Slot'];
export type DaySlots = components['schemas']['DaySlots'];
export type SlotsResponse = components['schemas']['SlotsResponse'];

export type Booking = components['schemas']['Booking'];
export type BookingCreate = components['schemas']['BookingCreate'];
export type BookingListItem = components['schemas']['BookingListItem'];

export type ValidationErrorDetail = components['schemas']['ValidationErrorDetail'];
export type ValidationError = components['schemas']['ValidationError'];
export type SlotOutOfRangeError = components['schemas']['SlotOutOfRangeError'];
export type SlotNotAlignedError = components['schemas']['SlotNotAlignedError'];
export type NotFoundError = components['schemas']['NotFoundError'];
export type SlotTakenError = components['schemas']['SlotTakenError'];

export type KnownApiErrorBody =
  ValidationError | SlotOutOfRangeError | SlotNotAlignedError | NotFoundError | SlotTakenError;
