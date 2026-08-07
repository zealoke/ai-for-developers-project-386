import { Module } from '@nestjs/common';
import { EventTypesController } from './event-types.controller';
import { EventTypesService } from './event-types.service';

/**
 * Модуль CRUD-операций над типами событий. `StoreService` предоставляется
 * глобальным `DbModule` — импортировать его сюда не нужно.
 */
@Module({
  controllers: [EventTypesController],
  providers: [EventTypesService],
})
export class EventTypesModule {}
