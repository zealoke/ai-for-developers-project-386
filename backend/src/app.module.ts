import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { SeedModule } from './seed/seed.module';
import { EventTypesModule } from './event-types/event-types.module';
import { AvailabilityModule } from './availability/availability.module';
import { SlotsModule } from './slots/slots.module';
import { BookingsModule } from './bookings/bookings.module';

/**
 * Корневой модуль приложения. Здесь подключаются все доменные модули и
 * глобальная инфраструктура (in-memory БД через `DbModule`, сидирование
 * через `SeedModule`). Глобальный ValidationPipe и exception-фильтр
 * регистрируются в `main.ts` (импортируются туда напрямую, а не через
 * провайдеров — это стандартный паттерн NestJS для глобальных пайпов/фильтров).
 *
 * Доменные модули добавляются по фазам реализации (см. AGENTS.md/план).
 */
@Module({
  imports: [
    DbModule,
    SeedModule,
    EventTypesModule,
    AvailabilityModule,
    SlotsModule,
    BookingsModule,
  ],
})
export class AppModule {}
