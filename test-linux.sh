#!/bin/bash
# DPS Linux Testing Script
# Run this on a fresh Linux VM to test the Electron app

set -e  # Exit on any error

echo "🐧 DPS Linux Testing Script"
echo "============================"

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is for Linux only"
    exit 1
fi

# Check if running as root (not recommended)
if [[ $EUID -eq 0 ]]; then
    echo "⚠️  Running as root is not recommended"
    echo "   Please run as a regular user with sudo privileges"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 System Information:"
echo "  OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown Linux")"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo

# Check prerequisites
echo "🔍 Checking Prerequisites..."

# Check if OS is immutable (Silverblue, Kinoite, etc.)
IMMUTABLE_OS=false
DISTROBOX_SETUP=false

# Detect immutable OS variants
if command -v ostree &> /dev/null || [[ -f /run/ostree-booted ]]; then
    IMMUTABLE_OS=true
    echo "  🔒 Immutable OS detected (OSTree-based)"
elif [[ -f /etc/os-release ]]; then
    # Check for specific immutable distributions
    if grep -qi "silverblue\|kinoite\|sericea\|onyx" /etc/os-release; then
        IMMUTABLE_OS=true
        echo "  🔒 Immutable OS detected (Fedora variant)"
    elif grep -qi "opensuse.*microos\|opensuse.*kalpa" /etc/os-release; then
        IMMUTABLE_OS=true
        echo "  🔒 Immutable OS detected (openSUSE variant)"
    fi
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node.js: $NODE_VERSION"
    
    # Check if version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [[ $NODE_MAJOR -lt 18 ]]; then
        echo "  ⚠️  Node.js version is too old (need 18+)"
        
        if [[ "$IMMUTABLE_OS" == "true" ]]; then
            echo "     Setting up distrobox container for newer Node.js..."
            # Handle immutable OS Node.js installation via distrobox
            if ! command -v distrobox &> /dev/null; then
                echo "  ❌ Distrobox not found. Please install distrobox for immutable OS support"
                echo "     Try: flatpak install flathub io.github.89luca89.distrobox"
                exit 1
            fi
            
            # Create distrobox container with Node.js
            echo "     Creating isolated container with Node.js, Electron, Git, and Docker..."
            if distrobox create --name dps-dev --image fedora:39 --yes &>/dev/null; then
                echo "     Installing development tools in container..."
                distrobox enter dps-dev -- bash -c "
                    sudo dnf update -y && 
                    sudo dnf install -y nodejs npm git docker docker-compose &&
                    sudo systemctl enable docker &&
                    node --version && npm --version
                " &>/dev/null
                
                if [[ $? -eq 0 ]]; then
                    echo "  ✅ Development container 'dps-dev' created successfully"
                    echo "     To use: distrobox enter dps-dev"
                    echo "     Container includes: Node.js 18+, npm, Git, Docker"
                    DISTROBOX_SETUP=true
                else
                    echo "  ❌ Failed to set up development container"
                    exit 1
                fi
            else
                echo "  ❌ Failed to create distrobox container"
                exit 1
            fi
        else
            echo "     Installing newer version..."
            # Regular mutable OS installation
            if command -v apt &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v dnf &> /dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
                sudo dnf install -y nodejs npm
            else
                echo "  ❌ Please install Node.js 18+ manually"
                exit 1
            fi
        fi
    fi
else
    echo "  ❌ Node.js not found, installing..."
    
    if [[ "$IMMUTABLE_OS" == "true" ]]; then
        echo "     Immutable OS detected - setting up distrobox container..."
        echo "     This creates an isolated container with Node.js, Electron, Git, and Docker"
        
        # Check if distrobox is available
        if ! command -v distrobox &> /dev/null; then
            echo "  ❌ Distrobox required for immutable OS support"
            echo "     Please install distrobox first:"
            echo "     - Flatpak: flatpak install flathub io.github.89luca89.distrobox"
            echo "     - Package manager: check your distribution's packages"
            exit 1
        fi
        
        # Create development container
        echo "     Creating development container..."
        if distrobox create --name dps-dev --image fedora:39 --yes; then
            echo "     Installing Node.js and development tools..."
            if distrobox enter dps-dev -- bash -c "
                sudo dnf update -y && 
                sudo dnf install -y nodejs npm git docker docker-compose &&
                sudo systemctl enable docker &&
                echo 'Node.js:' && node --version &&
                echo 'npm:' && npm --version &&
                echo 'Git:' && git --version &&
                echo 'Docker:' && docker --version
            "; then
                echo "  ✅ Development container 'dps-dev' ready"
                echo "     Container installed in: \$HOME/.local/share/containers/storage/volumes"
                echo "  📝 To use the container:"
                echo "     - Enter: distrobox enter dps-dev"
                echo "     - Run DPS: cd /path/to/DualPhotoStack && npm run dev"
                echo "     - Delete when done: distrobox rm dps-dev"
                DISTROBOX_SETUP=true
            else
                echo "  ❌ Failed to set up development tools in container"
                exit 1
            fi
        else
            echo "  ❌ Failed to create distrobox container"
            exit 1
        fi
    else
        # Auto-install Node.js based on distro (mutable OS)
        if command -v apt &> /dev/null; then
            sudo apt update
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo dnf install -y nodejs npm
        elif command -v pacman &> /dev/null; then
            sudo pacman -S nodejs npm
        else
            echo "  ❌ Unsupported package manager. Please install Node.js 18+ manually"
            exit 1
        fi
    fi
fi

# If we set up distrobox, inform user how to continue
if [[ "$DISTROBOX_SETUP" == "true" ]]; then
    echo
    echo "🔔 IMMUTABLE OS SETUP COMPLETE!"
    echo "   Development environment is ready in distrobox container 'dps-dev'"
    echo "   To continue testing:"
    echo "   1. distrobox enter dps-dev"
    echo "   2. cd /path/to/DualPhotoStack"
    echo "   3. Continue with this script inside the container"
    echo
    echo "   To delete the container later: distrobox rm dps-dev"
    echo
    read -p "   Continue testing in host system anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Please run the rest of the tests inside the distrobox container"
        exit 0
    fi
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "  ✅ npm: $NPM_VERSION"
else
    echo "  ❌ npm not found"
    exit 1
fi

# Check Docker (optional but recommended)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null || echo "Not running")
    echo "  ✅ Docker: $DOCKER_VERSION"
else
    echo "  ⚠️  Docker not found (recommended for full testing)"
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo "  ✅ Git: $GIT_VERSION"
else
    echo "  ❌ Git not found, installing..."
    if command -v apt &> /dev/null; then
        sudo apt install -y git
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y git
    elif command -v pacman &> /dev/null; then
        sudo pacman -S git
    fi
fi

# Check GUI Libraries for Electron
echo "🔍 Checking GUI Libraries for Electron..."

# Define required packages by distribution family
if command -v apt &> /dev/null; then
    # Debian/Ubuntu packages
    GUI_PACKAGES="libgtk-3-dev libxss1 libnss3-dev libasound2-dev"
    PKG_CHECK_CMD="dpkg -l"
    PKG_INSTALL_CMD="sudo apt install -y"
elif command -v dnf &> /dev/null; then
    # Red Hat/Rocky/AlmaLinux packages  
    GUI_PACKAGES="gtk3-devel libXScrnSaver nss-devel alsa-lib-devel"
    PKG_CHECK_CMD="rpm -q"
    PKG_INSTALL_CMD="sudo dnf install -y"
elif command -v pacman &> /dev/null; then
    # Arch Linux packages
    GUI_PACKAGES="gtk3 libxss nss alsa-lib"
    PKG_CHECK_CMD="pacman -Q"
    PKG_INSTALL_CMD="sudo pacman -S --noconfirm"
else
    echo "  ⚠️  Unknown package manager - skipping GUI library check"
    GUI_PACKAGES=""
fi

if [[ -n "$GUI_PACKAGES" ]]; then
    MISSING_PACKAGES=""
    
    for package in $GUI_PACKAGES; do
        if ! $PKG_CHECK_CMD $package &>/dev/null; then
            MISSING_PACKAGES="$MISSING_PACKAGES $package"
        fi
    done
    
    if [[ -n "$MISSING_PACKAGES" ]]; then
        echo "  ⚠️  Missing GUI libraries:$MISSING_PACKAGES"
        echo "     Installing required packages..."
        if $PKG_INSTALL_CMD $MISSING_PACKAGES; then
            echo "  ✅ GUI libraries installed successfully"
        else
            echo "  ❌ Failed to install GUI libraries"
            echo "     Electron may fail to launch"
        fi
    else
        echo "  ✅ All required GUI libraries are installed"
    fi
fi

echo

# Test Phase 1: Template Engine
echo "🧪 Phase 1: Testing Template Engine..."
if [[ -f "scripts/template-engine.js" ]]; then
    echo "  ✅ Template engine found"
    
    # Run template engine test
    if node test-template-engine.js; then
        echo "  ✅ Template engine test passed"
    else
        echo "  ❌ Template engine test failed"
        exit 1
    fi
else
    echo "  ❌ Template engine not found"
    echo "     Are you in the DualPhotoStack directory?"
    exit 1
fi

echo

# Test Phase 2: Electron App Structure
echo "🧪 Phase 2: Testing Electron App Structure..."
if node test-electron-structure.js; then
    echo "  ✅ Electron app structure valid"
else
    echo "  ❌ Electron app structure invalid"
    exit 1
fi

echo

# Install Electron Dependencies
echo "📦 Installing Electron Dependencies..."
cd electron-app

if npm install; then
    echo "  ✅ Dependencies installed successfully"
else
    echo "  ❌ Failed to install dependencies"
    exit 1
fi

echo

# Test Electron App
echo "🚀 Testing Electron App..."
echo "  This will open the DPS interface in a few seconds..."
echo "  Close the window when you're done testing"
echo

# Check if we have a display (for GUI)
if [[ -z "$DISPLAY" ]]; then
    echo "  ⚠️  No display detected"
    echo "     You may need to:"
    echo "     1. Run 'export DISPLAY=:0' if using local desktop"
    echo "     2. Use X11 forwarding if using SSH"
    echo "     3. Install a desktop environment if running headless"
    echo
    read -p "  Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "  Skipping GUI test"
        echo "  ✅ Structure tests passed - app should work with GUI"
        exit 0
    fi
fi

# Give user a moment to read
sleep 2

# Start Electron app
if npm run dev; then
    echo "  ✅ Electron app launched successfully"
else
    echo "  ❌ Failed to launch Electron app"
    echo "     This might be due to missing GUI libraries"
    echo "     Try: sudo apt install libgtk-3-dev libxss1 libnss3-dev libasound2-dev"
    exit 1
fi

echo
echo "🎉 DPS Linux Testing Complete!"
echo "   If the app opened and showed the interface, you're ready to go!"
echo
echo "📝 Next Steps:"
echo "   1. Test the system check functionality"
echo "   2. Try selecting library and data paths"
echo "   3. Test deployment simulation"
echo "   4. Check generated files in /tmp/dps-test-stacks"