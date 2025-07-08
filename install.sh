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

# Define default ports (will be updated if conflicts are resolved)
DOCKGE_PORT=5001
IMMICH_PORT=2283
PHOTOPRISM_PORT=2342
SEMAPHORE_PORT=3000

# Define required ports
REQUIRED_PORTS=($DOCKGE_PORT $IMMICH_PORT $PHOTOPRISM_PORT $SEMAPHORE_PORT)
PORT_NAMES=("Dockge" "Immich" "PhotoPrism" "Semaphore")
PORTS_IN_USE=()
PORT_CONFLICTS=()

# Function to find an available port starting from a given port
find_available_port() {
    local start_port=$1
    local port=$start_port
    while [ $port -lt 65535 ]; do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port " && ! ss -tuln 2>/dev/null | grep -q ":$port "; then
            echo $port
            return
        fi
        ((port++))
    done
    echo 0  # No available port found
}

# Function to validate user-provided port
validate_port() {
    local port=$1
    if [[ ! $port =~ ^[0-9]+$ ]] || [ $port -lt 1024 ] || [ $port -gt 65535 ]; then
        echo "Invalid port number. Please use a port between 1024-65535."
        return 1
    fi
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "Port $port is already in use. Please choose a different port."
        return 1
    fi
    return 0
}

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

# Report port conflicts and handle resolution
if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Port conflicts detected:${NC}"
    for conflict in "${PORT_CONFLICTS[@]}"; do
        echo "  • $conflict is already in use"
    done
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
    
    echo -e "${YELLOW}Options to resolve port conflicts:${NC}"
    echo "  1. Use alternative ports (recommended)"
    echo "  2. Continue with current ports (may cause service failures)"
    echo "  3. Cancel installation"
    echo ""
    
    read -p "Choose option (1/2/3): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            echo -e "${GREEN}Configuring alternative ports...${NC}"
            echo ""
            
            # Handle each conflicted port
            for port in "${PORTS_IN_USE[@]}"; do
                case $port in
                    5001)
                        suggested_port=$(find_available_port 5002)
                        echo -e "${YELLOW}Dockge (default port 5001 is in use)${NC}"
                        echo "  Suggested alternative: $suggested_port"
                        read -p "  Use suggested port $suggested_port? (Y/n) or enter custom port: " user_input
                        if [[ $user_input =~ ^[0-9]+$ ]]; then
                            while ! validate_port $user_input; do
                                read -p "  Enter a different port (1024-65535): " user_input
                            done
                            DOCKGE_PORT=$user_input
                        elif [[ ! $user_input =~ ^[Nn]$ ]]; then
                            DOCKGE_PORT=$suggested_port
                        else
                            read -p "  Enter custom port (1024-65535): " custom_port
                            while ! validate_port $custom_port; do
                                read -p "  Enter a different port (1024-65535): " custom_port
                            done
                            DOCKGE_PORT=$custom_port
                        fi
                        echo "  ✅ Dockge will use port $DOCKGE_PORT"
                        ;;
                    2283)
                        if [ "${prepare_immich}" = "true" ]; then
                            suggested_port=$(find_available_port 2284)
                            echo -e "${YELLOW}Immich (default port 2283 is in use)${NC}"
                            echo "  Suggested alternative: $suggested_port"
                            read -p "  Use suggested port $suggested_port? (Y/n) or enter custom port: " user_input
                            if [[ $user_input =~ ^[0-9]+$ ]]; then
                                while ! validate_port $user_input; do
                                    read -p "  Enter a different port (1024-65535): " user_input
                                done
                                IMMICH_PORT=$user_input
                            elif [[ ! $user_input =~ ^[Nn]$ ]]; then
                                IMMICH_PORT=$suggested_port
                            else
                                read -p "  Enter custom port (1024-65535): " custom_port
                                while ! validate_port $custom_port; do
                                    read -p "  Enter a different port (1024-65535): " custom_port
                                done
                                IMMICH_PORT=$custom_port
                            fi
                            echo "  ✅ Immich will use port $IMMICH_PORT"
                        fi
                        ;;
                    2342)
                        if [ "${prepare_photoprism}" = "true" ]; then
                            suggested_port=$(find_available_port 2343)
                            echo -e "${YELLOW}PhotoPrism (default port 2342 is in use)${NC}"
                            echo "  Suggested alternative: $suggested_port"
                            read -p "  Use suggested port $suggested_port? (Y/n) or enter custom port: " user_input
                            if [[ $user_input =~ ^[0-9]+$ ]]; then
                                while ! validate_port $user_input; do
                                    read -p "  Enter a different port (1024-65535): " user_input
                                done
                                PHOTOPRISM_PORT=$user_input
                            elif [[ ! $user_input =~ ^[Nn]$ ]]; then
                                PHOTOPRISM_PORT=$suggested_port
                            else
                                read -p "  Enter custom port (1024-65535): " custom_port
                                while ! validate_port $custom_port; do
                                    read -p "  Enter a different port (1024-65535): " custom_port
                                done
                                PHOTOPRISM_PORT=$custom_port
                            fi
                            echo "  ✅ PhotoPrism will use port $PHOTOPRISM_PORT"
                        fi
                        ;;
                    3000)
                        if [ "${prepare_semaphore}" = "true" ]; then
                            suggested_port=$(find_available_port 3001)
                            echo -e "${YELLOW}Semaphore (default port 3000 is in use)${NC}"
                            echo "  Suggested alternative: $suggested_port"
                            read -p "  Use suggested port $suggested_port? (Y/n) or enter custom port: " user_input
                            if [[ $user_input =~ ^[0-9]+$ ]]; then
                                while ! validate_port $user_input; do
                                    read -p "  Enter a different port (1024-65535): " user_input
                                done
                                SEMAPHORE_PORT=$user_input
                            elif [[ ! $user_input =~ ^[Nn]$ ]]; then
                                SEMAPHORE_PORT=$suggested_port
                            else
                                read -p "  Enter custom port (1024-65535): " custom_port
                                while ! validate_port $custom_port; do
                                    read -p "  Enter a different port (1024-65535): " custom_port
                                done
                                SEMAPHORE_PORT=$custom_port
                            fi
                            echo "  ✅ Semaphore will use port $SEMAPHORE_PORT"
                        fi
                        ;;
                esac
                echo ""
            done
            
            echo -e "${GREEN}✅ Port conflicts resolved with alternative ports.${NC}"
            ;;
        2)
            echo -e "${YELLOW}Continuing with original ports despite conflicts...${NC}"
            echo -e "${RED}Warning: Some services may fail to start due to port conflicts.${NC}"
            ;;
        3)
            echo -e "${RED}Installation cancelled due to port conflicts.${NC}"
            echo ""
            echo "To check what's using these ports, run:"
            for port in "${PORTS_IN_USE[@]}"; do
                echo "  sudo netstat -tulnp | grep :$port"
                echo "  # or: sudo ss -tulnp | grep :$port"
                echo "  # or: sudo lsof -i :$port"
            done
            echo ""
            echo "After resolving port conflicts, you can run the installer again."
            exit 1
            ;;
        *)
            echo -e "${RED}Invalid option. Installation cancelled.${NC}"
            exit 1
            ;;
    esac
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

# Update Dockge port configuration
echo "Updating Dockge port configuration..."
sed -i "s|5001:5001|$DOCKGE_PORT:5001|g" "$INSTALL_DIR/dockge/compose.yml"

# Update stack configurations
for stack in immich photoprism semaphore; do
    if [ -f "$STACKS_DIR/$stack/compose.yml" ]; then
        echo "Updating $stack configuration..."
        # Update library paths to use configured directory
        sed -i "s|/mnt/photovault/library|$PHOTO_LIBRARY_PATH|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|/mnt/photovault/apps|$PHOTOS_DIR/apps|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Update relative paths to absolute paths
        sed -i "s|\\./mariadb-data|$STACKS_DIR/$stack/mariadb-data|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./temp|$STACKS_DIR/$stack/temp|g" "$STACKS_DIR/$stack/compose.yml"
        sed -i "s|\\./data|$STACKS_DIR/$stack/data|g" "$STACKS_DIR/$stack/compose.yml"
        
        # Update ports to use configured values
        case $stack in
            immich)
                sed -i "s|2283:3001|$IMMICH_PORT:3001|g" "$STACKS_DIR/$stack/compose.yml"
                ;;
            photoprism)
                sed -i "s|2342:2342|$PHOTOPRISM_PORT:2342|g" "$STACKS_DIR/$stack/compose.yml"
                ;;
            semaphore)
                sed -i "s|3000:3000|$SEMAPHORE_PORT:3000|g" "$STACKS_DIR/$stack/compose.yml"
                ;;
        esac
        
        # Create necessary directories
        case $stack in
            immich|photoprism)
                mkdir -p "$STACKS_DIR/$stack/mariadb-data"
                mkdir -p "$STACKS_DIR/$stack/temp"
                mkdir -p "$STACKS_DIR/$stack/data"
                if [ "${create_subdirs}" = "true" ]; then
                    mkdir -p "$PHOTOS_DIR/apps/$stack"
                fi
                ;;
            semaphore)
                mkdir -p "$STACKS_DIR/$stack/data"
                mkdir -p "$STACKS_DIR/$stack/config"
                mkdir -p "$STACKS_DIR/$stack/tmp"
                mkdir -p "$STACKS_DIR/$stack/ssh-keys"
                mkdir -p "$STACKS_DIR/$stack/ansible"
                
                # Generate secure access key encryption if not exists
                if [ ! -f "$STACKS_DIR/$stack/.env" ]; then
                    echo "Generating Semaphore configuration..."
                    ACCESS_KEY=$(openssl rand -base64 32 2>/dev/null || echo "ChangeThisToASecureRandomBase64String")
                    
                    cat > "$STACKS_DIR/$stack/.env" << EOF
# Semaphore Configuration
SEMAPHORE_ADMIN_PASSWORD=changeme123!
SEMAPHORE_ADMIN_EMAIL=admin@localhost
SEMAPHORE_ACCESS_KEY_ENCRYPTION=$ACCESS_KEY
EOF
                    echo "  ✅ Generated .env file with secure access key"
                    echo "  ⚠️  Please change the default admin password in $STACKS_DIR/$stack/.env"
                fi
                ;;
        esac
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
    echo -e "${GREEN}Dockge is running and accessible at: http://localhost:$DOCKGE_PORT${NC}"
    
    # Wait for Dockge to be ready
    echo -e "${YELLOW}Waiting for Dockge to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$DOCKGE_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}Dockge is ready at http://localhost:$DOCKGE_PORT${NC}"
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
echo "  Dockge: http://localhost:$DOCKGE_PORT"
[ "${prepare_immich}" = "true" ] && echo "  Immich: http://localhost:$IMMICH_PORT"
[ "${prepare_photoprism}" = "true" ] && echo "  PhotoPrism: http://localhost:$PHOTOPRISM_PORT"
[ "${prepare_semaphore}" = "true" ] && echo "  Semaphore: http://localhost:$SEMAPHORE_PORT"

echo ""
echo "Installation process complete. Check the logs above for any errors."