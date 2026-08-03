import type { EventType } from '../../../src/api/types';

export const eventTypeConsultation: EventType = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Консультация',
  description: 'Обсуждение проекта, короткий созвон',
  durationMinutes: 30,
};

export const eventTypeInterview: EventType = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Собеседование',
  description: 'Техническое интервью с командой',
  durationMinutes: 60,
};

export const eventTypes: EventType[] = [eventTypeConsultation, eventTypeInterview];
