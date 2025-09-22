import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { pino } from 'pino';
import { promisify } from 'util';

// Convert callback-based fs methods to Promise-based for better async handling
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Configure logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * Configuration options for S3 upload
 */
interface UploadOptions {
  bucket: string;
  region: string;
  localPath: string;
  defaultCategory?: string;
  dryRun?: boolean;
}

/**
 * Handles uploading files to S3 bucket with proper folder structure
 */
class S3Uploader {
  private readonly s3Client: S3Client;
  private readonly options: UploadOptions;

  /**
   * Creates a new S3Uploader instance
   * @param options - Upload configuration options
   */
  constructor(options: UploadOptions) {
    this.options = options;
    this.s3Client = new S3Client({ region: options.region });
  }

  /**
   * Gets the MIME type for a file based on its extension
   * @param filePath - Path to the file
   * @returns MIME type string
   * @private
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Determines the S3 key (path) for a file based on file type and category
   * @param fileName - Name of the file
   * @param category - Category for the file (manuals, catalogues, adverts, tuning, etc.)
   * @returns S3 key string
   * @private
   */
  private getS3Key(fileName: string, category: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const isPdf = ext === '.pdf';
    const subfolder = isPdf ? 'documents' : 'images';

    return `${category}/${subfolder}/${fileName}`;
  }

  /**
   * Uploads a single file to S3
   * @param localFilePath - Full local path to the file
   * @param relativeFilePath - Relative path from the base directory
   * @private
   */
  private async uploadFile(localFilePath: string, relativeFilePath: string): Promise<void> {
    try {
      const fileName = path.basename(localFilePath);
      const category = this.options.defaultCategory || 'misc';
      const s3Key = this.getS3Key(fileName, category);

      if (this.options.dryRun) {
        logger.info(`[DRY RUN] Would upload: ${localFilePath} -> s3://${this.options.bucket}/${s3Key}`);
        return;
      }

      const fileContent = await readFile(localFilePath);
      const contentType = this.getMimeType(localFilePath);

      const command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      logger.info(`Uploaded: ${localFilePath} -> s3://${this.options.bucket}/${s3Key}`);
    } catch (error) {
      logger.error({ localFilePath, error }, `Failed to upload ${localFilePath}`);
      throw error;
    }
  }

  /**
   * Recursively walks through directory and finds files to upload
   * @param dirPath - Directory path to walk
   * @param basePath - Base path for calculating relative paths
   * @param validExtensions - Set of valid file extensions
   * @returns Array of file paths with their relative paths
   * @private
   */
  private async walkDirectory(
    dirPath: string,
    basePath: string,
    validExtensions: Set<string>
  ): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const files: Array<{ fullPath: string; relativePath: string }> = [];

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          const subFiles = await this.walkDirectory(fullPath, basePath, validExtensions);
          files.push(...subFiles);
        } else if (stats.isFile()) {
          const ext = path.extname(entry).toLowerCase();
          if (validExtensions.has(ext)) {
            const relativePath = path.relative(basePath, dirPath);
            files.push({ fullPath, relativePath: path.join(relativePath, entry) });
          }
        }
      }
    } catch (error) {
      logger.error({ dirPath, error }, `Error walking directory ${dirPath}`);
      throw error;
    }

    return files;
  }

  /**
   * Uploads all PDF and image files from the local path to S3
   * @returns Promise that resolves when all uploads are complete
   */
  async uploadAll(): Promise<void> {
    try {
      logger.info(`Starting upload from ${this.options.localPath} to s3://${this.options.bucket}`);

      if (this.options.dryRun) {
        logger.info('DRY RUN MODE - No files will actually be uploaded');
      }

      // Define valid file extensions
      const validExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']);

      // Walk through the directory structure
      const files = await this.walkDirectory(
        this.options.localPath,
        this.options.localPath,
        validExtensions
      );

      if (files.length === 0) {
        logger.info('No valid files found to upload');
        return;
      }

      logger.info(`Found ${files.length} files to upload`);

      // Upload files sequentially to avoid overwhelming S3
      for (const file of files) {
        await this.uploadFile(file.fullPath, file.relativePath);
      }

      logger.info(`Upload completed successfully. Processed ${files.length} files.`);
    } catch (error) {
      logger.error({ error }, 'Error during upload process');
      throw error;
    }
  }
}

export default S3Uploader;