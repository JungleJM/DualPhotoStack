#!/bin/bash

# DualPhotoStack Nucleus Installer
# Installs Dockge and photo management stacks (Immich, PhotoPrism, Semaphore)
# Configured via Nucleus YAML interface

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}DualPhotoStack Nucleus Installer${NC}"
echo "=================================="

# Display configuration from Nucleus
echo -e "${YELLOW}Configuration from Nucleus:${NC}"
echo "  Library Location: ${library_location:-Use standard Pictures directory}"
echo "  Custom Library Path: ${custom_library_path:-N/A}"
echo "  Create Subdirs: ${create_subdirs:-true}"
echo "  Install Location: ${install_location:-User directory (~/.local/share)}"
echo "  Auto Start: ${auto_start:-true}"
echo "  Prepare Immich: ${prepare_immich:-true}"
echo "  Prepare PhotoPrism: ${prepare_photoprism:-true}"
echo "  Prepare Semaphore: ${prepare_semaphore:-false}"
echo ""

# Determine installation directory
if [ "${install_location}" = "Custom directory" ]; then
    INSTALL_DIR="${custom_install_path}/dualphotostack"
else
    INSTALL_DIR="$HOME/.local/share/dualphotostack"
fi

STACKS_DIR="$INSTALL_DIR/stacks"

# Determine photo library directory
if [ "${library_location}" = "Use custom directory" ]; then
    PHOTOS_DIR="${custom_library_path}"
else
    PHOTOS_DIR="$HOME/Pictures"
fi

echo -e "${GREEN}Installation Configuration:${NC}"
echo "  Install dir: $INSTALL_DIR"
echo "  Stacks dir: $STACKS_DIR"
echo "  Photos dir: $PHOTOS_DIR"
echo ""

# Check Docker installation automatically
echo -e "${YELLOW}Checking Docker installation...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Cannot complete installation: Docker is not installed.${NC}"
    echo ""
    echo "Please install Docker for your distribution:"
    echo "  • Ubuntu/Debian: sudo apt install docker.io docker-compose-plugin"
    echo "  • Fedora: sudo dnf install docker docker-compose-plugin"  
    echo "  • Arch: sudo pacman -S docker docker-compose"
    echo ""
    echo "After installation:"
    echo "  • sudo systemctl enable --now docker"
    echo "  • sudo usermod -aG docker $USER"
    echo "  • Log out and back in"
    echo ""
    echo "For detailed instructions, visit: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Cannot complete installation: Docker Compose is not available.${NC}"
    echo ""
    echo "Please install docker-compose-plugin:"
    echo "  • Ubuntu/Debian: sudo apt install docker-compose-plugin"
    echo "  • Fedora: sudo dnf install docker-compose-plugin"
    echo "  • Arch: sudo pacman -S docker-compose"
    echo ""
    echo "Or install standalone docker-compose:"
    echo "  • curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  • chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# Check if Docker service is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Cannot complete installation: Docker service is not running or requires sudo.${NC}"
    echo ""
    echo "Please ensure Docker is running and you have proper permissions:"
    echo "  • Start Docker: sudo systemctl start docker"
    echo "  • Enable auto-start: sudo systemctl enable docker"
    echo "  • Add user to docker group: sudo usermod -aG docker $USER"
    echo "  • Log out and back in (or run: newgrp docker)"
    echo ""
    echo "Test with: docker ps"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and ready.${NC}"

# Check if required ports are available
echo -e "${YELLOW}Checking port availability...${NC}"

# Define required ports
REQUIRED_PORTS=(5001 2283 2342 3000)
PORT_NAMES=("Dockge" "Immich" "PhotoPrism" "Semaphore")
PORTS_IN_USE=()
PORT_CONFLICTS=()

# Check each port
for i in "${!REQUIRED_PORTS[@]}"; do
    port=${REQUIRED_PORTS[$i]}
    service_name=${PORT_NAMES[$i]}
    
    # Check if port is in use (works on Linux and macOS)
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        PORTS_IN_USE+=($port)
        PORT_CONFLICTS+=("$service_name (port $port)")
    fi
done

# Report port conflicts
if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Port conflicts detected:${NC}"
    for conflict in "${PORT_CONFLICTS[@]}"; do
        echo "  • $conflict is already in use"
    done
    echo ""
    echo -e "${YELLOW}Options to resolve port conflicts:${NC}"
    echo "  1. Stop services using these ports"
    echo "  2. Continue installation (may cause service startup failures)"
    echo "  3. Cancel installation and configure different ports later"
    echo ""
    
    # Check which services are actually being prepared
    AFFECTED_SERVICES=()
    [ "${prepare_immich}" = "true" ] && [[ " ${PORTS_IN_USE[@]} " =~ " 2283 " ]] && AFFECTED_SERVICES+=("Immich")
    [ "${prepare_photoprism}" = "true" ] && [[ " ${PORTS_IN_USE[@]} " =~ " 2342 " ]] && AFFECTED_SERVICES+=("PhotoPrism")
    [ "${prepare_semaphore}" = "true" ] && [[ " ${PORTS_IN_USE[@]} " =~ " 3000 " ]] && AFFECTED_SERVICES+=("Semaphore")
    [[ " ${PORTS_IN_USE[@]} " =~ " 5001 " ]] && AFFECTED_SERVICES+=("Dockge")
    
    if [ ${#AFFECTED_SERVICES[@]} -gt 0 ]; then
        echo -e "${YELLOW}Affected services you selected: ${AFFECTED_SERVICES[*]}${NC}"
        echo ""
    fi
    
    echo -e "${YELLOW}To check what's using these ports, run:${NC}"
    for port in "${PORTS_IN_USE[@]}"; do
        echo "  sudo netstat -tulnp | grep :$port"
        echo "  # or: sudo ss -tulnp | grep :$port"
        echo "  # or: sudo lsof -i :$port"
    done
    echo ""
    
    read -p "Do you want to continue with installation anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Installation cancelled due to port conflicts.${NC}"
        echo ""
        echo "After resolving port conflicts, you can run the installer again."
        exit 1
    fi
    
    echo -e "${YELLOW}Continuing with installation despite port conflicts...${NC}"
else
    echo -e "${GREEN}✅ All required ports are available.${NC}"
fi

# Create installation directories
echo -e "${YELLOW}Creating installation directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$STACKS_DIR"
mkdir -p "$PHOTOS_DIR"

# Create photos subdirectories if requested
if [ "${create_subdirs}" = "true" ]; then
    echo -e "${YELLOW}Creating photo library subdirectories...${NC}"
    mkdir -p "$PHOTOS_DIR/library"
    mkdir -p "$PHOTOS_DIR/apps"
    echo -e "${GREEN}Created subdirectories: library/ and apps/${NC}"
fi

echo -e "${GREEN}Installation directories created:${NC}"
echo "  Install dir: $INSTALL_DIR"
echo "  Stacks dir: $STACKS_DIR"
echo "  Photos dir: $PHOTOS_DIR"

# Copy Dockge configuration
echo -e "${YELLOW}Setting up Dockge...${NC}"
cp -r simple-docker/dockge "$INSTALL_DIR/"

# Update Dockge compose file to use correct stacks path
sed -i "s|./stacks|$STACKS_DIR|g" "$INSTALL_DIR/dockge/compose.yml"

# Copy stack configurations based on user preferences
echo -e "${YELLOW}Setting up photo management stacks...${NC}"

# Copy selected stacks
if [ "${prepare_immich}" = "true" ]; then
    echo "Copying Immich stack..."
    cp -r simple-docker/stacks/immich "$STACKS_DIR/"
fi

if [ "${prepare_photoprism}" = "true" ]; then
    echo "Copying PhotoPrism stack..."
    cp -r simple-docker/stacks/photoprism "$STACKS_DIR/"
fi

if [ "${prepare_semaphore}" = "true" ]; then
    echo "Copying Semaphore stack..."
    cp -r simple-docker/stacks/semaphore "$STACKS_DIR/"
fi

# Update stack configurations to use configured photo directory
PHOTO_LIBRARY_PATH="$PHOTOS_DIR"
if [ "${create_subdirs}" = "true" ]; then
    PHOTO_LIBRARY_PATH="$PHOTOS_DIR/library"
fi

for stack in immich photoprism; do
    if [ -f "$STACKS_DIR/$stack/compose.yml" ]; then
        echo "Updating $stack configuration..."
        # Update library paths to use configured directory
        sed -i "s|/mnt/photovault/library|$PHOTO_LIBRARY_PATH|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|/mnt/photovault/apps|$PHOTOS_DIR/apps|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Update relative paths to absolute paths
        sed -i "s|\\./mariadb-data|$STACKS_DIR/$stack/mariadb-data|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./temp|$STACKS_DIR/$stack/temp|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./data|$STACKS_DIR/$stack/data|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Create necessary directories
        mkdir -p "$STACKS_DIR/$stack/mariadb-data"
        mkdir -p "$STACKS_DIR/$stack/temp"
        mkdir -p "$STACKS_DIR/$stack/data"
        
        if [ "${create_subdirs}" = "true" ]; then
            mkdir -p "$PHOTOS_DIR/apps/$stack"
        fi
    fi
done

echo -e "${GREEN}Stack configurations updated.${NC}"

# Start Dockge if requested
if [ "${auto_start}" = "true" ]; then
    echo -e "${YELLOW}Starting Dockge...${NC}"
    cd "$INSTALL_DIR/dockge"
    
    echo "Starting Docker Compose..."
    docker compose up -d
else
    echo -e "${YELLOW}Skipping auto-start (disabled in configuration)${NC}"
    echo "To start Dockge manually later, run:"
    echo "  cd $INSTALL_DIR/dockge && docker compose up -d"
fi

echo -e "${GREEN}Installation complete!${NC}"
echo ""

# Show status based on auto_start setting
if [ "${auto_start}" = "true" ]; then
    echo -e "${GREEN}Dockge is running and accessible at: http://localhost:5001${NC}"
    
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
else
    echo -e "${YELLOW}Dockge is installed but not started.${NC}"
    echo "To start Dockge manually:"
    echo "  cd $INSTALL_DIR/dockge && docker compose up -d"
    echo ""
fi

echo "📍 Installation Summary:"
echo "  Install Directory: $INSTALL_DIR"
echo "  Photo Library: $PHOTOS_DIR"

# Show configured stacks
if [ "${create_subdirs}" = "true" ]; then
    echo "  Photo Library Path: $PHOTOS_DIR/library"
    echo "  App Data Path: $PHOTOS_DIR/apps"
fi

echo ""
echo "📦 Configured Stacks:"
[ "${prepare_immich}" = "true" ] && echo "  ✅ Immich: Full-featured photo management"
[ "${prepare_photoprism}" = "true" ] && echo "  ✅ PhotoPrism: AI-powered photo management"  
[ "${prepare_semaphore}" = "true" ] && echo "  ✅ Semaphore: Ansible automation"

echo ""
echo "🔧 Management Commands:"
echo "  Start Dockge: cd $INSTALL_DIR/dockge && docker compose up -d"
echo "  Stop Dockge: cd $INSTALL_DIR/dockge && docker compose down"
echo "  Remove Installation: rm -rf $INSTALL_DIR"
echo ""
echo "🌐 Access URLs (when running):"
echo "  Dockge: http://localhost:5001"
[ "${prepare_immich}" = "true" ] && echo "  Immich: http://localhost:2283"
[ "${prepare_photoprism}" = "true" ] && echo "  PhotoPrism: http://localhost:2342"
[ "${prepare_semaphore}" = "true" ] && echo "  Semaphore: http://localhost:3000"

echo ""
echo "Installation process complete. Check the logs above for any errors."