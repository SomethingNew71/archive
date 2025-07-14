# Archive Tools

This directory contains CLI tools for processing PDF files into web-ready content for the Classic Mini DIY archive.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. (Optional) Install the tool globally:
   ```bash
   npm link
   ```

## Commands

### S3 Download

Download files from an S3 bucket to a local directory.

```bash
# Basic usage
archive-tools s3-download --bucket your-bucket-name --prefix path/to/files/
```

```bash
# With custom output directory and region
archive-tools s3-download \
  --bucket your-bucket-name \
  --prefix path/to/files/ \
  --region us-west-2 \
  --output ./local-downloads
```

```bash
# Limit number of files to download
archive-tools s3-download \
  --bucket your-bucket-name \
  --max-keys 100
```

### Options

- `--bucket`: (Required) S3 bucket name
- `--prefix`: S3 prefix (directory path), defaults to empty string
- `--region`: AWS region, defaults to 'us-east-1'
- `--output`: Local output directory, defaults to './downloads'
- `--max-keys`: Maximum number of keys to retrieve, defaults to 1000

### Generate PDF Previews

Convert PDF files to image previews. By default, it looks for PDFs in `./pdfSource` and outputs images to `./pdfOutput`.

```bash
# With default directories
archive-tools generate-previews
```

```bash
# With custom directories
archive-tools generate-previews \
  --source ./path/to/pdf/files \
  --output ./output/images \
  --image-format jpeg \
  --image-width 1024 \
  --image-height 1024
```

### Options

- `--source`: Source directory containing PDF files (default: `./pdfSource`)
- `--output`: Output directory for generated images (default: `./pdfOutput`)
- `--image-format`: Output image format (jpeg or png, default: jpeg)
- `--image-width`: Output image width in pixels (default: 1024)
- `--image-height`: Output image height in pixels (default: 1024)

### Generate Markdown Files

Create markdown files for PDF documents.

```bash
archive-tools generate-markdown \
  --source ./path/to/pdf/files \
  --output ./content/archive/prefix \
  --aws-location https://your-s3-bucket.s3.amazonaws.com \
  --prefix mini
```

### Options

- `--source`: Source directory containing PDF files (required)
- `--output`: Base output directory for markdown files (required)
- `--aws-location`: Base URL for AWS resources (required)
- `--prefix`: Prefix for AWS resources (e.g., mini, mgb) (required)

## Development

1. Install development dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run in development mode:
   ```bash
   npm start -- [command] [options]
   ```

## Output Structure

### Image Previews
```
output/
└── images/           # Generated image previews
    └── [filename].jpeg
```

### Markdown Files
```
output/
└── [prefix]/         # Generated markdown files
    └── [filename].md
```

## License

This tool is part of the Classic Mini DIY project.
