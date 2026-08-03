import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError, describeApiError, validationErrorsToFieldMap } from './errors';

describe('ApiError', () => {
  it('хранит статус и тело ошибки', () => {
    const error = new ApiError(409, { code: 'SLOT_TAKEN', message: 'Время уже занято' });
    expect(error.status).toBe(409);
    expect(error.code).toBe('SLOT_TAKEN');
    expect(error.message).toBe('Время уже занято');
  });

  it('is() проверяет конкретный код ошибки', () => {
    const error = new ApiError(404, { code: 'NOT_FOUND', message: 'Не найдено' });
    expect(error.is('NOT_FOUND')).toBe(true);
    expect(error.is('SLOT_TAKEN')).toBe(false);
  });

  it('даёт сообщение по умолчанию, если тело отсутствует', () => {
    const error = new ApiError(500, undefined);
    expect(error.message).toContain('500');
  });
});

describe('validationErrorsToFieldMap', () => {
  it('превращает список деталей в карту field -> message', () => {
    const map = validationErrorsToFieldMap([
      { field: 'title', message: 'Обязательное поле' },
      { field: 'durationMinutes', message: 'Должно быть не меньше 5' },
    ]);
    expect(map).toEqual({
      title: 'Обязательное поле',
      durationMinutes: 'Должно быть не меньше 5',
    });
  });

  it('возвращает пустой объект для пустого списка', () => {
    expect(validationErrorsToFieldMap([])).toEqual({});
  });
});

describe('describeApiError', () => {
  it('возвращает сообщение ApiError', () => {
    const error = new ApiError(400, { code: 'NOT_FOUND', message: 'Тип события не найден' });
    expect(describeApiError(error)).toBe('Тип события не найден');
  });

  it('возвращает сообщение NetworkError', () => {
    const error = new NetworkError(new Error('fetch failed'));
    expect(describeApiError(error)).toContain('связаться с сервером');
  });

  it('возвращает сообщение произвольной Error', () => {
    expect(describeApiError(new Error('что-то пошло не так'))).toBe('что-то пошло не так');
  });

  it('возвращает заглушку для неизвестного значения', () => {
    expect(describeApiError('строка вместо ошибки')).toBe('Неизвестная ошибка');
  });
});
