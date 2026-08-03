import createClient from 'openapi-fetch';
import type { paths } from './schema';

// Базовый URL берётся из переменной окружения VITE_API_BASE_URL (см. .env.example).
// В разработке это '/api', и запросы уходят через dev-прокси Vite (vite.config.ts).
// В проде — абсолютный адрес бэкенда.
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = createClient<paths>({ baseUrl });
