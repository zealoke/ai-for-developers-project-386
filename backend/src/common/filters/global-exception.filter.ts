import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../errors/domain-error';

/**
 * Глобальный фильтр исключений. Приводит любое брошенное исключение к
 * единому JSON-формату ошибок из specs/lib/errors.tsp:
 *
 *   { code: string, message: string, details?: [{field, message}] }
 *
 * Источники исключений:
 *  - `DomainError` (и наследники) — доменные ошибки с готовым code/status.
 *  - `ValidationException` — тело уже сформировано (VALIDATION_ERROR + details),
 *    но проходит через его как HttpException с response-object (см. ниже).
 *  - Прочие `HttpException` — унифицируются в {code, message}.
 *  - Всё остальное — 500 INTERNAL_ERROR + логирование stack-трейса.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.mapException(exception);

    if (status >= 500) {
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${request.method} ${request.url}] ${detail}`);
    }

    response.status(status).json(body);
  }

  private mapException(exception: unknown): {
    status: number;
    body: { code: string; message: string; details?: unknown[] };
  } {
    // 1) Доменные ошибки приложения — точный code+status+message.
    if (exception instanceof DomainError) {
      const resp = exception.getResponse() as { code: string; message: string };
      return { status: exception.getStatus(), body: { code: resp.code, message: resp.message } };
    }

    // 2) Прочие HttpException — унифицируем тело.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      return { status, body: this.normalizeHttpExceptionBody(resp, status) };
    }

    // 3) Не-HTTP исключения — 500.
    return {
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
  }

  private normalizeHttpExceptionBody(
    resp: string | object,
    status: number,
  ): { code: string; message: string; details?: unknown[] } {
    if (typeof resp === 'string') {
      return { code: httpCodeName(status), message: resp };
    }
    if (resp && typeof resp === 'object' && 'code' in resp && 'message' in resp) {
      // ValidationException и любыеContract- shaped ответы — пропускаем как есть.
      const out: { code: string; message: string; details?: unknown[] } = {
        code: String(resp.code),
        message: String(resp.message),
      };
      if ('details' in resp && Array.isArray(resp.details)) {
        out.details = resp.details;
      }
      return out;
    }
    // Default Nest shape для некастомизированных BadRequestException:
    // { message: string[], error: string } — превращаем в VALIDATION_ERROR
    // (это fallback-ветка; реальные DTO-валидации идут через ValidationException).
    if (resp && typeof resp === 'object' && 'message' in resp) {
      const m = resp.message;
      if (Array.isArray(m)) {
        return {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: m.map((x) => ({ field: '(unknown)', message: String(x) })),
        };
      }
      return { code: httpCodeName(status), message: String(m) };
    }
    return { code: httpCodeName(status), message: 'Request error' };
  }
}

function httpCodeName(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    default:
      return 'INTERNAL_ERROR';
  }
}
