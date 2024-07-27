import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  getHello(): string {
    return 'Hello World!';
  }
}
