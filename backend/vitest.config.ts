import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // NestJS-приложение требует `experimentalDecorators` + `emitDecoratorMetadata`
  // для DI по типу параметра конструктора. esbuild (по умолчанию в Vitest)
  // исторически не эмитит `__metadata("design:paramtypes", [...])` для decorator
  // metadata — DI-контейнер Nest получает `undefined` и все inject-поля
  // контроллеров/сервисов оказываются undefined → 500 на каждом запросе.
  //
  // Решение: подключаем `unplugin-swc` — он использует SWC и корректно emits
  // design:paramtypes, как настоящий tsc. Конфиги берутся из tsconfig.json
  // проекта (по умолчанию `unplugin-swc` читает ближайший tsconfig).
  plugins: [
    (swc as unknown as { vite: () => import('vite').PluginOption }).vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
    pool: 'threads',
    // Contract-тест ждёт запуска Prism proxy (внешний subprocess) — он медленнее
    // обычных unit/integration. Поднимаем таймауты для долговязых хуков.
    hookTimeout: 90_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/index.ts', 'src/**/*.module.ts'],
    },
  },
});