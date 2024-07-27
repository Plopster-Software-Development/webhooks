import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappController', () => {
  let whatsappController: WhatsappController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [WhatsappService],
    }).compile();

    whatsappController = app.get<WhatsappController>(WhatsappController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(whatsappController.getHello()).toBe('Hello World!');
    });
  });
});
