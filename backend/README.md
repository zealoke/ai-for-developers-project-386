# Backend

In-memory NestJS-сервер для упрощённого сервиса бронирования встреч
(аналог [cal.com](https://cal.com)). Реализует API-контракт из
[`../specs`](../specs) — 10 эндпоинтов на роутах `event-types`,
`availability`, `event-types/{id}/slots`, `bookings`.

API слушает под глобальным префиксом `/v1` (соответствует
`@server("https://api.example.com/v1")` в `specs/main.tsp`). Порт — из
env `PORT` (по умолчанию 3000). Состояние — в памяти процесса, при
перезапуске сбрасывается к сид-данным. Авторызации нет; теги
`@tag("guest")` / `@tag("admin")` из TypeSpec чисто документационные.

## Стек

- NestJS 11, TypeScript 5
- `class-validator` / `class-transformer` — DTO-валидация, преобразуется в
  контрактный формат `VALIDATION_ERROR` (с `details[].field/message`).
- `dayjs` (utc + timezone plugin) — нарезка слотов в TZ владельца.
- Vitest 2 + supertest — тесты. `unplugin-swc` включён в Vitest для корректной
  эмитции `design:paramtypes` (DI NestJS требует её).
- Stoplight Prism 5 — contract-тест в режиме validation proxy (`--errors`).

## Установка

```sh
npm install
```

## Команды

| Команда                  | Назначение                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| `npm run dev`            | dev-сервер с watch (порт из `PORT` или 3000)                          |
| `npm start` / `start:prod` | один прогон из `dist/`                                             |
| `npm run build`          | `nest build` → `dist/`                                                |
| `npm run typecheck`      | `tsc --noEmit`                                                        |
| `npm run lint`/`lint:check` | `eslint` (с `--fix` / без)                                          |
| `npm run format`/`format:check` | `prettier --write` / `--check`                                |
| `npm test`               | все тесты Vitest (unit + integration + contract)                     |
| `npm run test:unit`      | только unit-тесты (`test/unit`)                                       |
| `npm run test:integration` / `test:contract` | соответствующие сьюты         |
| `npm run test:watch`     | Vitest в watch-режиме                                                  |

## Переменные окружения

| Имя    | По умолчанию | Описание                                                              |
| ------ | ------------ | --------------------------------------------------------------------- |
| `PORT` | `3000`       | HTTP-порт API.                                                        |
| `SEED` | `true`       | Любое значение ≠ `"false"` — сидировать на старте 3 типа встречи +    |
|        |              | будничный график 09:00–18:00 в `Europe/Moscow`. `"false"` — пустой    |
|        |              | старт (брони не сидируются никогда).                                  |

Пример: `PORT=4000 SEED=false node dist/main.js`.

## Хранение

Чистая in-memory `Map`-коллекция в `src/db/store.service.ts`. Сбрасывается
при перезапуске процесса (см. AGENTS.md / план). При `SEED !== "false"`
стартовые данные — 3 типа встречи + будничный график 09:00–18:00 в
`Europe/Moscow`. Брони не сидируются (контракт не требует). Многопоточной
гонки нет: все мутации sync в одном event-loop-tick'е.

## Логика ключевых доменных операций

- **GET /v1/event-types/{id}/slots** — сетка слотов на 14 дней от «сегодня
  по TZ владельца». Каждый интервал графика (`AvailabilityInterval`) режется
  на отрезки длительностью `durationMinutes` от `startTime`; хвост короче
  `durationMinutes` отбрасывается. `available = false`, если слот
  пересекается с любой бронью (любого типа события, не только текущего).
- **POST /v1/bookings** — валидационная цепочка:
  1. eventTypeId существует? → иначе `NOT_FOUND` (404)
  2. `start` в окне `[rangeStart, rangeEnd)`? → иначе `SLOT_OUT_OF_RANGE` (400)
  3. `start` совпадает ровно со слотом из сетки (строковое сравнение)? →
     иначе `SLOT_NOT_ALIGNED` (400)
  4. слот свободен? → иначе `SLOT_TAKEN` (409)
  5. создаём бронь с `end = start + durationMinutes` и snapshot
     `eventTypeTitle` / `durationMinutes`. `GET /v1/bookings` возвращает
     эти snapshot-поля — даже если тип события переименован или удалён.

## Тесты

- **Unit (`test/unit`)** — чистая доменная логика без HTTP:
  `slots.logic` (нарезка, TZ, пересечения, выравнивание);
  `EventTypesService` и `BookingsService` (служба с in-memory store).
- **Integration (`test/integration`)** — supertest на Nest-app:
  все 10 эндпоинтов, happy-path + все контракные коды ошибок.
- **Contract (`test/contract`)** — Prism validation proxy (`--errors`,
  `--validate-request=false`) против `../specs/tsp-output/openapi3/openapi.yaml`.
  Если контракт нарушен — Prism возвращает error-response, и соответствующий
  сценарий падает. При отсутствии `openapi.yaml` тест автоматически его
  регенерирует через `tsp compile`.

## Интеграция с фронтендом

Включается через `.env` во [`../frontend`](../frontend):

```
DEV_API_TARGET=http://localhost:3000
DEV_API_PREFIX=/v1
```

Затем `npm run dev` (из `../frontend`) проксирует все запросы `/api/**`
на `http://localhost:3000/v1/**`. Контракт можно вручную сверять через
`npm run proxy -- http://localhost:3000/v1` (Prism proxy на :4011).

## Структура

```
src/
  app.module.ts        корневой модуль
  main.ts              bootstrap + /v1 prefix + global pipe/filter
  db/                  StoreService (in-memory) + типы записей
  seed/                SeedModule (3 типа встречи + будничный график)
  common/
    dayjs.ts           dayjs config (utc, timezone)
    errors/            доменные ошибки → контрактный формат
    filters/           GlobalExceptionFilter → {code, message, details?}
    pipes/             ContractValidationPipe → VALIDATION_ERROR с details[]
    validators/        IsIanaTimeZone, IsPlainTime (HH:mm:ss)
  event-types/         CRUD-модуль
  availability/        GET/PUT модуль (+ семантическая валидация графика)
  slots/               service + controller; чистая slots.logic.ts
  bookings/            POST создание + GET список (с фильтрами from/to/upcoming)
test/
  unit/               slots.logic, EventTypesService, BookingsService
  integration/         все 10 эндпоинтов через supertest
  contract/            Prism validation proxy
```