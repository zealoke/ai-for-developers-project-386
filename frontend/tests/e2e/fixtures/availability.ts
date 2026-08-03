import type { AvailabilitySchedule } from '../../../src/api/types';

export const availabilitySchedule: AvailabilitySchedule = {
  timeZone: 'Europe/Moscow',
  intervals: [
    { weekday: 'monday', startTime: '09:00:00', endTime: '18:00:00' },
    { weekday: 'wednesday', startTime: '09:00:00', endTime: '13:00:00' },
    { weekday: 'friday', startTime: '12:00:00', endTime: '20:00:00' },
  ],
};
