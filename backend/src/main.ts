import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ContractValidationPipe } from './common/pipes/contract-validation.pipe';

/**
 * Точка входа HTTP-сервера. Поднимает NestJS-приложение с глобальным
 * префиксом `/v1` (соответствует `@server("…/v1")` в specs/main.tsp и
 * `DEV_API_PREFIX=/v1` во фронтенде), контрактным ValidationPipe и
 * фильтром ошибок, приводящим все исключения к specs/lib/errors.tsp.
 *
 * Порт — из env `PORT` (по умолчанию 3000), что совпадает с настройками
 * фронтенд-прокси по умолчанию (`DEV_API_TARGET=http://localhost:3000`).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Подавляем дефолтный NestJS-лог, чтобы не дублировать GlobalExceptionFilter.
    logger: ['log', 'error', 'warn'],
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ContractValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`Backend listening on http://localhost:${port}/v1`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap backend', err);
  process.exit(1);
});
