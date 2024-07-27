import { SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false })
export class ErrorLogDocument {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @Prop()
  message: string;

  @Prop()
  stack: string;

  @Prop()
  method: string;

  @Prop()
  url: string;

  @Prop({ type: Object })
  headers: Record<string, any>;

  @Prop({ type: Object })
  body: Record<string, any>;

  @Prop()
  ip: string;

  @Prop()
  timestamp: Date;

  @Prop()
  microservice: string;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLogDocument);
