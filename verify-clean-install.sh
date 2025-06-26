#!/bin/bash
# DPS Clean Install Verification Script
# Checks that system is clean for a fresh DPS installation

echo "🔍 DPS Clean Install Verification"
echo "================================="
echo

ISSUES_FOUND=0

# Function to check if path exists
check_path() {
    local path="$1"
    local desc="$2"
    
    if [ -e "$path" ]; then
        echo "❌ Found remaining: $desc ($path)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo "✅ Clean: $desc"
    fi
}

# Check DPS-related directories
echo "📁 Checking DPS directories..."
check_path "$HOME/.config/dps" "DPS configuration"
check_path "$HOME/.config/dual-photo-stack" "Electron app data"
check_path "$HOME/.local/share/docker-stacks" "Docker stacks"
check_path "$HOME/.cache/dps" "DPS cache"
check_path "/tmp/dps-test-config.json" "Test configuration"

echo

# Check Docker containers
echo "🐳 Checking Docker containers..."
DPS_CONTAINERS=$(docker ps -a --format "{{.Names}}" | grep -E "(immich|photoprism|dockge|semaphore|dps)" || true)
if [ -n "$DPS_CONTAINERS" ]; then
    echo "❌ Found DPS containers:"
    echo "$DPS_CONTAINERS" | sed 's/^/    /'
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No DPS containers found"
fi

# Check Docker volumes
echo "💾 Checking Docker volumes..."
DPS_VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "(immich|photoprism|dockge|semaphore|dps)" || true)
if [ -n "$DPS_VOLUMES" ]; then
    echo "❌ Found DPS volumes:"
    echo "$DPS_VOLUMES" | sed 's/^/    /'
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No DPS volumes found"
fi

echo

# Check for processes
echo "⚡ Checking for running DPS processes..."
DPS_PROCESSES=$(ps aux | grep -E "(electron.*dps|dual-photo-stack)" | grep -v grep || true)
if [ -n "$DPS_PROCESSES" ]; then
    echo "❌ Found DPS processes:"
    echo "$DPS_PROCESSES" | sed 's/^/    /'
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No DPS processes running"
fi

echo

# Summary
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "🎉 System is clean! Ready for fresh DPS installation."
    exit 0
else
    echo "⚠️  Found $ISSUES_FOUND issue(s). Run uninstall-dps.sh to clean up."
    exit 1
fi