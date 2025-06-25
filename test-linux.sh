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

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node.js: $NODE_VERSION"
    
    # Check if version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [[ $NODE_MAJOR -lt 18 ]]; then
        echo "  ⚠️  Node.js version is too old (need 18+)"
        echo "     Installing newer version..."
        
        # Install Node.js 18+
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
else
    echo "  ❌ Node.js not found, installing..."
    
    # Auto-install Node.js based on distro
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