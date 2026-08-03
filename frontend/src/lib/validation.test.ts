import { describe, expect, it } from 'vitest';
import { validateIntervals } from './validation';
import type { AvailabilityInterval } from '../api/types';

function interval(
  weekday: AvailabilityInterval['weekday'],
  startTime: string,
  endTime: string,
): AvailabilityInterval {
  return { weekday, startTime, endTime };
}

describe('validateIntervals', () => {
  it('не находит ошибок в корректном графике', () => {
    const errors = validateIntervals([
      interval('monday', '09:00:00', '12:00:00'),
      interval('monday', '13:00:00', '18:00:00'),
      interval('tuesday', '09:00:00', '18:00:00'),
    ]);
    expect(errors).toEqual([]);
  });

  it('находит интервал, где конец раньше начала', () => {
    const errors = validateIntervals([interval('monday', '12:00:00', '09:00:00')]);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(0);
  });

  it('находит интервал, где конец равен началу', () => {
    const errors = validateIntervals([interval('monday', '09:00:00', '09:00:00')]);
    expect(errors).toHaveLength(1);
  });

  it('находит пересекающиеся интервалы внутри одного дня', () => {
    const errors = validateIntervals([
      interval('monday', '09:00:00', '13:00:00'),
      interval('monday', '12:00:00', '18:00:00'),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(1);
  });

  it('не путает пересечения между разными днями недели', () => {
    const errors = validateIntervals([
      interval('monday', '09:00:00', '18:00:00'),
      interval('tuesday', '09:00:00', '18:00:00'),
    ]);
    expect(errors).toEqual([]);
  });

  it('находит пересечение независимо от порядка интервалов во входном массиве', () => {
    const errors = validateIntervals([
      interval('monday', '15:00:00', '18:00:00'),
      interval('monday', '09:00:00', '16:00:00'),
    ]);
    expect(errors).toHaveLength(1);
  });
});
