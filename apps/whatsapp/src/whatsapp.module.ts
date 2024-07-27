import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
