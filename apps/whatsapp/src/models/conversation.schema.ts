import { AbstractDocument } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ versionKey: false })
export class Message {
  @Prop({
    type: MongooseSchema.Types.UUID,
    default: uuidv4,
  })
  messageId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  content: string;
}

@Schema({ versionKey: false })
export class ConversationDocument extends AbstractDocument {
  @Prop({
    type: MongooseSchema.Types.UUID,
    required: true,
  })
  botId: string;

  @Prop({
    type: MongooseSchema.Types.UUID,
    required: true,
    ref: 'ClientDocument',
  })
  clientId: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ type: [Message], default: [] })
  message: Message[];
}

export const ConversationSchema =
  SchemaFactory.createForClass(ConversationDocument);
