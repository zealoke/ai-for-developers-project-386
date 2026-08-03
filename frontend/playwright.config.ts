import { defineConfig, devices } from '@playwright/test';

/**
 * e2e-тесты работают на фикстурах (см. tests/e2e/support/mockApi.ts) —
 * реальный бэкенд не нужен, сеть перехватывается на уровне браузера. Поэтому
 * dev-сервер поднимается с проксированием на несуществующий адрес: ни один
 * запрос до него дойти не должен (если дошёл — значит тест забыл замокать
 * маршрут, и это баг теста).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
