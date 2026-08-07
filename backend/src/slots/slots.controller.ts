import { Controller, Get, Param } from '@nestjs/common';
import { SlotsService } from './slots.service';
import type { SlotsResponseView } from './slots.logic';

/**
 * HTTP-контроллер `@route("/event-types/{eventTypeId}/slots")` из
 * specs/routes/slots.tsp.
 *
 *   GET /v1/event-types/:eventTypeId/slots — сетка слотов на 14 дней вперёд
 *                                            от «сегодня по владельцу».
 *
 * Возвращает SlotsResponse или NOT_FOUND, если тип события не существует.
 */
@Controller('event-types/:eventTypeId/slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  list(@Param('eventTypeId') eventTypeId: string): SlotsResponseView {
    return this.slots.list(eventTypeId);
  }
}
