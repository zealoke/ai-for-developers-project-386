import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { availabilitySchedule } from './fixtures/availability';
import { bookingListItems } from './fixtures/bookings';

test('владелец видит список броней, сгруппированный по дням', async ({ page }) => {
  await mockApi(page, { availability: availabilitySchedule, bookings: bookingListItems });

  await page.goto('/admin/bookings');

  await expect(page.getByText('Пётр Петров')).toBeVisible();
  await expect(page.getByText('petr@example.com')).toBeVisible();
  await expect(page.getByText('Анна Смирнова')).toBeVisible();
  // Время показано в поясе владельца (Europe/Moscow, UTC+3): 06:00 UTC -> 09:00.
  await expect(page.getByText('09:00\u201309:30')).toBeVisible();
});

test('переключатель "только предстоящие" передаётся в запрос', async ({ page }) => {
  const requests: string[] = [];
  await mockApi(page, {
    availability: availabilitySchedule,
    bookings: bookingListItems,
    onRequest: ({ method, path, url }) => {
      if (method === 'GET' && path === '/bookings') {
        requests.push(url.search);
      }
    },
  });

  await page.goto('/admin/bookings');
  await expect(page.getByText('Пётр Петров')).toBeVisible();
  expect(requests.at(-1)).toContain('upcoming=true');

  await page.getByRole('switch', { name: 'Только предстоящие' }).click();
  await expect.poll(() => requests.at(-1)).toContain('upcoming=false');
});

test('выбор диапазона дат передаётся в запрос', async ({ page }) => {
  const requests: string[] = [];
  await mockApi(page, {
    availability: availabilitySchedule,
    bookings: bookingListItems,
    onRequest: ({ method, path, url }) => {
      if (method === 'GET' && path === '/bookings') {
        requests.push(url.search);
      }
    },
  });

  await page.goto('/admin/bookings');
  await expect(page.getByText('Пётр Петров')).toBeVisible();

  await page.getByLabel('Диапазон дат (по началу встречи)').click();
  await page.getByRole('button', { name: '10 August 2026' }).click();
  await page.getByRole('button', { name: '12 August 2026' }).click();

  await expect.poll(() => requests.at(-1)).toContain('from=2026-08-10');
  expect(requests.at(-1)).toContain('to=2026-08-12');
});

test('пустой список броней показывает понятное сообщение', async ({ page }) => {
  await mockApi(page, { availability: availabilitySchedule, bookings: [] });

  await page.goto('/admin/bookings');

  await expect(page.getByText('Броней не найдено.')).toBeVisible();
});
