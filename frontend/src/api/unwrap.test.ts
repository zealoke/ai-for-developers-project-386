import { describe, expect, it } from 'vitest';
import { unwrap, unwrapVoid } from './unwrap';
import { ApiError, NetworkError } from './errors';

function makeResponse(status: number): Response {
  return new Response(null, { status });
}

describe('unwrap', () => {
  it('возвращает data при успешном ответе', async () => {
    const result = await unwrap(
      Promise.resolve({ data: { id: '1' }, error: undefined, response: makeResponse(200) }),
    );
    expect(result).toEqual({ id: '1' });
  });

  it('бросает ApiError с распознанным кодом при ошибке', async () => {
    await expect(
      unwrap(
        Promise.resolve({
          data: undefined,
          error: { code: 'SLOT_TAKEN', message: 'Занято' },
          response: makeResponse(409),
        }),
      ),
    ).rejects.toMatchObject({ status: 409, code: 'SLOT_TAKEN' });
  });

  it('бросает NetworkError, если fetch завершился с исключением', async () => {
    await expect(unwrap(Promise.reject(new TypeError('Failed to fetch')))).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});

describe('unwrapVoid', () => {
  it('ничего не возвращает при успехе (204)', async () => {
    await expect(
      unwrapVoid(
        Promise.resolve({ data: undefined, error: undefined, response: makeResponse(204) }),
      ),
    ).resolves.toBeUndefined();
  });

  it('бросает ApiError при ошибке', async () => {
    await expect(
      unwrapVoid(
        Promise.resolve({
          data: undefined,
          error: { code: 'NOT_FOUND', message: 'Не найдено' },
          response: makeResponse(404),
        }),
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
