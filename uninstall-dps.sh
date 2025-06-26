#!/bin/bash
# DPS Complete Uninstall Script
# Removes all DPS-related files, configurations, and Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️  DPS Complete Uninstall Script${NC}"
echo "======================================"
echo
echo "This script will remove:"
echo "  • DPS application data and logs"
echo "  • Docker containers and volumes"
echo "  • Generated docker-compose files"
echo "  • Electron app configuration"
echo "  • All DPS-related files"
echo

# Confirm with user
read -p "Are you sure you want to completely uninstall DPS? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Uninstall cancelled.${NC}"
    exit 0
fi

echo -e "${BLUE}🧹 Starting DPS uninstall...${NC}"
echo

# Function to safely remove directory
safe_remove() {
    local dir="$1"
    local desc="$2"
    
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}🗂️  Removing $desc: $dir${NC}"
        rm -rf "$dir"
        echo -e "${GREEN}✅ Removed $desc${NC}"
    else
        echo -e "${BLUE}ℹ️  $desc not found: $dir${NC}"
    fi
}

# Function to safely remove file
safe_remove_file() {
    local file="$1"
    local desc="$2"
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}📄 Removing $desc: $file${NC}"
        rm -f "$file"
        echo -e "${GREEN}✅ Removed $desc${NC}"
    else
        echo -e "${BLUE}ℹ️  $desc not found: $file${NC}"
    fi
}

# 1. Stop and remove Docker containers
echo -e "${BLUE}🐳 Cleaning up Docker containers and volumes...${NC}"

# Stop DPS-related containers
docker ps -a --format "table {{.Names}}" | grep -E "(immich|photoprism|dockge|semaphore|dps)" | while read container; do
    if [ "$container" != "NAMES" ]; then
        echo -e "${YELLOW}🛑 Stopping container: $container${NC}"
        docker stop "$container" 2>/dev/null || true
        echo -e "${YELLOW}🗑️  Removing container: $container${NC}"
        docker rm "$container" 2>/dev/null || true
    fi
done

# Remove DPS-related volumes
docker volume ls --format "table {{.Name}}" | grep -E "(immich|photoprism|dockge|semaphore|dps)" | while read volume; do
    if [ "$volume" != "NAME" ]; then
        echo -e "${YELLOW}💾 Removing volume: $volume${NC}"
        docker volume rm "$volume" 2>/dev/null || true
    fi
done

# Remove DPS-related networks
docker network ls --format "table {{.Name}}" | grep -E "(immich|photoprism|dockge|semaphore|dps)" | while read network; do
    if [ "$network" != "NAME" ] && [ "$network" != "bridge" ] && [ "$network" != "host" ] && [ "$network" != "none" ]; then
        echo -e "${YELLOW}🌐 Removing network: $network${NC}"
        docker network rm "$network" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✅ Docker cleanup completed${NC}"
echo

# 2. Remove DPS application data and logs
echo -e "${BLUE}📱 Removing DPS application data...${NC}"

# DPS logs and configuration
safe_remove "$HOME/.config/dps" "DPS configuration and logs"

# Electron app data
safe_remove "$HOME/.config/dual-photo-stack" "Electron app data"

# DPS cache
safe_remove "$HOME/.cache/dps" "DPS cache"
safe_remove "$HOME/.cache/dual-photo-stack" "Electron app cache"

echo

# 3. Remove Docker stacks and generated files
echo -e "${BLUE}🐳 Removing Docker stacks and generated files...${NC}"

# Docker stacks directory (where compose files are generated)
safe_remove "$HOME/.local/share/docker-stacks" "Docker stacks directory"

# Backup any existing docker-stacks
if [ -d "$HOME/docker-stacks" ]; then
    echo -e "${YELLOW}⚠️  Found docker-stacks in home directory. Removing...${NC}"
    safe_remove "$HOME/docker-stacks" "Legacy docker-stacks directory"
fi

echo

# 4. Remove temporary files and test artifacts
echo -e "${BLUE}🧽 Cleaning up temporary files...${NC}"

# Test files
safe_remove_file "/tmp/dps-test-config.json" "Test configuration file"
safe_remove "/tmp/dps-test-*" "Test directories"

# Log files
find /tmp -name "*dps*" -name "*.log" 2>/dev/null | while read logfile; do
    safe_remove_file "$logfile" "Temporary log file"
done

# AppImage files (if downloaded)
find "$HOME" -name "*DPS*.AppImage" -o -name "*dual-photo-stack*.AppImage" 2>/dev/null | while read appimage; do
    safe_remove_file "$appimage" "DPS AppImage"
done

# Deb packages
find "$HOME" -name "*DPS*.deb" -o -name "*dual-photo-stack*.deb" 2>/dev/null | while read deb; do
    safe_remove_file "$deb" "DPS Debian package"
done

echo

# 5. Remove desktop integration (if exists)
echo -e "${BLUE}🖥️  Removing desktop integration...${NC}"

safe_remove_file "$HOME/.local/share/applications/dual-photo-stack.desktop" "Desktop file"
safe_remove_file "$HOME/.local/share/icons/dual-photo-stack.png" "Application icon"

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications/" 2>/dev/null || true
fi

echo

# 6. Clean up systemd services (if any)
echo -e "${BLUE}⚙️  Checking for systemd services...${NC}"

# Check for user systemd services
if [ -d "$HOME/.config/systemd/user" ]; then
    find "$HOME/.config/systemd/user" -name "*dps*" -o -name "*dual-photo-stack*" 2>/dev/null | while read service; do
        service_name=$(basename "$service")
        echo -e "${YELLOW}🔧 Stopping and disabling service: $service_name${NC}"
        systemctl --user stop "$service_name" 2>/dev/null || true
        systemctl --user disable "$service_name" 2>/dev/null || true
        safe_remove_file "$service" "Systemd service file"
    done
    
    # Reload systemd
    systemctl --user daemon-reload 2>/dev/null || true
fi

echo

# 7. Remove from package managers (if installed via package)
echo -e "${BLUE}📦 Checking package managers...${NC}"

# Check if installed via flatpak
if command -v flatpak >/dev/null 2>&1; then
    if flatpak list | grep -q "dual-photo-stack\|dps"; then
        echo -e "${YELLOW}📱 Removing Flatpak installation...${NC}"
        flatpak uninstall com.dps.dual-photo-stack 2>/dev/null || true
    fi
fi

# Check if installed via snap
if command -v snap >/dev/null 2>&1; then
    if snap list | grep -q "dual-photo-stack\|dps"; then
        echo -e "${YELLOW}📦 Removing Snap installation...${NC}"
        snap remove dual-photo-stack 2>/dev/null || true
    fi
fi

# Check if installed via apt/dpkg
if command -v dpkg >/dev/null 2>&1; then
    if dpkg -l | grep -q "dual-photo-stack\|dps"; then
        echo -e "${YELLOW}📦 Removing Debian package...${NC}"
        sudo apt remove --purge dual-photo-stack 2>/dev/null || true
    fi
fi

echo

# 8. Final cleanup verification
echo -e "${BLUE}🔍 Final cleanup verification...${NC}"

REMAINING_FILES=""

# Check for any remaining DPS-related files
if [ -d "$HOME/.config/dps" ] || [ -d "$HOME/.config/dual-photo-stack" ]; then
    REMAINING_FILES="$REMAINING_FILES\n  • Configuration files in ~/.config/"
fi

if [ -d "$HOME/.local/share/docker-stacks" ]; then
    REMAINING_FILES="$REMAINING_FILES\n  • Docker stacks in ~/.local/share/"
fi

if docker ps -a | grep -E "(immich|photoprism|dockge|semaphore)" >/dev/null 2>&1; then
    REMAINING_FILES="$REMAINING_FILES\n  • Docker containers still running"
fi

if [ -n "$REMAINING_FILES" ]; then
    echo -e "${YELLOW}⚠️  Some files may still remain:${REMAINING_FILES}${NC}"
    echo -e "${BLUE}ℹ️  You may need to remove these manually.${NC}"
else
    echo -e "${GREEN}✅ All DPS files appear to be removed!${NC}"
fi

echo
echo -e "${GREEN}🎉 DPS uninstall completed!${NC}"
echo
echo "Summary of what was removed:"
echo "  • Application data and logs"
echo "  • Docker containers, volumes, and networks"
echo "  • Generated configuration files"
echo "  • Temporary and cache files"
echo "  • Desktop integration"
echo "  • Package installations"
echo
echo -e "${BLUE}ℹ️  To reinstall DPS, download the latest AppImage from:${NC}"
echo "   https://github.com/JungleJM/DualPhotoStack/releases"
echo