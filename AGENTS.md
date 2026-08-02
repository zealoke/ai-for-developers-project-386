# AGENTS.md

Разрабатываем web-приложение — простой аналог сервиса календаря бронирования
встреч cal.com. В приложении две роли: владелец календаря и гость.
Регистрация и авторизация не планируются. Работа приложения описана при
помощи API-контракта на языке TypeSpec.

## Commands (run from `specs/`, not repo root)

- `npm install` — first-time setup (root has no package.json; `specs/` is the npm project)
- `npm run build` — `tsp compile .`; emits OpenAPI 3.1 to `specs/tsp-output/openapi3/openapi.yaml`
- `npm run watch` — recompile on change
- `npm run format` — `tsp format "**/*.tsp"`; run before committing `.tsp` changes

