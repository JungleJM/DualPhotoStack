#!/bin/bash

# DPS Latest Build Downloader
# Downloads the latest DPS build by build number for clean VM testing

set -e

echo "🔍 Finding latest DPS build..."

# Get all releases and extract build numbers
LATEST_BUILD=$(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases | \
    jq -r '.[].tag_name' | \
    grep -E 'v[0-9]+\.[0-9]+\.[0-9]+-build-[0-9]+' | \
    sed 's/.*build-//' | \
    sort -n | \
    tail -1)

if [ -z "$LATEST_BUILD" ]; then
    echo "❌ No builds found"
    exit 1
fi

echo "📦 Latest build number: $LATEST_BUILD"

# Get the release info for the latest build
RELEASE_INFO=$(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases | \
    jq -r ".[] | select(.tag_name | contains(\"build-$LATEST_BUILD\"))")

if [ -z "$RELEASE_INFO" ]; then
    echo "❌ Could not find release info for build $LATEST_BUILD"
    exit 1
fi

# Extract release details
TAG_NAME=$(echo "$RELEASE_INFO" | jq -r '.tag_name')
RELEASE_NAME=$(echo "$RELEASE_INFO" | jq -r '.name')
PUBLISHED_DATE=$(echo "$RELEASE_INFO" | jq -r '.published_at')

echo "🏷️  Release: $TAG_NAME"
echo "📅 Published: $PUBLISHED_DATE"
echo "🔖 Name: $RELEASE_NAME"

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        DPS_ARCH="x64"
        ;;
    aarch64|arm64)
        DPS_ARCH="arm64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        echo "💡 Supported: x86_64 (x64), aarch64/arm64"
        exit 1
        ;;
esac

echo "🏗️  Detected architecture: $ARCH -> DPS-Linux-$DPS_ARCH"

# Get download URL for the correct architecture
DOWNLOAD_URL=$(echo "$RELEASE_INFO" | \
    jq -r ".assets[] | select(.name == \"DPS-Linux-$DPS_ARCH.AppImage\") | .browser_download_url")

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
    echo "❌ No AppImage found for architecture: $DPS_ARCH"
    echo "💡 Available files:"
    echo "$RELEASE_INFO" | jq -r '.assets[].name' | sed 's/^/   - /'
    exit 1
fi

echo "📥 Download URL: $DOWNLOAD_URL"

# Download the file
FILENAME="DPS-Linux-$DPS_ARCH.AppImage"
echo "⬇️  Downloading $FILENAME..."

if command -v wget >/dev/null 2>&1; then
    wget -O "$FILENAME" "$DOWNLOAD_URL"
elif command -v curl >/dev/null 2>&1; then
    curl -L -o "$FILENAME" "$DOWNLOAD_URL"
else
    echo "❌ Neither wget nor curl found"
    echo "💡 Please install wget or curl and try again"
    exit 1
fi

# Make executable
chmod +x "$FILENAME"

# Get file size
FILE_SIZE=$(ls -lh "$FILENAME" | awk '{print $5}')

echo ""
echo "✅ Download complete!"
echo "📁 File: $FILENAME"
echo "📏 Size: $FILE_SIZE"
echo "🏷️  Build: $TAG_NAME"
echo ""
echo "🚀 To run DPS:"
echo "   ./$FILENAME"
echo ""
echo "🗑️  To remove:"
echo "   rm $FILENAME"
echo ""

# Show system requirements reminder
echo "📋 System Requirements:"
echo "   - Linux (Ubuntu 20.04+, Fedora 35+, etc.)"
echo "   - Docker installed and running"
echo "   - GTK3 libraries (usually pre-installed)"
echo ""
echo "💡 If you get library errors, try:"
echo "   sudo apt install libgtk-3-0 libxss1 libnss3 libasound2  # Ubuntu/Debian"
echo "   sudo dnf install gtk3 libXScrnSaver nss alsa-lib         # Fedora"
echo ""