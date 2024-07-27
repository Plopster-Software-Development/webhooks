import { Module } from '@nestjs/common';
import { CryptService } from './crypt.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: CryptService,
      useFactory: (configService: ConfigService) => {
        const keys = [
          Buffer.from(configService.get<string>('APP_KEY'), 'base64'),
        ];
        return new CryptService(keys);
      },
      inject: [ConfigService],
    },
  ],
  exports: [CryptService],
})
export class CryptModule {}
