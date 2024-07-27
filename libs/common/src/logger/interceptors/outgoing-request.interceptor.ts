import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger.service';
import { Types } from 'mongoose';

@Injectable()
export class OutgoingRequestInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      tap(async (data) => {
        const log = {
          _id: new Types.ObjectId(),
          method: request.method,
          url: request.originalUrl,
          headers: request.headers,
          body: request.body,
          response: data,
          statusCode: response.statusCode,
          responseTime: Date.now() - now,
          ip: request.ip,
          timestamp: new Date(),
          microservice: process.env.MICROSERVICE_NAME,
          direction: 'outgoing',
        };

        await this.loggerService.logRequest(log);
      }),
    );
  }
}
