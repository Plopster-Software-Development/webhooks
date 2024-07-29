import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsRepository } from './repository/clients.repository';
import dialogflow, { SessionsClient } from '@google-cloud/dialogflow';
import { Types } from 'mongoose';
import { ConversationDocument } from './models/conversation.schema';
import { TwilioMessageDto } from './dto/twilio-message.dto';
import { Twilio } from 'twilio';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { S3Client } from '@aws-sdk/client-s3';
import { ConversationsRepository } from './repository/conversations.repository';
import { CryptService } from '@app/common/crypt/crypt.service';
import { getFileContent, replaceParamsFromString } from '@app/common/utils/s3';

interface BotCredentials {
  id: string;
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
      await this.initializeKeys(webhookDto.To);

      const userId = await this.findOrCreateUser(
        webhookDto.ProfileName,
        replaceParamsFromString(webhookDto.From, 'whatsapp', ''),
      );

      const conversationId = await this.findOrCreateConversation(
        userId,
        webhookDto.Body,
      );

      if (conversationId.found) {
        await this.updateConversation(
          conversationId._id,
          webhookDto.Body,
          'user',
        );
      }

      const dialogFlowResponse = await this.processDialogFlowMessage(
        webhookDto.Body,
        conversationId._id.toString(),
      );

      await this.updateConversation(
        conversationId._id,
        dialogFlowResponse.fulfillmentText,
        'bot',
      );

      return await this.sendWhatsAppMessage(
        webhookDto.From,
        dialogFlowResponse.fulfillmentText,
      );
    } catch (error) {
      throw error;
    }
  }

  private async initializeKeys(twilioPhoneNumber: string) {
    try {
      this.twilioPhoneNumber = twilioPhoneNumber;
      const botCredentials = await this.fetchBotCredentials(
        replaceParamsFromString(twilioPhoneNumber, 'whatsapp:', ''),
      );

      const key = `google-cloud-credentials/${botCredentials.id}.json`;

      const credentials: JWTInput = await getFileContent(
        'gcloudcredsbot',
        key,
        this.client,
      );

      this.dialogflowClient = new dialogflow.SessionsClient({
        credentials: credentials,
      });

      this.gCloudProjectId = credentials.project_id;

      this.twilioClient = new Twilio(
        this.cryptService.decrypt(botCredentials.twilioSID, false),
        this.cryptService.decrypt(botCredentials.twilioTK, false),
      );
    } catch (error) {
      console.log(error);
    }
  }

  private async findOrCreateUser(
    customerAlias: string,
    customerPhoneNo: string,
  ): Promise<Types.ObjectId> {
    try {
      let user = await this.clientsRepository.findOne({
        phone: customerPhoneNo,
      });

      if (!user) {
        user = await this.clientsRepository.create({
          alias: customerAlias,
          fullName: null,
          email: null,
          phone: customerPhoneNo,
          billingAddress: null,
          gender: null,
          dniType: null,
          dni: null,
          registerDate: new Date(),
        });
      }

      return user._id;
    } catch (error) {
      throw new InternalServerErrorException('Failed to find or create user');
    }
  }

  private async findOrCreateConversation(
    userId: Types.ObjectId,
    conversationMessage?: string,
  ): Promise<{ found: boolean; _id: Types.ObjectId }> {
    try {
      const conversation = await this.conversationRepository.findOne({
        clientId: userId,
      });

      if (!conversation || this.isConversationExpired(conversation)) {
        const conversationId = await this.createConversation(
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
      throw new InternalServerErrorException(
        'Failed to find or create conversation',
      );
    }
  }

  private async createConversation(
    userId: Types.ObjectId,
    message: string,
  ): Promise<Types.ObjectId> {
    try {
      const newConversation = await this.conversationRepository.create({
        clientId: userId,
        startDate: new Date(),
        endDate: null,
        message: [
          {
            messageId: new Types.ObjectId(),
            timestamp: new Date(),
            author: 'user',
            content: message,
            messageStatus: '',
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
    conversationId: Types.ObjectId,
    message: string | null,
    author: string,
  ) {
    try {
      await this.conversationRepository.findOneAndUpdate(
        { _id: conversationId },
        {
          $push: {
            message: {
              messageId: new Types.ObjectId(),
              timestamp: new Date(),
              author: author,
              content: message,
            },
          },
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
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

  private async expireConversation(conversationId: Types.ObjectId) {
    try {
      await this.conversationRepository.findOneAndUpdate(
        { _id: conversationId },
        { endDate: Date.now() },
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to expire conversation');
    }
  }

  private isConversationExpired(conversation: ConversationDocument): boolean {
    //todo: puede existir mas de una conversacion 1 viva muchas muertas

    if (conversation.endDate) {
      return true;
    }

    const userMessages = conversation.message.filter(
      (message) => message.author === 'user',
    );

    const lastUserMessage = userMessages[userMessages.length - 1];
    const isConversationAlive = this.isConversationAlive(
      lastUserMessage.timestamp,
    );

    if (!isConversationAlive) {
      this.expireConversation(conversation._id);
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
          twilioSID: true,
          twilioTK: true,
          gCredsCloud: true,
        },
        cacheStrategy: { ttl: 60 },
      });
    } catch (error) {
      throw error;
    } finally {
      // En aplicaciones de producción, considera mover el manejo de la conexión de Prisma a otro lugar
      await this.prisma.$disconnect();
    }
  }
}
