import { ApiError, NetworkError } from './errors';
import type { KnownApiErrorBody } from './types';

type FetchResult<T, E> = {
  data?: T;
  error?: E;
  response: Response;
};

/**
 * Приводит ответ openapi-fetch к единому виду: возвращает `data` при успехе,
 * иначе бросает ApiError (с распознанным `code` из контракта) или
 * NetworkError (запрос не дошёл до сервера).
 */
export async function unwrap<T, E = KnownApiErrorBody>(
  call: Promise<FetchResult<T, E>>,
): Promise<T> {
  let result: FetchResult<T, E>;
  try {
    result = await call;
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const { data, error, response } = result;

  if (error !== undefined) {
    throw new ApiError(response.status, error as unknown as KnownApiErrorBody);
  }

  if (data === undefined) {
    // Успешный статус (например, 204 No Content) без тела — вызывающий код
    // сам решает, что делать; для операций без тела используйте unwrapVoid.
    return undefined as T;
  }

  return data;
}

/** То же самое, но для операций без тела ответа (204 No Content). */
export async function unwrapVoid(call: Promise<FetchResult<unknown, unknown>>): Promise<void> {
  let result: FetchResult<unknown, unknown>;
  try {
    result = await call;
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const { error, response } = result;

  if (error !== undefined) {
    throw new ApiError(response.status, error as unknown as KnownApiErrorBody);
  }
}
