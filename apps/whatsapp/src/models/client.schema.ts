import { AbstractDocument } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ versionKey: false })
export class ClientDocument extends AbstractDocument {
  @Prop({
    type: MongooseSchema.Types.UUID,
    required: true,
  })
  botId: string;

  @Prop({ required: true })
  alias: string;

  @Prop({ required: false })
  fullName?: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: false })
  billingAddress?: string;

  @Prop({ required: false })
  gender?: string;

  @Prop({ required: false })
  dniType?: string;

  @Prop({ required: false })
  dni?: string;

  @Prop({ default: Date.now })
  registerDate: Date;
}

export const ClientSchema = SchemaFactory.createForClass(ClientDocument);
