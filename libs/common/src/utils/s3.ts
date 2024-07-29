import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const getFileContent = async (
  bucket: string,
  key: string,
  client: S3Client,
): Promise<any> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    if (response.Body instanceof Readable) {
      const buffer = await streamToPromise(response.Body);

      const json = JSON.parse(buffer.toString('utf-8'));

      return json;
    } else {
      throw new Error('Unexpected response body type');
    }
  } catch (error) {
    console.error('Error getting JSON from S3:', error);
    throw error;
  }
};

const streamToPromise = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export const replaceParamsFromString = (
  value: string,
  search: string,
  replace: string,
): string => {
  return value.replace(search, replace);
};
