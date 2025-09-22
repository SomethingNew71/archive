#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import ImagePreviewMaker from "./utils/image-preview-maker.js";
import DirectoryMaker from "./utils/directory-maker.js";
import S3Downloader from "./utils/s3-downloader.js";
import S3Uploader from "./utils/s3-uploader.js";
import { pino } from "pino";

// Configure logger
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
  level: process.env.LOG_LEVEL || "info",
});

const program = new Command();

program
  .name("archive-tools")
  .description("CLI tools for processing archive content")
  .version("1.0.0");

// Generate PDF Previews command
program
  .command("generate-previews")
  .description("Generate image previews from PDF files")
  .option(
    "--source <path>",
    "Source directory containing PDF files",
    path.join(process.cwd(), "pdfs/pdfSource"),
  )
  .option(
    "--output <path>",
    "Output directory for generated images",
    path.join(process.cwd(), "pdfs/pdfOutput"),
  )
  .option(
    "--image-format <format>",
    "Output image format (jpeg or png)",
    "jpeg",
  )
  .option("--image-width <pixels>", "Output image width", "1024")
  .option(
    "--image-height <pixels>",
    "Output image height (optional, preserves aspect ratio if not specified)",
  )
  .option(
    "--preserve-aspect-ratio",
    "Preserve original aspect ratio (default: true)",
    true,
  )
  .action(async (options) => {
    try {
      const {
        source,
        output,
        imageFormat,
        imageWidth,
        imageHeight,
        preserveAspectRatio,
      } = options;

      logger.info("Starting image preview generation...");
      const conversionOptions: any = {
        format: imageFormat,
        width: parseInt(imageWidth, 10),
        preserveAspectRatio: preserveAspectRatio,
      };

      // Only set height if explicitly provided
      if (imageHeight) {
        conversionOptions.height = parseInt(imageHeight, 10);
      }

      const imageMaker = new ImagePreviewMaker(
        source,
        output,
        conversionOptions,
      );

      await imageMaker.createPreviews();
      logger.info("Image preview generation completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error(error, "An error occurred during image preview generation");
      process.exit(1);
    }
  });

// Generate Markdown command
program
  .command("generate-markdown")
  .description("Generate markdown files for PDF documents")
  .requiredOption("--source <path>", "Source directory containing PDF files")
  .requiredOption("--output <path>", "Base output directory for markdown files")
  .requiredOption("--aws-location <url>", "Base URL for AWS resources")
  .requiredOption(
    "--prefix <name>",
    "Prefix for AWS resources (e.g., mini, mgb)",
  )
  .action(async (options) => {
    try {
      const { source, output, awsLocation, prefix } = options;
      logger.info("Starting markdown generation...");
      const directoryMaker = new DirectoryMaker(prefix, awsLocation, output);
      await directoryMaker.createFilesFromDirectory(source);
      logger.info("Markdown generation completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error(error, "An error occurred during markdown generation");
      process.exit(1);
    }
  });

// S3 Download command
program
  .command("s3-download")
  .description("Download files from an S3 bucket")
  .requiredOption("--bucket <name>", "S3 bucket name")
  .option("--prefix <prefix>", "S3 prefix (directory path)", "")
  .option("--region <region>", "AWS region", "us-east-1")
  .option("--output <path>", "Local output directory", "./downloads")
  .option("--max-keys <number>", "Maximum number of keys to retrieve", "1000")
  .action(async (options) => {
    try {
      const { bucket, prefix, region, output, maxKeys } = options;

      logger.info(
        `Starting S3 download from s3://${bucket}/${prefix} to ${output}`,
      );

      const downloader = new S3Downloader({
        bucket,
        prefix,
        region,
        localPath: output,
        maxKeys: parseInt(maxKeys, 10),
      });

      await downloader.downloadAll();
      logger.info("S3 download completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error(error, "Error during S3 download");
      process.exit(1);
    }
  });

// S3 Upload command
program
  .command("s3-upload")
  .description("Upload PDFs and images to S3 bucket with proper folder structure")
  .option("--bucket <name>", "S3 bucket name", "cmdiy-archive")
  .option("--region <region>", "AWS region", "us-east-1")
  .option(
    "--source <path>",
    "Local source directory containing PDFs and images",
    "./pdfs",
  )
  .option("--category <name>", "Default category for files (manuals, catalogues, adverts, tuning)", "misc")
  .option("--dry-run", "Show what would be uploaded without actually uploading", false)
  .action(async (options) => {
    try {
      const { bucket, region, source, category, dryRun } = options;

      logger.info(
        `Starting S3 upload from ${source} to s3://${bucket}${dryRun ? " (DRY RUN)" : ""}`,
      );

      const uploader = new S3Uploader({
        bucket,
        region,
        localPath: source,
        defaultCategory: category,
        dryRun,
      });

      await uploader.uploadAll();
      logger.info("S3 upload completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error(error, "Error during S3 upload");
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
