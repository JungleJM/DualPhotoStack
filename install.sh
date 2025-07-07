#!/bin/bash

# DualPhotoStack Simple Installer
# Installs Dockge and photo management stacks (Immich, PhotoPrism, Semaphore)
# Uses ~/.local/share/dualphotostack for installation directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Installation directories
INSTALL_DIR="$HOME/.local/share/dualphotostack"
STACKS_DIR="$INSTALL_DIR/stacks"
PHOTOS_DIR="$HOME/Pictures"

echo -e "${GREEN}DualPhotoStack Simple Installer${NC}"
echo "=================================="

# Check if Docker is installed
echo -e "${YELLOW}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker first:"
    echo "  - Ubuntu/Debian: sudo apt install docker.io docker-compose-plugin"
    echo "  - Fedora: sudo dnf install docker docker-compose-plugin"
    echo "  - Arch: sudo pacman -S docker docker-compose"
    echo ""
    echo "After installation, enable and start Docker:"
    echo "  sudo systemctl enable --now docker"
    echo "  sudo usermod -aG docker $USER"
    echo "  (Then log out and back in)"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not available.${NC}"
    echo "Please install docker-compose-plugin or docker-compose"
    exit 1
fi

# Check if user is in docker group
if ! groups $USER | grep -q docker; then
    echo -e "${YELLOW}Warning: User $USER is not in the docker group.${NC}"
    echo "You may need to run: sudo usermod -aG docker $USER"
    echo "Then log out and back in, or use 'sudo' with this script."
fi

echo -e "${GREEN}Docker is installed and available.${NC}"

# Create installation directories
echo -e "${YELLOW}Creating installation directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$STACKS_DIR"
mkdir -p "$PHOTOS_DIR"

# Create photos subdirectories
mkdir -p "$PHOTOS_DIR/library"
mkdir -p "$PHOTOS_DIR/apps"

echo -e "${GREEN}Installation directories created:${NC}"
echo "  Install dir: $INSTALL_DIR"
echo "  Stacks dir: $STACKS_DIR"
echo "  Photos dir: $PHOTOS_DIR"

# Copy Dockge configuration
echo -e "${YELLOW}Setting up Dockge...${NC}"
cp -r simple-docker/dockge "$INSTALL_DIR/"

# Update Dockge compose file to use correct stacks path
sed -i "s|./stacks|$STACKS_DIR|g" "$INSTALL_DIR/dockge/compose.yml"

# Copy stack configurations
echo -e "${YELLOW}Setting up photo management stacks...${NC}"
cp -r simple-docker/stacks/* "$STACKS_DIR/"

# Update stack configurations to use Photos directory
for stack in immich photoprism; do
    if [ -f "$STACKS_DIR/$stack/compose.yml" ]; then
        echo "Updating $stack configuration..."
        # Update library paths to use Pictures directory
        sed -i "s|/mnt/photovault/library|$PHOTOS_DIR/library|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|/mnt/photovault/apps|$PHOTOS_DIR/apps|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Update relative paths to absolute paths
        sed -i "s|\\./mariadb-data|$STACKS_DIR/$stack/mariadb-data|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./temp|$STACKS_DIR/$stack/temp|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./data|$STACKS_DIR/$stack/data|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Create necessary directories
        mkdir -p "$STACKS_DIR/$stack/mariadb-data"
        mkdir -p "$STACKS_DIR/$stack/temp"
        mkdir -p "$STACKS_DIR/$stack/data"
        mkdir -p "$PHOTOS_DIR/apps/$stack"
    fi
done

echo -e "${GREEN}Stack configurations updated.${NC}"

# Start Dockge
echo -e "${YELLOW}Starting Dockge...${NC}"
cd "$INSTALL_DIR/dockge"

echo "Starting Docker Compose..."
docker compose up -d

echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Dockge is now running and accessible at: http://localhost:5001"
echo ""
echo "Available stacks in Dockge:"
echo "  - immich: Full-featured photo management"
echo "  - photoprism: AI-powered photo management"
echo "  - semaphore: Ansible automation"
echo ""
echo "Your photo library is located at: $PHOTOS_DIR/library"
echo "Stack data is stored in: $STACKS_DIR"
echo ""
echo "To stop Dockge later, run:"
echo "  cd $INSTALL_DIR/dockge && docker compose down"
echo ""
echo "To completely remove the installation:"
echo "  rm -rf $INSTALL_DIR"

# Wait for Dockge to be ready
echo -e "${YELLOW}Waiting for Dockge to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5001 > /dev/null 2>&1; then
        echo -e "${GREEN}Dockge is ready at http://localhost:5001${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "Installation process complete. Check the logs above for any errors."