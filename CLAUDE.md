# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Classic Mini DIY Archive repository - a TypeScript-based CLI tool project that processes PDF documents into web-ready content for the main Classic Mini DIY website. The repository serves as both a content management system for automotive documentation and a set of utilities for processing that content.

## Architecture

The project consists of:

1. **Content Repository**: Markdown files organized in `content/archive/` with subdirectories:
   - `adverts/` - Classic Mini advertisements
   - `catalogues/` - Parts catalogues and documentation
   - `manuals/` - Technical manuals and guides
   - `tuning/` - Engine tuning maps and technical data

2. **CLI Tools**: TypeScript utilities in `src/` for processing PDF files:
   - `cli.ts` - Main CLI interface using Commander.js
   - `utils/` - Core processing modules:
     - `s3-downloader.ts` - Downloads files from AWS S3
     - `image-preview-maker.ts` - Converts PDFs to image previews using pdf2pic
     - `directory-maker.ts` - Generates markdown files from PDF metadata

3. **Build System**: ESNext TypeScript compilation with output to `dist/`

## Development Commands

### Core Development
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run the CLI tool (requires build first)
- `npm run prepare` - Build project (runs automatically on install)

### CLI Tool Usage
The built CLI tool `archive-tools` provides three main commands:

```bash
# Generate image previews from PDFs
archive-tools generate-previews --source ./pdfs --output ./images

# Generate markdown files for web content
archive-tools generate-markdown --source ./pdfs --output ./content/archive/manuals --aws-location https://bucket.s3.amazonaws.com --prefix mini

# Download files from S3
archive-tools s3-download --bucket bucket-name --prefix path/ --output ./downloads
```

## File Structure & Conventions

### Content Organization
- Content files in `content/archive/` mirror the website URL structure
- Example: `content/archive/manuals/ADK1152.md` → `https://classicminidiy.com/archive/manuals/ADK1152`
- Each markdown file represents a single document with metadata and links to PDF/image resources

### TypeScript Configuration
- Uses ESNext modules with ES module interop
- Strict type checking enabled
- Output directory: `dist/`
- Source directory: `src/`

### Dependencies
- **AWS SDK v3** for S3 operations
- **Commander.js** for CLI interface
- **pdf2pic** for PDF to image conversion
- **Pino** for structured logging

## Integration with Main Website

This repository feeds content to the main Classic Mini DIY Nuxt.js website. Changes here require updating the `content.config.ts` file in the main repository to recognize new content collections.

## Development Workflow

1. Add new PDF documents to appropriate directories
2. Use CLI tools to generate previews and markdown files
3. Content is automatically consumed by the main website via Nuxt Content
4. All builds use TypeScript strict mode and require clean compilation