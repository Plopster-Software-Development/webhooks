import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  alias: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  phone: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  registerDate: Date;
}
