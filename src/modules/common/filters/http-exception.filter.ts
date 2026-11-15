import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = '操作失败';
    let errorCode = 'UNKNOWN_ERROR';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      if ('message' in exceptionResponse) {
        const exceptionMessage = exceptionResponse['message'];
        message = Array.isArray(exceptionMessage)
          ? exceptionMessage.join(', ')
          : String(exceptionMessage);
      }
      if ('error' in exceptionResponse) {
        errorCode = String(exceptionResponse['error']);
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    // 统一返回格式，与正常响应保持一致
    response.status(status).json({
      success: false,
      data: null,
      message,
      error: {
        code: errorCode,
        status,
        path: request.url,
      },
    });
  }
}
