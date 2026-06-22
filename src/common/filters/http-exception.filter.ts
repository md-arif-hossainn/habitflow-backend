import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = statusToCode(status);
    let message = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        code = body.code ?? code;
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? message);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({ success: false, error: { code, message } });
  }
}

function statusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    410: 'GONE',
    422: 'UNPROCESSABLE',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
  };
  return map[status] ?? 'SERVER_ERROR';
}
