#!/bin/bash

# Simple Hello World Deployment Script
# This script demonstrates basic nucleus deployment functionality

echo "🚀 Starting Simple Hello World Deployment"
echo "=============================================="

# Check for environment variables passed from nucleus
echo "📋 Deployment Variables:"
echo "  User Name: ${user_name}"
echo "  Greeting Style: ${greeting_style}"
echo "  Include Timestamp: ${include_timestamp}"
echo "  Output Location: ${output_location}"
echo "  Output Filename: ${output_filename}"
echo "  Check Required File: ${check_required_file}"
echo "  Project Path: ${NUCLEUS_PROJECT_PATH}"
echo "  Output Directory: ${NUCLEUS_OUTPUT_DIR}"

# Check for required file if requested
if [ "${check_required_file}" = "true" ]; then
  echo "🔍 Checking for required file..."
  REQUIRED_FILE="${NUCLEUS_PROJECT_PATH}/required-file.txt"
  if [ -f "$REQUIRED_FILE" ]; then
    echo "✅ Required file found: $REQUIRED_FILE"
    echo "   Content: $(cat "$REQUIRED_FILE")"
  else
    echo "❌ Required file not found: $REQUIRED_FILE"
    echo "❌ Deployment failed - missing required file"
    exit 1
  fi
fi

# Determine output directory based on selection
case "${output_location}" in
  "current directory")
    OUTPUT_DIR="$(pwd)"
    ;;
  "temp directory")
    OUTPUT_DIR="/tmp"
    ;;
  "home directory")
    OUTPUT_DIR="$HOME"
    ;;
  *)
    OUTPUT_DIR="$(pwd)"
    ;;
esac

echo "📁 Output will be written to: $OUTPUT_DIR"

# Create greeting based on style
case "${greeting_style}" in
  "friendly")
    GREETING="Hello there, ${user_name}! 👋"
    ;;
  "formal")
    GREETING="Good day, ${user_name}."
    ;;
  "enthusiastic")
    GREETING="Hey ${user_name}!!! 🎉 Welcome to Nucleus! 🚀"
    ;;
  *)
    GREETING="Hello, ${user_name}!"
    ;;
esac

echo "💬 Generated greeting: $GREETING"

# Prepare output content
OUTPUT_CONTENT="$GREETING"

# Add timestamp if requested
if [ "${include_timestamp}" = "true" ]; then
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  OUTPUT_CONTENT="$OUTPUT_CONTENT

Generated at: $TIMESTAMP"
  echo "⏰ Added timestamp: $TIMESTAMP"
fi

# Add deployment info
OUTPUT_CONTENT="$OUTPUT_CONTENT

---
Deployment Information:
- Project: Simple Hello World Deployer
- Nucleus Version: 1.0.0
- Deployed from: ${NUCLEUS_PROJECT_PATH}
- Output directory: ${NUCLEUS_OUTPUT_DIR}
- User selections:
  * Greeting Style: ${greeting_style}
  * Include Timestamp: ${include_timestamp}
  * Output Location: ${output_location}
"

# Write output file
OUTPUT_FILE="${OUTPUT_DIR}/${output_filename}"
echo "$OUTPUT_CONTENT" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Output file created successfully: $OUTPUT_FILE"
  echo "📄 File contents:"
  echo "==================="
  cat "$OUTPUT_FILE"
  echo "==================="
else
  echo "❌ Failed to create output file: $OUTPUT_FILE"
  exit 1
fi

# Create a simple log in the output directory
LOG_FILE="${NUCLEUS_OUTPUT_DIR}/deployment.log"
echo "$(date): Simple Hello World deployment completed successfully" >> "$LOG_FILE"
echo "$(date): Created file: $OUTPUT_FILE" >> "$LOG_FILE"
echo "$(date): Greeting: $GREETING" >> "$LOG_FILE"

echo "📝 Deployment log updated: $LOG_FILE"

echo ""
echo "🎉 Simple Hello World Deployment Complete!"
echo "=============================================="
echo "Summary:"
echo "  ✅ Deployment successful"
echo "  📄 Output file: $OUTPUT_FILE"
echo "  📝 Log file: $LOG_FILE"
echo "  💬 Greeting: $GREETING"

exit 0