import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDayLabel,
  formatTime,
  formatTimeRange,
  inputValueToPlainTime,
  plainTimeToInputValue,
  toOwnerTime,
  toPlainDate,
} from './datetime';

describe('toOwnerTime', () => {
  it('конвертирует UTC ISO-строку в часовой пояс владельца', () => {
    // 2026-08-03T10:00:00Z -> Europe/Moscow (UTC+3) -> 13:00
    const result = toOwnerTime('2026-08-03T10:00:00Z', 'Europe/Moscow');
    expect(result.format('YYYY-MM-DD HH:mm')).toBe('2026-08-03 13:00');
  });

  it('корректно переносит дату при переходе через полночь', () => {
    // 22:30 UTC -> Europe/Moscow (UTC+3) -> следующий день 01:30
    const result = toOwnerTime('2026-08-03T22:30:00Z', 'Europe/Moscow');
    expect(result.format('YYYY-MM-DD HH:mm')).toBe('2026-08-04 01:30');
  });

  it('не бросает исключение при невалидном часовом поясе, а откатывается на UTC', () => {
    // Контракт гарантирует валидный IANA-пояс, но защищаемся от мусорных
    // данных (например, от prism mock без @example в спеке).
    const result = toOwnerTime('2026-08-03T10:00:00Z', 'esse in anim qui');
    expect(result.format('YYYY-MM-DD HH:mm')).toBe('2026-08-03 10:00');
  });
});

describe('formatTime / formatTimeRange / formatDateTime', () => {
  it('formatTime возвращает только HH:mm в поясе владельца', () => {
    expect(formatTime('2026-08-03T10:00:00Z', 'Europe/Moscow')).toBe('13:00');
  });

  it('formatTimeRange возвращает диапазон через тире', () => {
    expect(formatTimeRange('2026-08-03T10:00:00Z', '2026-08-03T10:30:00Z', 'Europe/Moscow')).toBe(
      '13:00\u201313:30',
    );
  });

  it('formatDateTime возвращает дату и время', () => {
    expect(formatDateTime('2026-08-03T10:00:00Z', 'Europe/Moscow')).toBe('3 августа 2026, 13:00');
  });

  it('поддерживает часовые пояса с дробным смещением', () => {
    // Asia/Kolkata = UTC+5:30
    expect(formatTime('2026-08-03T10:00:00Z', 'Asia/Kolkata')).toBe('15:30');
  });
});

describe('formatDayLabel', () => {
  it('форматирует plainDate в читаемую подпись', () => {
    expect(formatDayLabel('2026-08-03')).toBe('3 августа, понедельник');
  });
});

describe('toPlainDate', () => {
  it('форматирует Date в YYYY-MM-DD', () => {
    expect(toPlainDate(new Date(2026, 7, 3))).toBe('2026-08-03');
  });
});

describe('plainTime <-> TimeInput', () => {
  it('обрезает секунды при чтении из API', () => {
    expect(plainTimeToInputValue('09:30:00')).toBe('09:30');
  });

  it('оставляет как есть, если секунд нет', () => {
    expect(plainTimeToInputValue('09:30')).toBe('09:30');
  });

  it('добавляет секунды при отправке в API', () => {
    expect(inputValueToPlainTime('09:30')).toBe('09:30:00');
  });

  it('не дублирует секунды, если они уже есть', () => {
    expect(inputValueToPlainTime('09:30:00')).toBe('09:30:00');
  });
});
