import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';

@Injectable()
export class GCSService {
  private storage: Storage;

  constructor() {
    this.storage = new Storage({
      keyFilename: path.resolve(process.cwd(), 'google-service.json'),
    });
  }

  async generateSignedUploadUrl(fileName: string, contentType: string) {
    const bucketName = 'stylhelpr-dev-bucket';
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return url;
  }
}
