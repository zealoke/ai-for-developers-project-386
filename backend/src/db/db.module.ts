import { Module, Global } from '@nestjs/common';
import { StoreService } from './store.service';

/**
 * Global-модуль, поставляющий in-memory `StoreService` всему приложению.
 * Глобальный, чтобы каждый доменный модуль мог injected'ить StoreService
 * без явного импорта DbModule в каждом модуле.
 */
@Global()
@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class DbModule {}
