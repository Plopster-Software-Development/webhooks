// libs/common/src/logs/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger.service';
import { Types } from 'mongoose';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggerService: LoggerService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const log = {
      _id: new Types.ObjectId(),
      message: exception.message,
      stack: exception.stack,
      method: request.method,
      url: request.originalUrl,
      headers: request.headers,
      body: request.body,
      ip: request.ip,
      timestamp: new Date(),
      microservice: process.env.MICROSERVICE_NAME,
    };

    await this.loggerService.logError(log);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
