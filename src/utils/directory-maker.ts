import * as fs from 'fs/promises';
import * as path from 'path';
import { pino } from 'pino';
import { outdent } from 'outdent';

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

interface FileMetadata {
  sanitizedFileName: string;
  sanitizedTitle: string;
  awsImage: string;
  download: string;
}

class DirectoryMaker {
  private prefix: string;
  private awsLocation: string;
  private outputBasePath: string;

  /**
   * Creates a new DirectoryMaker instance
   * @param prefix - Prefix for AWS resources (e.g., mini, mgb)
   * @param awsLocation - Base URL for AWS resources
   * @param outputBasePath - Base path for output markdown files
   */
  constructor(
    prefix: string,
    awsLocation: string,
    outputBasePath: string = 'content/archive'
  ) {
    this.prefix = prefix;
    this.awsLocation = awsLocation;
    this.outputBasePath = outputBasePath;
  }

  /**
   * Process all files in the given directory and create corresponding markdown files
   * @param stagingFolder Path to the directory containing files to process
   * @returns Promise that resolves when all files have been processed
   */
  async createFilesFromDirectory(stagingFolder: string): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = path.join(
        process.cwd(),
        this.outputBasePath,
        this.prefix
      );
      await this.ensureDirectoryExists(outputDir);

      // Read directory contents
      const files = await fs.readdir(stagingFolder);

      // Process files in parallel
      const fileProcessingPromises = files.map((filename) =>
        this.processFile(filename, outputDir)
      );

      // Wait for all files to be processed
      await Promise.all(fileProcessingPromises);

      logger.info(
        `Successfully processed ${files.length} files from ${stagingFolder}`
      );
    } catch (error) {
      logger.error({ error }, `Failed to process directory: ${stagingFolder}`);
      throw error; // Re-throw to allow calling code to handle the error
    }
  }

  /**
   * Process a single file and create its markdown representation
   * @param filename Name of the file to process
   * @param outputDir Directory where the output markdown file will be saved
   */
  private async processFile(
    filename: string,
    outputDir: string
  ): Promise<void> {
    try {
      // Skip non-PDF files
      if (!filename.toLowerCase().endsWith('.pdf')) {
        logger.debug(`Skipping non-PDF file: ${filename}`);
        return;
      }

      // Extract metadata from filename
      const metadata = this.extractMetadata(filename);

      // Generate markdown content
      const contents = this.generateMarkdownContent(metadata);

      // Write markdown file
      const outputPath = path.join(
        outputDir,
        `${metadata.sanitizedFileName}.md`
      );
      await fs.writeFile(outputPath, contents);

      logger.info(`Created file: ${outputPath}`);
    } catch (error) {
      logger.error({ error, filename }, `Failed to process file: ${filename}`);
      throw error;
    }
  }

  /**
   * Extract metadata from a filename
   * @param filename Original filename
   * @returns Structured metadata object
   */
  private extractMetadata(filename: string): FileMetadata {
    const fileNameWithoutExt = filename
      .substring(0, filename.lastIndexOf('.'))
      .trim();

    const sanitizedFileName = fileNameWithoutExt
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '');

    const sanitizedTitle = fileNameWithoutExt;

    const awsImage = `${this.awsLocation}/${
      this.prefix
    }/images/${sanitizedTitle.replace(/\s+/g, '+')}.jpeg`;

    const download = `${this.awsLocation}/${
      this.prefix
    }/documents/${filename.replace(/\s+/g, '+')}`;

    return {
      sanitizedFileName,
      sanitizedTitle,
      awsImage,
      download,
    };
  }

  /**
   * Generate markdown content from file metadata
   * @param metadata File metadata
   * @returns Formatted markdown content
   */
  private generateMarkdownContent(metadata: FileMetadata): string {
    return outdent`
    ---
        title: ${metadata.sanitizedTitle}
        slug: ${metadata.sanitizedFileName}
        description:
        code: ${metadata.sanitizedFileName}
        image: ${metadata.awsImage}
        download: ${metadata.download}
    ---
    `;
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath Path to the directory
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      logger.error({ error, dirPath }, 'Failed to create directory');
      throw error;
    }
  }
}

export default DirectoryMaker;
