# DPS Linux Testing Guide

## 🚀 Quick Start (Linux VM)

### Option 1: One-Command Test
```bash
git clone https://github.com/JungleJM/DualPhotoStack.git
cd DualPhotoStack
chmod +x test-linux.sh
./test-linux.sh
```

### Option 2: Manual Testing
```bash
# 1. Clone repository
git clone https://github.com/JungleJM/DualPhotoStack.git
cd DualPhotoStack

# 2. Test Phase 1 (Template Engine)
node test-template-engine.js

# 3. Install and test Electron app
cd electron-app
npm install
npm run dev
```

## 📋 Prerequisites

- **Linux Distribution**: Ubuntu 20.04+, Debian 11+, or RHEL 8+
- **Node.js**: 18.0+ (auto-installed by test script)
- **Display**: GUI environment or X11 forwarding for Electron
- **Memory**: 2GB+ RAM recommended
- **Disk**: 1GB+ free space

## 🧪 What to Test

### 1. Template Engine (Phase 1)
- ✅ Network detection
- ✅ Configuration generation
- ✅ Docker Compose file creation
- ✅ Variable substitution

### 2. Electron App (Phase 2)
- ✅ Welcome screen and mode selection
- ✅ System requirements check
- ✅ Network interface detection
- ✅ File/directory selection dialogs
- ✅ Deployment simulation
- ✅ Success screen with access URLs

## 🐛 Troubleshooting

### "No display detected"
```bash
# If using SSH, enable X11 forwarding:
ssh -X username@linux-vm

# Or install desktop environment:
sudo apt install ubuntu-desktop-minimal
```

### "Failed to install dependencies"
```bash
# Install build tools:
sudo apt install build-essential python3

# Or try using npm with legacy peer deps:
npm install --legacy-peer-deps
```

### "Docker not found"
```bash
# Install Docker (optional for testing):
sudo apt update
sudo apt install docker.io
sudo usermod -aG docker $USER
# Logout and login again
```

### "Electron won't start"
```bash
# Install missing GUI libraries:
sudo apt install libgtk-3-dev libxss1 libnss3-dev libasound2-dev
```

## 📊 Expected Results

### Template Engine Test Output:
```
🔧 Testing DPS Template Engine
✅ Network Configuration: Working
✅ Tailscale detection: Working (or Not available)
✅ Template processing: Working
✅ URL generation: Working
✅ Secret generation: Working
🎉 All template engine tests passed!
```

### Electron App:
- **Welcome Screen**: Shows 3 deployment modes
- **System Check**: Validates Linux platform, detects Docker, shows network info
- **Configuration**: File browser dialogs work, network info displayed
- **Deployment**: Progress steps, real-time logging
- **Success**: Shows access URLs for all services

## 🎯 Success Criteria

1. **Template engine tests pass** (5/5)
2. **Electron app opens** without errors
3. **System checks pass** (at least platform + network)
4. **File dialogs work** (can select directories)
5. **Deployment simulation completes** (generates files in /tmp)

## 📁 Generated Files

After testing, check:
```bash
ls -la /tmp/dps-test-stacks/
# Should contain:
# - immich/ (docker-compose.yml + .env)
# - photoprism/ (docker-compose.yml + .env)  
# - dockge/ (docker-compose.yml)
# - semaphore/ (docker-compose.yml + .env) [if full install]
```

## 🚨 Known Issues

- **macOS**: This is Linux-focused; some features may not work
- **WSL**: Should work but not fully tested
- **Headless**: Requires X11 forwarding or VNC for GUI
- **ARM**: Should work but may need native compilation

## 📞 Support

If testing fails:
1. Check the error message and troubleshooting section
2. Verify prerequisites are met
3. Try manual installation steps
4. Check GitHub Issues for known problems