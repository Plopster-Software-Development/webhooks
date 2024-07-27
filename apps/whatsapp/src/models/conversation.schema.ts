import { AbstractDocument } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ versionKey: false })
export class Message {
  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  messageStatus: string;
}

@Schema({ versionKey: false })
export class ConversationDocument extends AbstractDocument {
  @Prop({ type: Types.ObjectId, required: true, ref: 'ClientDocument' })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: false })
  endDate: Date;

  @Prop({ type: [Message], default: [] })
  message: Message[];
}

export const ConversationSchema =
  SchemaFactory.createForClass(ConversationDocument);
