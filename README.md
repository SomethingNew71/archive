# Classic Mini DIY Archive

A TypeScript-based CLI tool project that processes PDF documents into web-ready content for the main Classic Mini DIY website. This repository serves as both a content management system for automotive documentation and a set of utilities for processing that content.

> Note: You must also update the [content.config.ts](https://github.com/Classic-Mini-DIY/classicminidiy/blob/main/content.config.ts) in the main repo as well when creating new collections

## Architecture

The project consists of:

1. **Content Repository**: Markdown files organized in `content/archive/` with subdirectories for adverts, catalogues, manuals, and tuning documentation
2. **CLI Tools**: TypeScript utilities for processing PDF files, generating previews, and managing S3 content
3. **Wiring Diagrams**: WireViz integration for generating technical diagrams

## Development

### Setup
```bash
npm install
npm run build
```

### CLI Commands
```bash
# Generate image previews from PDFs
archive-tools generate-previews --source ./pdfs --output ./images

# Generate markdown files for web content
archive-tools generate-markdown --source ./pdfs --output ./content/archive/manuals --aws-location https://bucket.s3.amazonaws.com --prefix mini

# Download files from S3
archive-tools s3-download --bucket bucket-name --prefix path/ --output ./downloads
```

### Build Commands
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run the CLI tool (requires build first)
- `npm run prepare` - Build project (runs automatically on install)

## File Structure

The repository structure aligns with website URL paths:

```plaintext
content/archive/manuals/ADK1152.md → https://classicminidiy.com/archive/manuals/ADK1152
```

Content is organized into:
- `adverts/` - Classic Mini advertisements
- `catalogues/` - Parts catalogues and documentation
- `manuals/` - Technical manuals and guides
- `tuning/` - Engine tuning maps and technical data

## Integration

This repository feeds content to the main Classic Mini DIY Nuxt.js website via Nuxt Content. Changes here are automatically consumed by the main website.

## Contact

For any questions or issues, please contact [classicminidiy@gmail.com](mailto:classicminidiy@gmail.com).
