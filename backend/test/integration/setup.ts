import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Store } from '../../src/db/db.types';
import { AppModule } from '../../src/app.module';
import { StoreService } from '../../src/db/store.service';
import { createStore } from '../../src/db/store.service';

/**
 * Базовый хелпер для integration-тестов: поднимает Nest-приложение (без
 * сидирования, с пустым Store), возвращает { app, store, request }.
 *
 * Гарантированно пустое состояние в каждом тесте: SEED жестко запрещён
 * через env, а StoreService переопределён на свежий createStore().
 */
export interface IntegrationSetup {
  app: INestApplication;
  store: Store;
  request: request.SuperTest<request.Test>;
  stop: () => Promise<void>;
}

export async function setupIntegration(
  extraSeed?: (store: Store) => void,
): Promise<IntegrationSetup> {
  const previousSeed = process.env.SEED;
  process.env.SEED = 'false';

  const freshStore = createStore();
  extraSeed?.(freshStore);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StoreService)
    .useValue({
      get: () => freshStore,
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1', { trailSlash: false });
  const { ContractValidationPipe } =
    await import('../../src/common/pipes/contract-validation.pipe');
  const { GlobalExceptionFilter } =
    await import('../../src/common/filters/global-exception.filter');
  app.useGlobalPipes(new ContractValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  process.env.SEED = previousSeed;

  return {
    app,
    store: freshStore,
    request: request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>,
    stop: async () => {
      await app.close();
      await moduleRef.close();
    },
  };
}
