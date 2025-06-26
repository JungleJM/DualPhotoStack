# DPS Download Commands for Clean VMs

## Quick One-Liner (Copy-Paste Ready)

```bash
# Download and run latest DPS build automatically
curl -fsSL https://raw.githubusercontent.com/JungleJM/DualPhotoStack/main/download-latest-dps.sh | bash && ./DPS-Linux-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/').AppImage
```

## Alternative Methods

### Method 1: Download Script Only
```bash
# Download the script
curl -fsSL https://raw.githubusercontent.com/JungleJM/DualPhotoStack/main/download-latest-dps.sh -o download-latest-dps.sh

# Make executable and run
chmod +x download-latest-dps.sh
./download-latest-dps.sh
```

### Method 2: Manual Latest Build Detection
```bash
# Get latest build number and download
LATEST_BUILD=$(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases | jq -r '.[].tag_name' | grep -E 'build-[0-9]+' | sed 's/.*build-//' | sort -n | tail -1)
ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
wget "https://github.com/JungleJM/DualPhotoStack/releases/download/v0.25.0-build-$LATEST_BUILD/DPS-Linux-$ARCH.AppImage"
chmod +x "DPS-Linux-$ARCH.AppImage"
./DPS-Linux-$ARCH.AppImage
```

### Method 3: Direct Download (Fallback)
```bash
# If jq is not available, download current latest known build
wget https://github.com/JungleJM/DualPhotoStack/releases/download/v0.25.0-build-19/DPS-Linux-x64.AppImage
chmod +x DPS-Linux-x64.AppImage
./DPS-Linux-x64.AppImage
```

## Testing on Clean VMs

### Ubuntu/Debian Setup
```bash
# Install dependencies if needed
sudo apt update
sudo apt install curl wget jq libgtk-3-0 libxss1 libnss3 libasound2

# Download and run
curl -fsSL https://raw.githubusercontent.com/JungleJM/DualPhotoStack/main/download-latest-dps.sh | bash
```

### Fedora/RHEL Setup
```bash
# Install dependencies if needed
sudo dnf install curl wget jq gtk3 libXScrnSaver nss alsa-lib

# Download and run
curl -fsSL https://raw.githubusercontent.com/JungleJM/DualPhotoStack/main/download-latest-dps.sh | bash
```

### Arch Linux Setup
```bash
# Install dependencies if needed
sudo pacman -S curl wget jq gtk3 libxss nss alsa-lib

# Download and run
curl -fsSL https://raw.githubusercontent.com/JungleJM/DualPhotoStack/main/download-latest-dps.sh | bash
```

## What the Script Does

1. **Finds Latest Build**: Queries GitHub API for highest build number
2. **Detects Architecture**: Automatically selects x64 or arm64 version
3. **Downloads AppImage**: Gets the correct file for your system
4. **Makes Executable**: Sets proper permissions
5. **Shows Instructions**: Displays how to run and clean up

## Troubleshooting

### If download fails:
- Check internet connection
- Ensure curl/wget is installed
- Try the direct download method

### If AppImage won't run:
- Install GTK3 libraries (see commands above)
- Check that you have Docker installed and running
- Verify AppImage has execute permissions

### If you get "No builds found":
- GitHub API might be rate-limited
- Try the direct download method with latest known build

## Build Information

The script automatically finds builds with tags like:
- `v0.25.0-build-19` (latest as of this writing)
- `v0.25.0-build-18`
- etc.

Higher build numbers = newer releases with more fixes.