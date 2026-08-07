/**
 * Глобальный setup для всех тестов.
 *
 * 1) Подключаем `reflect-metadata` — нужно для NestJS DI и class-validator
 *    даже в unit-тестах, которые не поднимают full HTTP-сервер.
 *
 * 2) Гасим шум NestJS logger в тестах (контролируем вывод сами по ASSERT).
 *    Не трогаем logger полностью, иначе при отладке сложновато будет
 *    искать причину 5xx. Уровень WARN/ERROR оставляем видимой.
 */
import 'reflect-metadata';

// Suppress NestJS log noise in tests (errors/warns оставляем — они важны при разборе падений).
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
