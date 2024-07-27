import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerService } from './logger.service';
import { ErrorLogDocument, ErrorLogSchema } from './models/error-log.schema';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import {
  RequestLogDocument,
  RequestLogSchema,
} from './models/request-log.schema';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            prettyPrint: {
              translateTime: 'SYS:HH:mm:ss.l',
            },
          },
        },
      },
    }),
    DatabaseModule.forRootAsync(
      'loggingConnection',
      (configService: ConfigService) =>
        `${configService.get<string>('MONGODB_URI')}/logging-system`,
      [
        { name: ErrorLogDocument.name, schema: ErrorLogSchema },
        { name: RequestLogDocument.name, schema: RequestLogSchema },
      ],
    ),
  ],
  providers: [
    LoggerService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
