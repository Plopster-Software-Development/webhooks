import { Injectable } from '@nestjs/common';
import { Payload } from './interfaces/payload.interface';
import { createDecipheriv, Decipher } from 'crypto';
import { DecryptException } from './exceptions/decrypt.exception';

@Injectable()
export class CryptService {
  private readonly cipherAlgorithm: string;

  constructor(private readonly keys: Buffer[]) {
    this.cipherAlgorithm = 'aes-256-cbc';
  }

  public decrypt(payload: string, unserialize = true): any {
    const payloadObj: Payload = JSON.parse(
      Buffer.from(payload, 'base64').toString(),
    );

    const iv = Buffer.from(payloadObj.iv, 'base64');

    let decrypted: string | false = false;

    for (const key of this.keys) {
      const decipher: Decipher = createDecipheriv(
        this.cipherAlgorithm,
        key,
        iv,
      );

      let decryptedBuffer = decipher.update(payloadObj.value, 'base64');
      decryptedBuffer = Buffer.concat([decryptedBuffer, decipher.final()]);

      decrypted = decryptedBuffer.toString();
      break;
    }

    if (!decrypted) {
      throw new DecryptException('Could not decrypt the data.');
    }

    return unserialize ? JSON.parse(decrypted) : decrypted;
  }
}
