import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { availabilitySchedule } from './fixtures/availability';

test('владелец видит текущий график и часовой пояс', async ({ page }) => {
  await mockApi(page, { availability: availabilitySchedule });

  await page.goto('/admin/availability');

  await expect(page.getByRole('combobox', { name: 'Часовой пояс' })).toHaveValue('Europe/Moscow');
  await expect(page.getByText('Понедельник')).toBeVisible();
  await expect(page.getByText('Воскресенье')).toBeVisible();

  // Кнопка сохранения выключена, пока нет изменений.
  await expect(page.getByRole('button', { name: 'Сохранить график' })).toBeDisabled();
});

test('владелец добавляет интервал и сохраняет график', async ({ page }) => {
  await mockApi(page, { availability: availabilitySchedule });

  await page.goto('/admin/availability');

  await page
    .getByTestId('weekday-card-tuesday')
    .getByRole('button', { name: 'Добавить интервал' })
    .click();

  await expect(page.getByRole('button', { name: 'Сохранить график' })).toBeEnabled();
  await page.getByRole('button', { name: 'Сохранить график' }).click();

  await expect(page.getByText('График сохранён')).toBeVisible();
});

test('владелец видит ошибку валидации от сервера', async ({ page }) => {
  await mockApi(page, {
    availability: availabilitySchedule,
    onReplaceAvailability: () => ({
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Интервалы пересекаются с уже существующими бронями',
        details: [],
      },
    }),
  });

  await page.goto('/admin/availability');

  await page
    .getByTestId('weekday-card-tuesday')
    .getByRole('button', { name: 'Добавить интервал' })
    .click();
  await page.getByRole('button', { name: 'Сохранить график' }).click();

  await expect(page.getByText('Интервалы пересекаются с уже существующими бронями')).toBeVisible();
});

test('кнопка сохранения выключена при некорректном интервале', async ({ page }) => {
  await mockApi(page, { availability: availabilitySchedule });

  await page.goto('/admin/availability');

  const mondayCard = page.getByTestId('weekday-card-monday');
  const timeInputs = mondayCard.locator('input[type="time"]');
  // Делаем конец интервала раньше начала (второй input в строке — "До").
  await timeInputs.nth(1).fill('08:00');

  await expect(page.getByText('Время окончания должно быть позже времени начала')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сохранить график' })).toBeDisabled();
});
