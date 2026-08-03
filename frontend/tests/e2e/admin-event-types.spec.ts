import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { eventTypeConsultation } from './fixtures/eventTypes';

test('владелец видит пустое состояние и создаёт новый тип встречи', async ({ page }) => {
  await mockApi(page, { eventTypes: [] });

  await page.goto('/admin/event-types');

  await expect(page.getByText('Пока нет ни одного типа встречи.')).toBeVisible();

  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByLabel('Название').fill('Демо звонок');
  await page.getByLabel('Описание').fill('Показ продукта новым клиентам');
  await page.getByLabel('Длительность (мин)').fill('20');
  await page.getByRole('button', { name: 'Создать' }).click();

  await expect(page.getByText('Тип встречи создан')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Демо звонок' })).toBeVisible();
  await expect(page.getByText('20 мин')).toBeVisible();
});

test('владелец редактирует существующий тип встречи', async ({ page }) => {
  await mockApi(page, { eventTypes: [{ ...eventTypeConsultation }] });

  await page.goto('/admin/event-types');
  await expect(page.getByText('Консультация')).toBeVisible();

  await page.getByRole('button', { name: 'Редактировать' }).click();
  const titleInput = page.getByLabel('Название');
  await expect(titleInput).toHaveValue('Консультация');
  await titleInput.fill('Расширенная консультация');
  await page.getByRole('button', { name: 'Сохранить' }).click();

  await expect(page.getByText('Тип встречи обновлён')).toBeVisible();
  await expect(page.getByText('Расширенная консультация')).toBeVisible();
});

test('владелец удаляет тип встречи после подтверждения', async ({ page }) => {
  await mockApi(page, { eventTypes: [{ ...eventTypeConsultation }] });

  await page.goto('/admin/event-types');
  await expect(page.getByText('Консультация')).toBeVisible();

  await page.getByRole('button', { name: 'Удалить' }).click();
  await page.getByRole('button', { name: 'Удалить' }).last().click();

  await expect(page.getByText('Тип встречи удалён')).toBeVisible();
  await expect(page.getByText('Пока нет ни одного типа встречи.')).toBeVisible();
});

test('форма не отправляется без обязательных полей', async ({ page }) => {
  await mockApi(page, { eventTypes: [] });

  await page.goto('/admin/event-types');
  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.getByRole('button', { name: 'Создать' }).click();

  await expect(page.getByText('Укажите название')).toBeVisible();
  // Модалка не закрылась — запроса на создание не произошло.
  await expect(page.getByRole('dialog')).toBeVisible();
});
