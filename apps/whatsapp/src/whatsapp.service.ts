import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsRepository } from './repository/clients.repository';
import dialogflow, { SessionsClient } from '@google-cloud/dialogflow';
import { ConversationDocument } from './models/conversation.schema';
import { TwilioMessageDto } from './dto/twilio-message.dto';
import { Twilio } from 'twilio';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { S3Client } from '@aws-sdk/client-s3';
import { ConversationsRepository } from './repository/conversations.repository';
import { CryptService } from '@app/common/crypt/crypt.service';
import { getFileContent, replaceParamsFromString } from '@app/common/utils/s3';
import * as uuid from 'uuid';

interface BotCredentials {
  id: string;
  bot_id: string;
  twilioSID: string;
  twilioTK: string;
  gCredsCloud: string;
}

interface JWTInput {
  type?: string;
  client_email?: string;
  private_key?: string;
  private_key_id?: string;
  project_id?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  quota_project_id?: string;
  universe_domain?: string;
}

@Injectable()
export class WhatsappService {
  private dialogflowClient: SessionsClient;
  private twilioClient: any;
  private client: S3Client;
  private gCloudProjectId: any;
  private twilioPhoneNumber: string;
  private prisma: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationRepository: ConversationsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly logger: Logger,
    private readonly cryptService: CryptService,
  ) {
    this.prisma = new PrismaClient().$extends(withAccelerate());
    this.client = new S3Client({
      region: this.configService.get('S3_REGION'),
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  public async processMessage(webhookDto?: TwilioMessageDto) {
    try {
      const botId = await this.initializeKeys(webhookDto.To);

      const userBuffer = await this.findOrCreateUser(
        botId,
        webhookDto.ProfileName,
        replaceParamsFromString(webhookDto.From, 'whatsapp', ''),
      );

      const userId = this.turnBufferIntoString(userBuffer);

      const conversationBuffer = await this.findOrCreateConversation(
        botId,
        userId,
        webhookDto.Body,
      );

      const conversationId = this.turnBufferIntoString(conversationBuffer._id);

      if (conversationBuffer.found) {
        await this.updateConversation(conversationId, webhookDto.Body, 'user');
      }

      const dialogFlowResponse = await this.processDialogFlowMessage(
        webhookDto.Body,
        conversationId,
      );

      await this.updateConversation(
        conversationId,
        dialogFlowResponse.fulfillmentText,
        'bot',
      );

      return await this.sendWhatsAppMessage(
        webhookDto.From,
        dialogFlowResponse.fulfillmentText,
      );
    } catch (error) {
      console.log('processMessage ', error);
      throw error;
    }
  }

  private async initializeKeys(twilioPhoneNumber: string): Promise<string> {
    try {
      this.twilioPhoneNumber = twilioPhoneNumber;

      const botCredentials = await this.fetchBotCredentials(
        replaceParamsFromString(twilioPhoneNumber, 'whatsapp:', ''),
      );

      await this.prisma.$disconnect();

      const key = `google-cloud-credentials/${botCredentials.id}.json`;

      const credentials: JWTInput = await getFileContent(
        'gcloudcredsbot',
        key,
        this.client,
      );

      this.dialogflowClient = new dialogflow.SessionsClient({
        credentials: {
          type: credentials.type,
          project_id: credentials.project_id,
          private_key_id: credentials.private_key_id,
          private_key: credentials.private_key,
          client_email: credentials.client_email,
          client_id: credentials.client_id,
          universe_domain: credentials.universe_domain,
        },
      });

      this.gCloudProjectId = credentials.project_id;

      this.twilioClient = new Twilio(
        this.cryptService.decrypt(botCredentials.twilioSID, false),
        this.cryptService.decrypt(botCredentials.twilioTK, false),
      );

      return botCredentials.bot_id;
    } catch (error) {
      console.log('initializeKeys ', error);
    }
  }

  private async findOrCreateUser(
    botId: any,
    customerAlias: string,
    customerPhoneNo: string,
  ): Promise<any> {
    try {
      let user = await this.clientsRepository.findOne({
        phone: customerPhoneNo,
        botId: botId,
      });

      if (!user) {
        user = await this.clientsRepository.create({
          botId: botId,
          alias: customerAlias,
          phone: customerPhoneNo,
          registerDate: new Date(),
        });
      }

      return user._id;
    } catch (error) {
      console.log('findOrCreateUser ', error);
      throw new InternalServerErrorException('Failed to find or create user');
    }
  }

  private turnBufferIntoString(bufferObj: any): string {
    if (typeof bufferObj === 'object' && bufferObj.type === 'Buffer') {
      const buffer = Buffer.from(bufferObj.data);

      return [
        buffer.toString('hex', 0, 4),
        buffer.toString('hex', 4, 6),
        buffer.toString('hex', 6, 8),
        buffer.toString('hex', 8, 10),
        buffer.toString('hex', 10, 16),
      ].join('-');
    }

    return bufferObj.toString();
  }

  private async findOrCreateConversation(
    botId: string,
    userId: string,
    conversationMessage?: string,
  ): Promise<{ found: boolean; _id: string }> {
    try {
      const conversation = await this.conversationRepository.findOne({
        botId: botId,
        clientId: userId,
        endDate: { $exists: false },
      });

      if (!conversation || this.isConversationExpired(conversation)) {
        const conversationId = await this.createConversation(
          botId,
          userId,
          conversationMessage,
        );

        return { found: false, _id: conversationId };
      }

      return {
        found: true,
        _id: conversation._id,
      };
    } catch (error) {
      console.log('findOrCreateConversation ', error.message);
      throw new InternalServerErrorException(
        'Failed to find or create conversation',
      );
    }
  }

  private async createConversation(
    botId: string,
    userId: string,
    message: string,
  ): Promise<string> {
    try {
      const newConversation = await this.conversationRepository.create({
        botId: botId,
        clientId: userId,
        startDate: new Date(),
        message: [
          {
            messageId: uuid.v4(),
            timestamp: new Date(),
            author: 'user',
            content: message,
          },
        ],
      });

      return newConversation._id;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create conversation');
    }
  }

  private async processDialogFlowMessage(
    customerMessage: string,
    sessionId: string,
  ) {
    try {
      const sessionPath = this.dialogflowClient.projectAgentSessionPath(
        this.gCloudProjectId,
        sessionId,
      );

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: customerMessage,
            languageCode: 'en-US',
          },
        },
      };

      const responses = await this.dialogflowClient.detectIntent(request);

      return responses[0].queryResult;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        'Failed to process Dialogflow message',
      );
    }
  }

  private async updateConversation(
    conversationId: string,
    message: string | null,
    author: string,
  ) {
    try {
      return await this.conversationRepository.findOneAndUpdate(
        { _id: conversationId },
        {
          $push: {
            message: {
              messageId: uuid.v4(),
              timestamp: new Date(),
              author: author,
              content: message,
            },
          },
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        error,
        'Failed to update conversation with bot message',
      );
    }
  }

  private async sendWhatsAppMessage(
    customerPhoneNo: string,
    botMessage: string,
  ) {
    try {
      const messageRequest = {
        body: botMessage,
        from: this.twilioPhoneNumber,
        to: `${customerPhoneNo}`,
      };

      const message = await this.twilioClient.messages.create(messageRequest);

      return message;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Failed to send message via WhatsApp',
      );
    }
  }

  private isConversationAlive(startDate: Date): boolean {
    const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
    const timeDifference = Math.abs(startDate.getTime() - Date.now());
    return timeDifference <= MILLISECONDS_IN_A_DAY;
  }

  private async expireConversation(conversation: ConversationDocument) {
    try {
      await this.conversationRepository.findOneAndUpdate(
        { _id: conversation._id },
        { endDate: Date.now() },
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to expire conversation');
    }
  }

  private isConversationExpired(conversation: ConversationDocument): boolean {
    const userMessages = conversation.message.filter(
      (message) => message.author === 'user',
    );

    const lastUserMessage = userMessages[userMessages.length - 1];
    const isConversationAlive = this.isConversationAlive(
      lastUserMessage.timestamp,
    );

    if (!isConversationAlive) {
      this.expireConversation(conversation);
      return true;
    }

    return false;
  }

  private async fetchBotCredentials(
    twilioPhoneNumber: string,
  ): Promise<BotCredentials> {
    try {
      return await this.prisma.bot_credentials.findUnique({
        where: {
          twilioPhoneNumber: twilioPhoneNumber,
        },
        select: {
          id: true,
          bot_id: true,
          twilioSID: true,
          twilioTK: true,
          gCredsCloud: true,
        },
        cacheStrategy: { ttl: 60 },
      });
    } catch (error) {
      throw error;
    }
  }
}
