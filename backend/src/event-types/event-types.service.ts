import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StoreService } from '../db/store.service';
import type { EventTypeRecord } from '../db/db.types';
import { NotFoundError } from '../common/errors/not-found.error';
import type { CreateEventTypeDto } from './dto/create-event-type.dto';
import type { UpdateEventTypeDto } from './dto/update-event-type.dto';

/**
 * CRUD сервис для типов событий над in-memory `StoreService.eventTypes`.
 *
 * `id` — генерируемый сервером UUID v4. На `remove`/`update`/`read` несуществующий
 * id (в т.ч. не-UUID) → `NotFoundError` — так фронтенд одинаково реагирует на
 * опечатку в URL и на удалённую запись (см. README фронтенда: NOT_FOUND типа
 * встречи → возврат на список).
 *
 * Методы синхронны — никаких `await` между проверкой и мутацией, атомарность
 * обеспечивается однопоточным event loop'ом Node.js (гонок нет: на одном
 * event-loop-tick'е выполнится весь sync-блок целиком).
 */
@Injectable()
export class EventTypesService {
  constructor(private readonly store: StoreService) {}

  list(): EventTypeRecord[] {
    return [...this.store.get().eventTypes.values()].map(toApi);
  }

  get(id: string): EventTypeRecord {
    const et = this.store.get().eventTypes.get(id);
    if (!et) {
      throw new NotFoundError(`Event type ${id} not found`);
    }
    return toApi(et);
  }

  create(dto: CreateEventTypeDto): EventTypeRecord {
    const id = uuidv4();
    const record: EventTypeRecord = { id, ...dto };
    this.store.get().eventTypes.set(id, record);
    return toApi(record);
  }

  update(id: string, dto: UpdateEventTypeDto): EventTypeRecord {
    const store = this.store.get();
    const et = store.eventTypes.get(id);
    if (!et) {
      throw new NotFoundError(`Event type ${id} not found`);
    }
    const updated: EventTypeRecord = {
      ...et,
      ...(dto.title !== undefined ? { title: dto.title } : null),
      ...(dto.description !== undefined ? { description: dto.description } : null),
      ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : null),
    };
    store.eventTypes.set(id, updated);
    return toApi(updated);
  }

  remove(id: string): void {
    const store = this.store.get();
    if (!store.eventTypes.has(id)) {
      throw new NotFoundError(`Event type ${id} not found`);
    }
    store.eventTypes.delete(id);
    // Брони не удаляем каскадно: контракт не требует, а `BookingListItem`
    // держит snapshot `eventTypeTitle`/`durationMinutes` на момент брони.
  }
}

/** Возвращает «контрактную» проекцию записи (без служебных полей, если появятся). */
function toApi(record: EventTypeRecord): EventTypeRecord {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    durationMinutes: record.durationMinutes,
  };
}
