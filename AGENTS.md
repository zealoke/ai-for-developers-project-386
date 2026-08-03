# AGENTS.md

Разрабатываем web-приложение — простой аналог сервиса календаря бронирования
встреч cal.com. В приложении две роли: владелец календаря и гость.
Регистрация и авторизация не планируются. Работа приложения описана при
помощи API-контракта на языке TypeSpec.

Фронтенд (`frontend/`) — отдельная часть приложения, работает только через
HTTP API по контракту из `specs/`. Стек: TypeScript, Vite, React, Mantine,
TanStack Query, React Router, openapi-fetch/openapi-typescript, Vitest,
Playwright, Stoplight Prism. Подробности — в `frontend/README.md`.

## Commands: API contract (run from `specs/`, not repo root)

- `npm install` — first-time setup (root has no package.json; each of `specs/` and `frontend/` is its own npm project)
- `npm run build` — `tsp compile .`; emits OpenAPI 3.1 to `specs/tsp-output/openapi3/openapi.yaml`
- `npm run watch` — recompile on change
- `npm run format` — `tsp format "**/*.tsp"`; run before committing `.tsp` changes

## Commands: frontend (run from `frontend/`, not repo root)

- `npm install` — first-time setup
- `npm run gen:api` — rebuild `specs/` and regenerate `frontend/src/api/schema.d.ts` from the contract; run after any `.tsp` change
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run mock` — Stoplight Prism mock server (no real backend needed, stateless/random data)
- `npm run proxy -- <backend-url>` — Stoplight Prism validation proxy against a running backend
- `npm run lint` / `npm run format` / `npm run typecheck`
- `npm run test` — Vitest (unit)
- `npm run test:e2e` — Playwright (mocks the network with fixtures, no backend/Prism required)

