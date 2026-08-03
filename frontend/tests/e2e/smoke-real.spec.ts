import { expect, test } from '@playwright/test';

const isEnabled = process.env.E2E_REAL_BACKEND === '1';

/**
 * В отличие от остальных e2e-тестов, здесь сеть НЕ перехватывается —
 * запросы идут через реальный dev-прокси Vite на тот бэкенд, что указан в
 * DEV_API_TARGET/DEV_API_PREFIX (.env). Это дымовой тест сверки фронтенда с
 * реально запущенным бэкендом, а не с фикстурами.
 *
 * Запуск:
 *   1. Укажите в .env DEV_API_TARGET=http://localhost:<порт бэкенда>
 *      (и DEV_API_PREFIX, если бэкенд слушает не от корня, а под /v1).
 *   2. E2E_REAL_BACKEND=1 npm run test:e2e -- smoke-real
 */
test.describe('smoke-тест против реального бэкенда', () => {
  test.skip(
    !isEnabled,
    'Пропущено: запустите с E2E_REAL_BACKEND=1 и настроенным DEV_API_TARGET в .env',
  );

  test('список типов встреч загружается с реального бэкенда', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Выберите тип встречи' })).toBeVisible();

    // Либо список типов, либо явное пустое состояние — оба варианта значат,
    // что запрос к бэкенду прошёл успешно и не упал с сетевой ошибкой.
    const emptyState = page.getByText('Пока нет доступных типов встреч. Загляните позже.');
    const anyCard = page.locator('[data-testid^="event-type-card-"]').first();
    await expect(emptyState.or(anyCard)).toBeVisible({ timeout: 15_000 });
  });

  test('график доступности владельца загружается с реального бэкенда', async ({ page }) => {
    await page.goto('/admin/availability');

    await expect(page.getByRole('combobox', { name: 'Часовой пояс' })).toHaveValue(/.+/, {
      timeout: 15_000,
    });
  });
});
