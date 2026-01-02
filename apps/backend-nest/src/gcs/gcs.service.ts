import { Injectable, BadRequestException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';

// Allowed image MIME types for upload (security whitelist)
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Maximum upload size: 5MB (enforced via signed URL)
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable()
export class GCSService {
  private storage: Storage;

  constructor() {
    this.storage = new Storage({
      keyFilename: path.resolve(
        process.cwd(),
        'stylhelpr-prod-12ff0cbcc3ed.json',
      ),
    });
  }

  async generateSignedUploadUrl(fileName: string, contentType: string) {
    // Enforce MIME type whitelist
    const normalizedType = (contentType || 'image/jpeg').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
      throw new BadRequestException(
        `Invalid content type: ${contentType}. Allowed: image/jpeg, image/png, image/webp`,
      );
    }

    const bucketName = 'stylhelpr-prod-bucket';
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: normalizedType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${MAX_UPLOAD_BYTES}`,
      },
    });

    return url;
  }
}
