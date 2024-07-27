import { IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class Origin {
  @IsString()
  type: string;
}

class Conversation {
  @IsString()
  id: string;

  @IsString()
  expiration_timestamp: string;

  @ValidateNested()
  @Type(() => Origin)
  origin: Origin;
}

class Pricing {
  @IsBoolean()
  billable: boolean;

  @IsString()
  pricing_model: string;

  @IsString()
  category: string;
}

class Status {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsString()
  timestamp: string;

  @IsString()
  recipient_id: string;

  @ValidateNested()
  @Type(() => Conversation)
  conversation: Conversation;

  @ValidateNested()
  @Type(() => Pricing)
  pricing: Pricing;
}

class Metadata {
  @IsString()
  display_phone_number: string;

  @IsString()
  phone_number_id: string;
}

class Value {
  @IsString()
  messaging_product: string;

  @ValidateNested()
  @Type(() => Metadata)
  metadata: Metadata;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Status)
  statuses: Status[];
}

class Change {
  @ValidateNested()
  @Type(() => Value)
  value: Value;

  @IsString()
  field: string;
}

class Entry {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Change)
  changes: Change[];
}

export class WhatsappStatusDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Entry)
  entry: Entry[];
}
