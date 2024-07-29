import { Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import {
  DatabaseModule,
  LoggerModule,
  RequestLoggerMiddleware,
} from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { HttpModule } from '@nestjs/axios';
import { ClientsRepository } from './repository/clients.repository';
import { ConversationsRepository } from './repository/conversations.repository';
import { ClientDocument, ClientSchema } from './models/client.schema';
import {
  ConversationDocument,
  ConversationSchema,
} from './models/conversation.schema';
import { PrismaClient } from '@prisma/client';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from './prisma/prisma.service';
import { CryptModule } from '@app/common/crypt/crypt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        MONGODB_URI: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        S3_ACCESS_KEY: Joi.string().required(),
        S3_SECRET_ACCESS_KEY: Joi.string().required(),
        S3_REGION: Joi.string().required(),
        S3_BUCKET_NAME: Joi.string().required(),
      }),
    }),
    DatabaseModule.forRootAsync(
      'clientInteractions',
      (configService: ConfigService) =>
        `${configService.get<string>('MONGODB_URI')}/client-interactions`,
      [
        { name: ClientDocument.name, schema: ClientSchema },
        { name: ConversationDocument.name, schema: ConversationSchema },
      ],
    ),
    LoggerModule,
    HttpModule,
    CryptModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    ClientsRepository,
    ConversationsRepository,
    Logger,
    PrismaService,
    PrismaClient,
  ],
  exports: [ClientsRepository, ConversationsRepository],
})
export class WhatsappModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
