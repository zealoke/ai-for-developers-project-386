import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import type { EventTypeRecord } from '../db/db.types';

/**
 * HTTP-контроллер `@route("/event-types")` из specs/routes/event-types.tsp.
 *
 * 5 операций:
 *   GET    /v1/event-types          — список (guest)
 *   POST   /v1/event-types          — создать (admin), 201
 *   GET    /v1/event-types/:id      — прочитать (guest)
 *   PATCH  /v1/event-types/:id      — обновить (admin)
 *   DELETE /v1/event-types/:id      — удалить (admin), 204
 *
 * Валидация body — глобальной `ContractValidationPipe` по типам DTO.
 * `id` из path намеренно НЕ валидируется как UUID: несуществующий id
 * (в т.ч. не-UUID) уходит в `SLOT_OUT_OF_RANGE`… нет, в `NotFoundError` —
 * см. сервис. Контракт определяет только `NotFoundError` для этих роутов.
 *
 * Авторизации в контракте нет — теги `@tag("guest")`/`@tag("admin")` в TypeSpec
 * несут документационный смысл, на бэкенде не enforced.
 */
@Controller('event-types')
export class EventTypesController {
  constructor(private readonly eventTypes: EventTypesService) {}

  @Get()
  list(): EventTypeRecord[] {
    return this.eventTypes.list();
  }

  @Post()
  create(@Body() dto: CreateEventTypeDto): EventTypeRecord {
    return this.eventTypes.create(dto);
  }

  @Get(':eventTypeId')
  read(@Param('eventTypeId') id: string): EventTypeRecord {
    return this.eventTypes.get(id);
  }

  @Patch(':eventTypeId')
  update(@Param('eventTypeId') id: string, @Body() dto: UpdateEventTypeDto): EventTypeRecord {
    return this.eventTypes.update(id, dto);
  }

  @Delete(':eventTypeId')
  @HttpCode(204)
  remove(@Param('eventTypeId') id: string): void {
    this.eventTypes.remove(id);
  }
}
