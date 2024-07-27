import { SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false })
export class RequestLogDocument {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @Prop()
  method: string;

  @Prop()
  url: string;

  @Prop({ type: Object })
  headers: Record<string, any>;

  @Prop({ type: Object })
  body: Record<string, any>;

  @Prop({ type: Object })
  response: Record<string, any>;

  @Prop()
  statusCode: number;

  @Prop()
  responseTime: number;

  @Prop()
  ip: string;

  @Prop()
  timestamp: Date;

  @Prop()
  microservice: string;

  @Prop()
  direction: string;
}

export const RequestLogSchema =
  SchemaFactory.createForClass(RequestLogDocument);
