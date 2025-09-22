import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';
import { pino } from 'pino';
import { promisify } from 'util';

// Convert callback-based fs methods to Promise-based for better async handling
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const exists = (path: string): Promise<boolean> =>
  new Promise((resolve) => fs.exists(path, resolve));

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
 * Configuration options for PDF to image conversion
 */
interface ConversionOptions {
  density: number;
  format: 'jpeg' | 'png';
  width: number;
  height?: number;
  preserveAspectRatio: boolean;
  page?: number;
}

/**
 * Handles the conversion of PDF files to image previews
 */
class ImagePreviewMaker {
  private readonly source: string;
  private readonly output: string;
  private readonly defaultOptions: ConversionOptions;

  /**
   * Creates a new ImagePreviewMaker instance
   * @param source - Directory containing PDF files to convert
   * @param output - Directory where image previews will be saved
   * @param options - Optional conversion parameters
   */
  constructor(
    source: string,
    output: string,
    options?: Partial<ConversionOptions>
  ) {
    this.source = source;
    this.output = output;
    this.defaultOptions = {
      density: 100,
      format: 'jpeg',
      width: 1024,
      preserveAspectRatio: true,
      ...options,
    };
  }

  /**
   * Ensures the output directory exists
   * @private
   */
  private async ensureOutputDirectoryExists(): Promise<void> {
    const directoryExists = await exists(this.output);
    if (!directoryExists) {
      logger.debug(`Creating output directory: ${this.output}`);
      await mkdir(this.output, { recursive: true });
    }
  }

  /**
   * Converts a single PDF file to an image
   * @param filePath - Path to the PDF file
   * @param outputFilePath - Path where the image will be saved
   * @param baseName - Base name of the file (without extension)
   * @private
   */
  private async convertPdfToImage(
    filePath: string,
    outputFilePath: string,
    baseName: string
  ): Promise<void> {
    const storeAsImage = fromPath(filePath, {
      ...this.defaultOptions,
      saveFilename: baseName,
      savePath: this.output,
    });

    const result = await storeAsImage(1);
    logger.info(
      `Converted ${path.basename(filePath)} to ${
        this.defaultOptions.format
      } successfully`
    );
    logger.debug(`Image saved at: ${result.path}`);

    // Rename file to remove page number in filename
    const tempFilePath = path.join(
      this.output,
      `${baseName}.1.${this.defaultOptions.format}`
    );
    await rename(tempFilePath, outputFilePath);
  }

  /**
   * Creates image previews for all PDF files in the source directory
   * @returns Promise that resolves when all conversions are complete
   */
  async createPreviews(): Promise<void> {
    try {
      await this.ensureOutputDirectoryExists();

      const files = await readdir(this.source);
      const pdfFiles = files.filter(
        (file) => path.extname(file).toLowerCase() === '.pdf'
      );

      if (pdfFiles.length === 0) {
        logger.info('No PDF files found in source directory');
        return;
      }

      logger.info(`Found ${pdfFiles.length} PDF files to convert`);

      // Process files sequentially to avoid memory issues with large PDFs
      for (const file of pdfFiles) {
        try {
          const filePath = path.join(this.source, file);
          const baseName = path.basename(file, '.pdf');
          const outputFilePath = path.join(
            this.output,
            `${baseName}.${this.defaultOptions.format}`
          );

          logger.info(`Converting ${file} to ${this.defaultOptions.format}`);
          await this.convertPdfToImage(filePath, outputFilePath, baseName);
        } catch (error) {
          logger.error({ file, error }, `Error converting ${file}`);
          // Continue with next file instead of stopping the entire process
        }
      }

      logger.info('PDF conversion process completed');
    } catch (error) {
      logger.error({ error }, 'Error in createPreviews');
      throw error;
    }
  }
}

export default ImagePreviewMaker;
