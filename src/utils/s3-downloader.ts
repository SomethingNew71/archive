import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { writeFile, mkdir } from 'fs/promises';
import path, { dirname } from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { pino } from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  level: process.env.LOG_LEVEL || 'info',
});

interface S3DownloaderConfig {
  region?: string;
  bucket: string;
  prefix?: string;
  localPath: string;
  maxKeys?: number;
}

export class S3Downloader {
  private config: S3DownloaderConfig & {
    region: string;
    prefix: string;
    maxKeys: number;
  };
  private s3Client: S3Client;

  constructor(config: S3DownloaderConfig) {
    const { ...restConfig } = config;

    // Initialize config with required fields
    this.config = {
      region: restConfig.region || 'us-east-1',
      bucket: restConfig.bucket,
      prefix: restConfig.prefix || '',
      localPath: restConfig.localPath,
      maxKeys: restConfig.maxKeys || 1000,
    };

    // Add any additional config properties
    Object.assign(this.config, restConfig);

    this.s3Client = new S3Client({
      region: this.config.region,
    });
  }

  /**
   * Lists all objects in the specified S3 bucket/prefix
   */
  public async listObjects(): Promise<string[]> {
    const objects: string[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: this.config.prefix,
          ContinuationToken: continuationToken,
          MaxKeys: this.config.maxKeys,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          response.Contents.forEach(({ Key }) => {
            if (Key) objects.push(Key);
          });
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      logger.info(
        `Found ${objects.length} objects in s3://${this.config.bucket}/${this.config.prefix}`
      );
      return objects;
    } catch (error) {
      logger.error({ error }, 'Error listing S3 objects');
      throw error;
    }
  }

  /**
   * Checks if a key represents a directory (ends with /)
   */
  private isDirectory(key: string): boolean {
    return key.endsWith('/');
  }

  /**
   * Downloads a single file from S3
   */
  private async downloadFile(key: string): Promise<void> {
    try {
      // Skip directories
      if (this.isDirectory(key)) {
        logger.debug(`Skipping directory: ${key}`);
        return;
      }

      const filePath = path.join(this.config.localPath, key);
      await this.ensureDirectoryExists(path.dirname(filePath));

      logger.info(`Downloading ${key} to ${filePath}`);
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (response.Body instanceof Readable) {
        const fileStream = response.Body;
        const chunks: Buffer[] = [];

        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }

        await writeFile(filePath, Buffer.concat(chunks));
        logger.info(`Successfully downloaded ${key}`);
      } else {
        throw new Error('Unexpected response body type');
      }
    } catch (error) {
      logger.error({ error, key }, 'Error downloading file');
      throw error;
    }
  }

  /**
   * Ensures that a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(directoryPath: string): Promise<void> {
    try {
      await mkdir(directoryPath, { recursive: true });
    } catch (error: any) {
      // Handle the case where the directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Downloads all files from the specified S3 bucket/prefix
   */
  public async downloadAll(): Promise<void> {
    try {
      const objects = await this.listObjects();

      if (objects.length === 0) {
        logger.warn('No files found to download');
        return;
      }

      logger.info(`Starting download of ${objects.length} files...`);

      // Process files in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < objects.length; i += batchSize) {
        const batch = objects.slice(i, i + batchSize);
        await Promise.all(batch.map((key) => this.downloadFile(key)));
      }

      logger.info('Download completed successfully');
    } catch (error) {
      logger.error({ error }, 'Error during download process');
      throw error;
    }
  }
}

// Export a default instance for convenience
export default S3Downloader;
