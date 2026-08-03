import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ru';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ru');

/**
 * Проверяет, что строка — валидное IANA-имя часового пояса. Контракт это
 * гарантирует ("IANA-имя часового пояса владельца"), но защищаемся от
 * невалидных данных: например, `prism mock` без примеров в спеке генерирует
 * для `timeZone: string` случайный текст, а не реальный пояс — без этой
 * проверки dayjs.tz() бросает необработанное исключение и роняет страницу.
 */
function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Контракт возвращает время в UTC (`utcDateTime`), но владелец настраивает
 * график в своём часовом поясе (`AvailabilitySchedule.timeZone`,
 * `SlotsResponse.timeZone`). Гостю показываем время именно в поясе
 * владельца (а не в поясе браузера гостя) — иначе группировка слотов по
 * дням (`DaySlots.date`), уже посчитанная сервером, разъедется с тем, что
 * видит пользователь. Пояс всегда подписан в интерфейсе.
 */
export function toOwnerTime(isoUtc: string, ownerTimeZone: string): dayjs.Dayjs {
  const timeZone = isValidTimeZone(ownerTimeZone) ? ownerTimeZone : 'UTC';
  return dayjs.utc(isoUtc).tz(timeZone);
}

/** Полная дата и время в поясе владельца, например «12 августа 2026, 14:30». */
export function formatDateTime(isoUtc: string, ownerTimeZone: string): string {
  return toOwnerTime(isoUtc, ownerTimeZone).format('D MMMM YYYY, HH:mm');
}

/** Диапазон времени слота в поясе владельца, например «14:30–15:00». */
export function formatTimeRange(startIso: string, endIso: string, ownerTimeZone: string): string {
  const start = toOwnerTime(startIso, ownerTimeZone);
  const end = toOwnerTime(endIso, ownerTimeZone);
  return `${start.format('HH:mm')}\u2013${end.format('HH:mm')}`;
}

/** Только время слота в поясе владельца, например «14:30». */
export function formatTime(isoUtc: string, ownerTimeZone: string): string {
  return toOwnerTime(isoUtc, ownerTimeZone).format('HH:mm');
}

/** Подпись дня из DaySlots.date (уже "локальная" дата владельца), например «12 августа, среда». */
export function formatDayLabel(plainDate: string): string {
  return dayjs(plainDate, 'YYYY-MM-DD').format('D MMMM, dddd');
}

/** Короткая подпись дня для вкладок/списка дней, например «12 авг, ср». */
export function formatDayShortLabel(plainDate: string): string {
  return dayjs(plainDate, 'YYYY-MM-DD').format('D MMM, dd');
}

/** dayjs.Dayjs -> plainDate (YYYY-MM-DD) для query-параметров `from`/`to`. */
export function toPlainDate(date: dayjs.Dayjs | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * API plainTime (`HH:mm:ss`) -> значение для Mantine TimeInput (`HH:mm`).
 * Если пришло что-то нестандартное — обрезаем до 5 символов как fallback.
 */
export function plainTimeToInputValue(plainTime: string): string {
  const match = /^(\d{2}:\d{2})/.exec(plainTime);
  return match ? match[1] : plainTime.slice(0, 5);
}

/** Значение Mantine TimeInput (`HH:mm`) -> API plainTime (`HH:mm:ss`). */
export function inputValueToPlainTime(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  return `${value}:00`;
}

export { dayjs };
