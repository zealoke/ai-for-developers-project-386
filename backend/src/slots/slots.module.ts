import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

/**
 * Модуль сетки слотов. `StoreService` — глобальный, не импортируем.
 * Чистая логика слотонарезки вынесена в `slots.logic.ts` (без зависимостей
 * от Nest) для прямого unit-тестирования.
 */
@Module({
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
