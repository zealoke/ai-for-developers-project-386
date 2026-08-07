import { Body, Controller, Get, Put } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityScheduleDto } from './dto/availability-schedule.dto';
import type { AvailabilityScheduleRecord } from '../db/db.types';

/**
 * HTTP-контроллер `@route("/availability")` из specs/routes/availability.tsp.
 *
 * 2 операции:
 *   GET /v1/availability   — вернуть текущий график (admin)
 *   PUT /v1/availability   — полностью заменить график (admin), идемпотентно
 *
 * График единственный на календарь — без :id в URL. PUT-валидация:
 *   - structure (DTO) — глобальным `ContractValidationPipe`;
 *   - semantics (startTime<endTime, no overlaps) — внутри `AvailabilityService`.
 */
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  read(): AvailabilityScheduleRecord {
    return this.availability.read();
  }

  @Put()
  replace(@Body() dto: AvailabilityScheduleDto): AvailabilityScheduleRecord {
    return this.availability.replace(dto);
  }
}
