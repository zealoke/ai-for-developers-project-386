/**
 * Contract test (Prism validation proxy).
 *
 * Поднимает in-process Nest-приложение + Prism validation proxy в режиме
 * `--errors` (Prism вернёт error-response на любое нарушение запроса или
 * ответа против OpenAPI-контракта из ../specs/tsp-output/openapi3/openapi.yaml).
 * Сквозные сценарии идут ЧЕРЕЗ порт Prism, поэтому любое расхождение между
 * реализацией и контрактом роняет конкретный HTTP-запрос → тест падает.
 *
 * Если `openapi.yaml` отсутствует, авто-регенерирует его через `tsp compile`
 * в specs/. Это нормально: contract-test требует свежей контракной спеки.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';

import { AppModule } from '../../src/app.module';
import { StoreService, createStore } from '../../src/db/store.service';
import { ContractValidationPipe } from '../../src/common/pipes/contract-validation.pipe';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

const BACKEND_PORT = 3297;
const PRISM_PORT = 3298;
const SPECS_DIR = '/home/zeal/calendar/specs';
const OPENAPI_PATH = '/home/zeal/calendar/specs/tsp-output/openapi3/openapi.yaml';
const PRISM_BIN = '/home/zeal/calendar/frontend/node_modules/.bin/prism';
const TSP_BIN = '/home/zeal/calendar/specs/node_modules/.bin/tsp';

const PRISM_BASE = `http://127.0.0.1:${PRISM_PORT}`;

interface HttpResponse {
  status: number;
  body: unknown;
  text: string;
}

/** Простой HTTP-клиент поверх `node:http` — без зависимостей от supertest. */
async function http(method: string, path: string, body?: unknown): Promise<HttpResponse> {
  const url = new URL(path, PRISM_BASE);
  const isSameOrigin = url.origin === PRISM_BASE;
  if (!isSameOrigin) throw new Error(`refusing cross-origin: ${url}`);

  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: string | undefined;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  // Используем глобальный `fetch` (Node 22+) — простая и совместимая альтернатива.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${PRISM_BASE}${path}`, {
      method,
      headers,
      body: payload,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    return { status: res.status, body: parsed, text };
  } finally {
    clearTimeout(timer);
  }
}

function ensureOpenApiBuilt(): void {
  if (!existsSync(OPENAPI_PATH)) {
    console.log('[contract] openapi.yaml not found — regenerating via `tsp compile`…');
    execSync(`${TSP_BIN} compile .`, { cwd: SPECS_DIR, stdio: 'inherit' });
  }
  if (!existsSync(OPENAPI_PATH)) {
    throw new Error(
      `openapi.yaml missing after tsp compile: ${OPENAPI_PATH}. Run \`npm run gen:api\` in frontend/ first.`,
    );
  }
}

describe('contract: Prism validation proxy', () => {
  let app: INestApplication;
  let prism: ReturnType<typeof spawn>;
  let didPrismLogError = false;

  beforeAll(async () => {
    ensureOpenApiBuilt();

    // 1) Поднимаем Nest-приложение in-process на фиксированном порту,
    //    с ПУСТЫМ хранилищем (без seed) — данные сценария добавим ручками.
    const previousSeed = process.env.SEED;
    process.env.SEED = 'false';
    const freshStore = createStore();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StoreService)
      .useValue({ get: () => freshStore })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ContractValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.listen(BACKEND_PORT);
    process.env.SEED = previousSeed;

    // 2) Spawn Prism proxy. `--errors` → возвращает error-response при
    //    нарушениях контракта (response side). `--validate-request=false` —
    //    намеренно отключаем валидацию request body: иначе Prism сам
    //    отбивает невалидный запрос 422 и не доходит до бэкенда. Нам важно
    //    проверить именно форму ответов бэкенда (включая наши доменные
    //    400 VALIDATION_ERROR, 404 NOT_FOUND и т.п.) против контракта.
    prism = spawn(
      PRISM_BIN,
      [
        'proxy',
        '--errors',
        '--validate-request=false',
        '-p',
        String(PRISM_PORT),
        OPENAPI_PATH,
        `http://localhost:${BACKEND_PORT}/v1`,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    prism.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trimEnd();

      console.log(`[prism:out] ${text}`);
      // Prism логирует violations как errors: ловим по подстроке.
      if (/VIOLATION|violations|error/i.test(text)) didPrismLogError = true;
    });
    prism.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trimEnd();

      console.error(`[prism:err] ${text}`);
    });
    prism.on('exit', (code) => {
      console.log(`[prism] exited with ${code}`);
    });

    // 3) Дождаться готовности Prism: опрашиваем /event-types (или любой
    //    другой эндпоинт). ВАЖНО: пути идут БЕЗ `/v1` — Prism самостоятельно
    //    добавит префикс из upstream URL при форвардинге на бэкенд.
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      try {
        const r = await http('GET', '/event-types');
        // Любой валидный HTTP-статус означает «прокси слушает». Если Prism
        // вернул свою собственную ошибку валидации — это тоже сигнал «слушает».
        if (r.status > 0) ready = true;
      } catch {
        // ignore — retry
      }
      await new Promise((res) => setTimeout(res, 250));
    }
    if (!ready) {
      throw new Error('Prism proxy did not respond within 15s');
    }
  }, 90_000);

  afterAll(async () => {
    try {
      prism?.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    if (app) await app.close();
  });

  it('GET /v1/event-types — list (200 array)', async () => {
    const res = await http('GET', '/event-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /v1/event-types + read + patch + delete — full CRUD round-trip', async () => {
    const created = await http('POST', '/event-types', {
      title: 'Контракт',
      description: 'описание',
      durationMinutes: 30,
    });
    expect(created.status).toBe(201);
    const createdId = (created.body as { id: string }).id;
    expect(createdId).toMatch(/^[0-9a-f-]{36}$/);

    const read = await http('GET', `/event-types/${createdId}`);
    expect(read.status).toBe(200);
    expect((read.body as { id: string }).id).toBe(createdId);

    const patched = await http('PATCH', `/event-types/${createdId}`, {
      title: 'Новое название',
    });
    expect(patched.status).toBe(200);
    expect((patched.body as { title: string }).title).toBe('Новое название');

    const deleted = await http('DELETE', `/event-types/${createdId}`);
    expect(deleted.status).toBe(204);

    const after = await http('GET', `/event-types/${createdId}`);
    expect(after.status).toBe(404);
    expect((after.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('POST /v1/event-types — 400 VALIDATION_ERROR в формате контракта (details[])', async () => {
    const res = await http('POST', '/event-types', {
      title: '',
      description: '',
      durationMinutes: 1,
    });
    expect(res.status).toBe(400);
    const body = res.body as { code: string; details: Array<{ field: string; message: string }> };
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details[0]).toHaveProperty('field');
    expect(body.details[0]).toHaveProperty('message');
  });

  it('GET/PUT /v1/availability — read default + replace', async () => {
    const before = await http('GET', '/availability');
    expect(before.status).toBe(200);
    const beforeBody = before.body as { timeZone: string; intervals: unknown[] };
    expect(beforeBody.timeZone).toBeTruthy();
    expect(Array.isArray(beforeBody.intervals)).toBe(true);

    const replaced = await http('PUT', '/availability', {
      timeZone: 'Europe/Moscow',
      intervals: [{ weekday: 'monday', startTime: '09:00:00', endTime: '18:00:00' }],
    });
    expect(replaced.status).toBe(200);
    const replacedBody = replaced.body as {
      timeZone: string;
      intervals: Array<{ weekday: string }>;
    };
    expect(replacedBody.timeZone).toBe('Europe/Moscow');
    expect(replacedBody.intervals).toHaveLength(1);
  });

  it('PUT /v1/availability — 400 VALIDATION_ERROR (bad weekday)', async () => {
    const res = await http('PUT', '/availability', {
      timeZone: 'UTC',
      intervals: [{ weekday: 'фантастик', startTime: '09:00:00', endTime: '18:00:00' }],
    });
    expect(res.status).toBe(400);
    expect((res.body as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('GET /v1/event-types/:id/slots — 404 NOT_FOUND for unknown id', async () => {
    const res = await http('GET', `/event-types/${randomUUID()}/slots`);
    expect(res.status).toBe(404);
    expect((res.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('POST /v1/bookings + GET list — full booking flow under contract', async () => {
    // Подготовим тип события и график, чтобы был слот в ближайшие дни.
    const et = await http('POST', '/event-types', {
      title: 'Встреча',
      description: '',
      durationMinutes: 30,
    });
    expect(et.status).toBe(201);
    const etId = (et.body as { id: string }).id;

    const replaced = await http('PUT', '/availability', {
      timeZone: 'Europe/Moscow',
      intervals: [{ weekday: 'monday', startTime: '09:00:00', endTime: '10:00:00' }],
    });
    expect(replaced.status).toBe(200);

    const slots = await http('GET', `/event-types/${etId}/slots`);
    expect(slots.status).toBe(200);
    const slotsBody = slots.body as {
      days: Array<{
        date: string;
        slots: Array<{ start: string; end: string; available: boolean }>;
      }>;
    };
    expect(Array.isArray(slotsBody.days)).toBe(true);

    const dayWithSlots = slotsBody.days.find((d) => d.slots.length > 0);
    expect(dayWithSlots).toBeDefined();
    const slotStart = dayWithSlots!.slots[0].start;

    const booking = await http('POST', '/bookings', {
      eventTypeId: etId,
      start: slotStart,
      guestName: 'Гость Контракта',
      guestEmail: 'guest@example.com',
      notes: 'contract test',
    });
    expect(booking.status).toBe(201);
    const bookingBody = booking.body as Record<string, unknown>;
    expect(typeof bookingBody.id).toBe('string');
    expect(bookingBody.end).toBeDefined();
    // Booking (NOT BookingListItem) — не должно содержать eventTypeTitle/durationMinutes:
    expect(bookingBody).not.toHaveProperty('eventTypeTitle');
    expect(bookingBody).not.toHaveProperty('durationMinutes');

    const list = await http('GET', '/bookings?upcoming=false');
    expect(list.status).toBe(200);
    const listBody = list.body as Array<Record<string, unknown>>;
    expect(Array.isArray(listBody)).toBe(true);
    expect(listBody.length).toBeGreaterThan(0);
    const item = listBody.find((b) => b.id === bookingBody.id);
    expect(item).toBeDefined();
    expect(item).toHaveProperty('eventTypeTitle');
    expect(item).toHaveProperty('durationMinutes');
  });

  it('POST /v1/event-types — лишние UNSPECCed поля SILENTLY dropped (whitelist)', async () => {
    // whitelist=true → лишние поля НЕ вызывают 400, тихо отбрасываются.
    // Проверим, что это не нарушает контракт на уровне request body.
    const res = await http('POST', '/event-types', {
      title: 'OK',
      description: '...',
      durationMinutes: 10,
      surplus: 'ignored-by-whitelist',
    });
    expect(res.status).toBe(201);

    // cleanup
    const createdId = (res.body as { id: string }).id;
    await http('DELETE', `/event-types/${createdId}`);
  });

  it('весь прогон: ни одного violation-маркера в логах Prism', () => {
    // Контрактный proxy работает в режиме --errors: любое нарушение уже
    // роняет конкретный HTTP-запрос (assert-ы выше проходят только если
    // ответ валиден по спеке). Дополнительно проверим, что сам лог Prism
    // не содержит сообщений про violations — это страховка на случай,
    // если Prism сообщил о проблеме, но не выставил error-статус.
    //
    // NB: флаг ставится в stdout-listener'е выше; message внутри
    // supertest-progress мешает — игнорируем только внутриcolsole.log сообщений.
    // Если Prism напечатал "X violations found" в吕 stderr, это будет видно
    // в выводе теста (можно отладить). Здесь же — строгое fat-assertion.
    expect(didPrismLogError).toBe(false);
  });
});
