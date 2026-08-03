import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { eventTypeConsultation, eventTypes } from './fixtures/eventTypes';
import { buildSlotsResponse } from './fixtures/slots';
import { buildBookingFromCreate } from './fixtures/bookings';

test('гость видит список типов встреч и переходит к бронированию', async ({ page }) => {
  await mockApi(page, {
    eventTypes,
    slots: { [eventTypeConsultation.id]: buildSlotsResponse(eventTypeConsultation.id) },
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Выберите тип встречи' })).toBeVisible();
  await expect(page.getByText('Консультация')).toBeVisible();
  await expect(page.getByText('Собеседование')).toBeVisible();

  await page
    .getByTestId(`event-type-card-${eventTypeConsultation.id}`)
    .getByRole('link', { name: 'Выбрать время' })
    .click();

  await expect(page.getByRole('heading', { name: 'Консультация' })).toBeVisible();
  await expect(page.getByText(/Europe\/Moscow/)).toBeVisible();
});

test('гость может забронировать доступный слот', async ({ page }) => {
  const slotsResponse = buildSlotsResponse(eventTypeConsultation.id);
  await mockApi(page, {
    eventTypes,
    slots: { [eventTypeConsultation.id]: slotsResponse },
    onCreateBooking: (body) => ({
      status: 201,
      body: buildBookingFromCreate(body, eventTypeConsultation.durationMinutes),
    }),
  });

  await page.goto(`/book/${eventTypeConsultation.id}`);

  // Первый доступный слот дня (06:00 UTC = 09:00 Europe/Moscow).
  await page.getByRole('button', { name: '09:00' }).click();

  await page.getByLabel('Имя').fill('Иван Иванов');
  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByLabel('Комментарий').fill('Обсудить детали проекта');
  await page.getByRole('button', { name: 'Подтвердить бронь' }).click();

  await expect(page).toHaveURL(`/book/${eventTypeConsultation.id}/done`);
  await expect(page.getByRole('heading', { name: 'Встреча забронирована' })).toBeVisible();
  await expect(page.getByText('Иван Иванов')).toBeVisible();
  await expect(page.getByText('ivan@example.com')).toBeVisible();
});

test('занятый слот недоступен для выбора', async ({ page }) => {
  const slotsResponse = buildSlotsResponse(eventTypeConsultation.id);
  await mockApi(page, {
    eventTypes,
    slots: { [eventTypeConsultation.id]: slotsResponse },
  });

  await page.goto(`/book/${eventTypeConsultation.id}`);

  // Второй слот дня (06:30 UTC = 09:30 Europe/Moscow) помечен available: false.
  await expect(page.getByRole('button', { name: '09:30' })).toBeDisabled();
});

test('гость получает ошибку 409, если слот заняли параллельно', async ({ page }) => {
  const slotsResponse = buildSlotsResponse(eventTypeConsultation.id);
  await mockApi(page, {
    eventTypes,
    slots: { [eventTypeConsultation.id]: slotsResponse },
    onCreateBooking: () => ({
      status: 409,
      body: { code: 'SLOT_TAKEN', message: 'Это время уже занято' },
    }),
  });

  await page.goto(`/book/${eventTypeConsultation.id}`);
  await page.getByRole('button', { name: '09:00' }).click();
  await page.getByLabel('Имя').fill('Иван Иванов');
  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByRole('button', { name: 'Подтвердить бронь' }).click();

  await expect(page.getByText('Это время только что заняли. Выберите другое.')).toBeVisible();
  // Остаёмся на странице бронирования, форма скрыта до повторного выбора слота.
  await expect(page).toHaveURL(`/book/${eventTypeConsultation.id}`);
  await expect(page.getByLabel('Имя')).toHaveCount(0);
});

test('гость видит ошибки валидации сервера по полям', async ({ page }) => {
  const slotsResponse = buildSlotsResponse(eventTypeConsultation.id);
  await mockApi(page, {
    eventTypes,
    slots: { [eventTypeConsultation.id]: slotsResponse },
    onCreateBooking: () => ({
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации',
        details: [
          { field: 'guestEmail', message: 'Email уже использован недавно, попробуйте другой' },
        ],
      },
    }),
  });

  await page.goto(`/book/${eventTypeConsultation.id}`);
  await page.getByRole('button', { name: '09:00' }).click();
  await page.getByLabel('Имя').fill('Иван Иванов');
  await page.getByLabel('Email').fill('ivan@example.com');
  await page.getByRole('button', { name: 'Подтвердить бронь' }).click();

  await expect(page.getByText('Email уже использован недавно, попробуйте другой')).toBeVisible();
});

test('404 по типу встречи возвращает гостя на список', async ({ page }) => {
  await mockApi(page, { eventTypes: [] });

  await page.goto(`/book/${eventTypeConsultation.id}`);

  await expect(page).toHaveURL('/');
  await expect(page.getByText('Этот тип встречи больше не доступен')).toBeVisible();
});
