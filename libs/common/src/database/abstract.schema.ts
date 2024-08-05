import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import * as uuid from 'uuid';

@Schema()
export class AbstractDocument {
  @Prop({ type: MongooseSchema.Types.UUID, default: uuid.v4() })
  _id: string;
}
