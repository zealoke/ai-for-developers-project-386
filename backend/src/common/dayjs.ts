import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Расширяем dayjs плагинами один раз глобально — импортируя из любого места
// `dayjs` (этот же модуль), получаем готовый к использованию экземпляр.
dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };
export default dayjs;

/**
 * Возвращает «сегодня» в часовом поясе владельца как plainDate YYYY-MM-DD.
 * Используется как rangeStart сетки слотов (14 дней от «сегодня по владельцу»).
 *
 * `now` опционален — для тестов и determinism; по умолчанию `new Date()`.
 */
export function todayPlainDateInTz(timeZone: string, now: Date = new Date()): string {
  return dayjs(now).tz(timeZone).format('YYYY-MM-DD');
}

/**
 * Проверяет валидность IANA-имени часового пояса через Intl (тот же критерий,
// что и в frontend/src/lib/datetime.ts). Минимум, без поднятия исключения.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

const PLAIN_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

/**
 * Сравнивает две plainTime-строки `HH:mm:ss` хронологически.
 * Лексикографическое сравнение фиксированной ширины работает корректно.
 * Возвращает отрицательное/0/положительное число.
 */
export function cmpPlainTime(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export { PLAIN_TIME_RE };
