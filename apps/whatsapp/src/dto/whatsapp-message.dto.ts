import { IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class ProfileDto {
  @IsString()
  name?: string;
}

class ContactDto {
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @IsString()
  wa_id?: string;
}

class TextDto {
  @IsString()
  body?: string;
}

class MessageDto {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @IsString()
  type: string;

  audio?: any;

  @ValidateNested()
  @Type(() => TextDto)
  text?: TextDto;
}

class MetadataDto {
  @IsString()
  display_phone_number?: string;

  @IsString()
  phone_number_id?: string;
}

export class ValueDto {
  @IsString()
  messaging_product?: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages?: MessageDto[];
}

export class ChangesDto {
  @ValidateNested()
  @Type(() => ValueDto)
  value?: ValueDto;

  @IsString()
  field?: string;
}

class EntryDto {
  @IsString()
  id?: string;

  @ValidateNested({ each: true })
  @Type(() => ChangesDto)
  changes?: ChangesDto[];
}

export class WhatsappMessageDTO {
  @IsString()
  @IsOptional()
  object?: string;

  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  entry?: EntryDto[];
}
