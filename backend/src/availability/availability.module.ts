import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

/**
 * Модуль графика доступности владельца календаря.
 * `StoreService` предоставляется глобальным `DbModule` — не импортируем.
 */
@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
