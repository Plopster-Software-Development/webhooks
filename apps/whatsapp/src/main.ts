import { NestFactory } from '@nestjs/core';
import { WhatsappModule } from './whatsapp.module';

async function bootstrap() {
  const app = await NestFactory.create(WhatsappModule);
  await app.listen(3000);
}
bootstrap();
