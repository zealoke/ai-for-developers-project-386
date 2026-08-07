import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';

/**
 * Модуль сидирования. Заполняет in-memory хранилище на старте приложения.
 * Зависит от глобального `DbModule` (через StoreService) и выполняется
 * синхронно в `OnModuleInit` до готовности HTTP-сервера.
 */
@Module({
  providers: [SeedService],
})
export class SeedModule {}
