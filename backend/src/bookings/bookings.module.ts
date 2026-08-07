import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

/**
 * Модуль бронирований. `StoreService` предоставляется глобальным `DbModule`.
 *
 * Слотовую сетку строит через чистую функцию `slots.logic.buildSlotsResponse`
 * (напрямую, без инъекции SlotsService) — это устраняет циклическую зависимость
 * между bookings и slots модулями: bookings читает store напрямую.
 */
@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
