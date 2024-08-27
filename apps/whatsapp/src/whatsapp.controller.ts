import { All, Body, Controller, Get } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { TwilioMessageDto } from './dto/twilio-message.dto';

@Controller('webhook')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('ping')
  async handlePing() {
    return 'pong';
  }

  @All('whatsapp')
  async handleWebhook(@Body() webhookDto?: TwilioMessageDto): Promise<any> {
    try {
      return await this.whatsappService.processMessage(webhookDto);
    } catch (error) {
      console.log(
        `Error returned to Controller`,
        JSON.stringify(error),
        error,
        error.message,
      );
    }
  }
}
