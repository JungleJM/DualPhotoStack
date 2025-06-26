#!/bin/bash
# DPS Agentic Testing Loop
# Downloads latest release and tests startup

set -e  # Exit on any error

echo "🤖 DPS AGENTIC TESTING LOOP STARTING..."
echo "=============================================="

# Configuration
REPO="JungleJM/DualPhotoStack"
TEMP_DIR="/tmp/dps-test-$$"
LOG_FILE="$TEMP_DIR/test-results.log"

# Create temporary directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo "📁 Working directory: $TEMP_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup
cleanup() {
    log "🧹 Cleaning up test files..."
    cd /tmp
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Check for modes first
INTERACTIVE_MODE=false
LOCALDEV_MODE=false

for arg in "$@"; do
    case $arg in
        --interactive|-i)
            INTERACTIVE_MODE=true
            ;;
        --localdev|-l)
            LOCALDEV_MODE=true
            ;;
        --remote-logs|--vm-testing)
            REMOTE_LOGS=true
            ;;
    esac
done

# Set remote logging flag
if [ "$REMOTE_LOGS" = "true" ]; then
    REMOTE_FLAG="--remote-logs"
    log "📡 Remote logging enabled - logs will be streamed to GitHub Gist"
else
    REMOTE_FLAG=""
fi

# Check for localdev mode early
if [ "$LOCALDEV_MODE" = "true" ]; then
    log "🔧 LOCALDEV MODE: Skipping download, using local source..."
    PROJECT_DIR="/var/home/j/Documents/DualPhotoStack"
    
    if [ ! -d "$PROJECT_DIR/electron-app" ]; then
        log "❌ Local project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    log "📦 Building local electron app..."
    cd "$PROJECT_DIR/electron-app"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "📥 Installing dependencies..."
        npm install
    fi
    
    # Run directly with electron
    log "🚀 Starting local DPS with electron..."
    APPIMAGE_FILE="npm start --"
    cd "$TEMP_DIR"
    
    # Skip download section for localdev
    SKIP_DOWNLOAD=true
else
    SKIP_DOWNLOAD=false
fi

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup
cleanup() {
    log "🧹 Cleaning up test files..."
    cd /tmp
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

if [ "$SKIP_DOWNLOAD" = "false" ]; then
    # Get latest release information using public API (including pre-releases)
    log "🔍 Getting latest release information..."
    RELEASES_JSON=$(curl -s "https://api.github.com/repos/$REPO/releases")

    # Get the highest build number from v0.25.x releases
    V025_RELEASES=$(echo "$RELEASES_JSON" | grep '"tag_name".*v0\.25\.' | sed 's/.*"tag_name": "\([^"]*\)".*/\1/')
    TAG=$(echo "$V025_RELEASES" | sort -V | tail -1)

    # Get the corresponding release name
    RELEASE_NAME=$(echo "$RELEASES_JSON" | grep -A5 -B5 "\"tag_name\": \"$TAG\"" | grep '"name"' | head -1 | sed 's/.*"name": "\([^"]*\)".*/\1/')

    log "📦 Latest release: $TAG"
    log "📋 Release name: $RELEASE_NAME"

    # Download the x64 AppImage
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/DPS-Linux-x64.AppImage"
    APPIMAGE_FILE="DPS-Linux-x64.AppImage"

    log "⬇️  Downloading: $DOWNLOAD_URL"
    if wget -q "$DOWNLOAD_URL" -O "$APPIMAGE_FILE"; then
        log "✅ Download successful"
    else
        log "❌ Download failed"
        exit 1
    fi

    # Verify file was downloaded
    if [ -f "$APPIMAGE_FILE" ]; then
        SIZE=$(du -h "$APPIMAGE_FILE" | cut -f1)
        log "📊 File size: $SIZE"
        log "✅ AppImage file exists"
    else
        log "❌ AppImage file not found after download"
        exit 1
    fi

    # Make executable
    log "🔧 Making AppImage executable..."
    chmod +x "$APPIMAGE_FILE"

    # Test that it's executable
    if [ -x "$APPIMAGE_FILE" ]; then
        log "✅ AppImage is executable"
    else
        log "❌ AppImage is not executable"
        exit 1
    fi
else
    log "⏭️  Skipping download in LOCALDEV mode"
fi

# Install required dependencies (if needed)
log "📋 Checking system dependencies..."
if command -v dpkg >/dev/null 2>&1; then
    # Debian/Ubuntu system
    MISSING_DEPS=""
    for dep in libgtk-3-0 libxss1 libnss3 libasound2; do
        if ! dpkg -l | grep -q "^ii  $dep "; then
            MISSING_DEPS="$MISSING_DEPS $dep"
        fi
    done
    
    if [ -n "$MISSING_DEPS" ]; then
        log "⚠️  Missing dependencies:$MISSING_DEPS"
        log "💡 Run: sudo apt install$MISSING_DEPS"
    else
        log "✅ All dependencies present"
    fi
elif command -v rpm >/dev/null 2>&1; then
    # Fedora/RHEL system
    MISSING_DEPS=""
    for dep in gtk3 libXScrnSaver nss alsa-lib; do
        if ! rpm -q "$dep" >/dev/null 2>&1; then
            MISSING_DEPS="$MISSING_DEPS $dep"
        fi
    done
    
    if [ -n "$MISSING_DEPS" ]; then
        log "⚠️  Missing dependencies:$MISSING_DEPS"
        log "💡 Run: sudo dnf install$MISSING_DEPS"
    else
        log "✅ All dependencies present"
    fi
else
    log "⚠️  Cannot check dependencies - unknown package manager"
    log "💡 Ensure GTK3, X11, NSS, and ALSA libraries are installed"
fi

# Test startup (headless mode with timeout)
log "🚀 Testing DPS startup..."


if [ "$LOCALDEV_MODE" = "true" ]; then
    log "🔧 LOCALDEV mode: Using local source code"
    TIMEOUT_SECONDS=300  # 5 minutes for development
    SLEEP_TIME=300
    if [ "$INTERACTIVE_MODE" = "true" ]; then
        log "📝 Starting app in LOCALDEV + INTERACTIVE mode (5 minute timeout)..."
    else
        log "📝 Starting app in LOCALDEV mode (5 minute timeout)..."
    fi
elif [ "$INTERACTIVE_MODE" = "true" ]; then
    log "📝 Starting app in INTERACTIVE mode (3 minute timeout)..."
    TIMEOUT_SECONDS=180
    SLEEP_TIME=180
else
    log "📝 Starting app in TESTING mode (10 second timeout)..."
    TIMEOUT_SECONDS=10
    SLEEP_TIME=5
fi

# Create a test script that runs the app and captures output
cat > test-startup.sh << 'EOF'
#!/bin/bash
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
XVFB_PID=$!
sleep 1

timeout ${TIMEOUT_SECONDS}s ./DPS-Linux-x64.AppImage --no-sandbox --verbose-startup --force-window-visible > app-output.log 2>&1 &
APP_PID=$!

if [ "$INTERACTIVE_MODE" = "true" ]; then
    echo "=== INTERACTIVE MODE ==="
    echo "DPS is running for 3 minutes. You can interact with it now."
    echo "Press Ctrl+C to stop early, or wait for automatic timeout."
    echo "App PID: $APP_PID"
    echo "========================"
    sleep $SLEEP_TIME
else
    sleep $SLEEP_TIME
fi

# Check if app is still running
if kill -0 $APP_PID 2>/dev/null; then
    if [ "$INTERACTIVE_MODE" = "true" ]; then
        echo "Interactive session completed - stopping app"
    else
        echo "App is running"
    fi
    kill $APP_PID 2>/dev/null
    wait $APP_PID 2>/dev/null
fi

kill $XVFB_PID 2>/dev/null
wait $XVFB_PID 2>/dev/null
EOF

chmod +x test-startup.sh

# Run the test (try without virtual display first, fallback to Xvfb)
if [ "$LOCALDEV_MODE" = "true" ]; then
    # Local development mode
    log "🎮 Starting DPS in LOCALDEV mode..."
    cd "$PROJECT_DIR/electron-app"
    if [ "$INTERACTIVE_MODE" = "true" ]; then
        log "🔧 Running: npm start -- --verbose-startup --force-window-visible $REMOTE_FLAG"
        timeout ${TIMEOUT_SECONDS}s npm start -- --verbose-startup --force-window-visible $REMOTE_FLAG > "$TEMP_DIR/app-output.log" 2>&1
    else
        log "🔧 Running: npm start -- --no-sandbox --headless --verbose-startup $REMOTE_FLAG"
        timeout ${TIMEOUT_SECONDS}s npm start -- --no-sandbox --headless --verbose-startup $REMOTE_FLAG > "$TEMP_DIR/app-output.log" 2>&1
    fi
    cd "$TEMP_DIR"
elif [ "$INTERACTIVE_MODE" = "true" ]; then
    # Interactive mode - run with display for user interaction
    log "🎮 Starting DPS in INTERACTIVE mode..."
    if timeout ${TIMEOUT_SECONDS}s ./"$APPIMAGE_FILE" --verbose-startup --force-window-visible $REMOTE_FLAG > app-output.log 2>&1; then
        log "✅ Interactive session completed"
    else
        log "⚠️  Interactive session ended (timeout or closed)"
    fi
else
    # Automated testing mode
    if timeout ${TIMEOUT_SECONDS}s ./"$APPIMAGE_FILE" --no-sandbox --headless --verbose-startup --force-window-visible $REMOTE_FLAG > app-output.log 2>&1; then
        log "✅ App started successfully (no display)"
    elif ./test-startup.sh; then
        log "✅ App started successfully (virtual display)"
    else
        log "⚠️  App startup test completed (may need display)"
    fi
fi

# Analyze output
log "📊 Analyzing startup output..."
if [ -f app-output.log ]; then
    # Check for success indicators
    if grep -q "DPS MISSION COMPLETED" app-output.log; then
        log "🎉 SUCCESS: Found 'DPS MISSION COMPLETED' message"
    else
        log "❌ MISSING: 'DPS MISSION COMPLETED' message not found"
    fi
    
    if grep -q "DPS IS READY FOR USE" app-output.log; then
        log "🎉 SUCCESS: Found 'DPS IS READY FOR USE' message"
    else
        log "❌ MISSING: 'DPS IS READY FOR USE' message not found"
    fi
    
    if grep -q "Window created and displayed" app-output.log; then
        log "✅ SUCCESS: Window creation confirmed"
    else
        log "❌ MISSING: Window creation not confirmed"
    fi
    
    # Check for errors
    if grep -i -E "(error|failed|exception)" app-output.log; then
        log "⚠️  POTENTIAL ISSUES found in output:"
        grep -i -E "(error|failed|exception)" app-output.log | head -5 | while read line; do
            log "   $line"
        done
    else
        log "✅ No obvious errors in output"
    fi
    
    log "📋 Full app output:"
    log "===================="
    cat app-output.log | head -20 | while read line; do
        log "   $line"
    done
    log "===================="
else
    log "❌ No app output file found"
fi

# Test results summary
log ""
log "🎯 TEST RESULTS SUMMARY:"
log "========================"
log "✅ Download: SUCCESS"
log "✅ File verification: SUCCESS"
log "✅ Permissions: SUCCESS"

if [ -f app-output.log ] && grep -q "DPS IS READY FOR USE" app-output.log; then
    log "🎉 OVERALL RESULT: SUCCESS - DPS startup working!"
    echo ""
    echo "🚀 DPS AGENTIC TEST COMPLETED SUCCESSFULLY!"
    echo "The Electron app downloaded and started without issues."
    exit 0
else
    log "⚠️  OVERALL RESULT: NEEDS INVESTIGATION"
    echo ""
    echo "⚠️  DPS startup needs investigation. Check logs above."
    exit 1
fi