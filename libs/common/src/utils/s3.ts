import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// interface JWTInput {
//   type?: string;
//   client_email?: string;
//   private_key?: string;
//   private_key_id?: string;
//   project_id?: string;
//   client_id?: string;
//   client_secret?: string;
//   refresh_token?: string;
//   quota_project_id?: string;
//   universe_domain?: string;
// }

export const getFileContent = async (client, key: string): Promise<any> => {
  try {
    const command = new GetObjectCommand({
      Bucket: 'gcloudcredsbot',
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
