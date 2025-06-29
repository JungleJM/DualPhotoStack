# Dual Photo Stack (DPS)

A comprehensive photo management solution that coordinates **Immich** and **PhotoPrism** to share the same photo library while intelligently managing processing windows to avoid resource conflicts.

## 🎯 Project Vision

DPS provides an **Electron-based interface** for easy deployment and configuration of a coordinated photo management system that gives you the best of both worlds:

- **Immich**: Modern interface, excellent mobile app, fast backup processing
- **PhotoPrism**: Advanced AI features, facial recognition, powerful search capabilities
- **Shared Library**: Both services access the same photo collection
- **Intelligent Coordination**: Automated processing windows prevent resource conflicts

## 🏗️ Architecture Overview

### Processing Windows
- **Immich Processing**: 11:00 AM - 1:00 PM (2 hours, mobile backup priority)
- **PhotoPrism Processing**: 1:05 PM - 10:55 AM (22+ hours, AI analysis)

### Network Access
- **Multi-interface binding**: localhost + LAN + Tailscale support
- **Secure configuration**: No wildcard (0.0.0.0) exposure
- **Automatic detection**: Network interfaces and service URLs

### Container Management
- **Dockge Integration**: Easy container management interface
- **Stack Deployment**: Services deployed to `/opt/stacks/`
- **Health Monitoring**: Built-in service health checks

## 🚀 Deployment Modes

### 1. DPS Only
- Install Immich + PhotoPrism + Dockge
- Manual processing window management

### 2. Add to Existing Semaphore
- Connect to your existing Semaphore instance
- Upload coordination playbooks
- Automated processing scheduling

### 3. Full Installation
- Complete setup including local Semaphore
- Fully automated coordination
- One-click deployment

## 📁 Project Structure

```
DualPhotoStack/
├── electron-app/          # Electron GUI application (Phase 2)
├── docker-templates/      # Parameterized Docker Compose templates
├── scripts/              # Template engine and deployment utilities
├── ansible/              # Semaphore playbooks for coordination
├── docs/                 # Implementation plan and documentation
└── examples/             # Example configurations
```

## 🔧 Current Status: Phase 2 Complete

### ✅ Phase 1 Complete: Core Infrastructure
- Docker Compose template system with variable substitution
- Multi-interface network binding (localhost + LAN + Tailscale)
- Environment file templates with auto-generated secrets
- Configuration schema and validation
- Template processing engine

### ✅ Phase 2 Complete: Electron Application
- **Working GUI application** with configuration wizard
- **File browser integration** with GTK compatibility fixes
- **System validation** for Docker, platform, and dependencies
- **Multi-interface network detection** (localhost + LAN + Tailscale)
- **Automated deployment** to `/opt/stacks/` with Dockge integration
- **Remote logging system** for VM testing and troubleshooting
- **Comprehensive testing suite** with async cleanup
- **GitHub Actions CI/CD** with automated builds and releases

### ✅ Major Issues Resolved:
- **GTK file dialog crashes** - Fixed with multi-tier error handling
- **Async test cleanup** - Resolved Jest hanging issues
- **Remote logging reliability** - Hardcoded API keys, local fallback
- **Build system stability** - Automated AppImage packaging

### 🎯 Next Phase: Universal GUI Interface (Optional)
- Interface files created for framework decoupling
- Plugin architecture designed for business logic separation
- Dual UI support alongside existing Electron app

## 🚀 Quick Start

### Download and Run Latest Release

```bash
# Download the latest DPS release (includes prereleases)
wget $(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases | jq -r '.[0].assets[] | select(.name | contains("DPS-Linux-x64.AppImage")) | .browser_download_url')

# Make executable and run
chmod +x DPS-Linux-x64.AppImage
./DPS-Linux-x64.AppImage
```

**Alternative one-liner:**
```bash
wget $(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases | jq -r '.[0].assets[] | select(.name | contains("DPS-Linux-x64.AppImage")) | .browser_download_url') && chmod +x DPS-Linux-x64.AppImage && ./DPS-Linux-x64.AppImage
```

**For systems without jq:**
```bash
# Direct download of current latest build
wget https://github.com/JungleJM/DualPhotoStack/releases/download/v0.25.0-build-9/DPS-Linux-x64.AppImage
chmod +x DPS-Linux-x64.AppImage
./DPS-Linux-x64.AppImage
```

### Manual Installation
1. **Download** the latest release from [GitHub Releases](https://github.com/JungleJM/DualPhotoStack/releases)
2. **Make executable**: `chmod +x DPS-Linux-x64.AppImage`  
3. **Run**: `./DPS-Linux-x64.AppImage`
4. **Follow** the configuration wizard

## 🧪 Development & Testing

### Testing & Development Tools

#### Automated Testing Scripts
```bash
# Download and test latest release automatically
./test-download-and-run.sh

# Local development testing (skip download)
./test-download-and-run.sh --localdev

# Interactive mode with extended timeout
./test-download-and-run.sh --interactive
```

#### Clean Installation Testing
```bash
# Completely remove DPS and all related files
./uninstall-dps.sh

# Verify system is clean for fresh install
./verify-clean-install.sh
```

### Remote Logging (Enabled by Default)
DPS automatically streams logs to Pastebin for easy troubleshooting:

```bash
# Remote logging is enabled by default - just run DPS
./DPS-Linux-x64.AppImage

# To disable remote logging if needed
./DPS-Linux-x64.AppImage --no-remote-logs
```

The remote logger automatically:
- 📡 Creates a daily Pastebin for your user/hostname
- 🔄 Streams all logs in real-time (every 15 seconds)  
- 📱 Provides a URL you can bookmark and return to all day
- 🔗 Shows the same URL for multiple sessions on the same day
- 🧹 Adds session markers to separate different runs

### Development & Testing Tools
- **`uninstall-dps.sh`**: Complete removal of all DPS files, Docker containers, logs, and configuration
- **`verify-clean-install.sh`**: Verification that system is clean for fresh installation
- **`test-download-and-run.sh`**: Automated testing with multiple modes:
  - `--localdev`: Skip download, test local code
  - `--interactive`: Extended timeout for manual testing
  - `--timeout=360`: Custom timeout (default 120s)
- **Remote logging**: Automatic Pastebin streaming for VM testing
- **Agentic testing**: Automated download-test-fix cycles

## 📖 Documentation

- **[Current Status](Docs/CURRENT_STATUS.md)** - Project state and completed features
- **[Implementation Plan](Docs/IMPLEMENTATION_PLAN.md)** - Development roadmap with progress tracking
- **[Development Strategy](Docs/DEVELOPMENT_STRATEGY.md)** - Linux-first approach
- **[Linux Requirements](Docs/LINUX_REQUIREMENTS.md)** - Platform requirements and assumptions
- **[Decoupling Guide](Docs/DECOUPLING.md)** - Universal GUI interface architecture
- **[Scripts Documentation](scripts/README.md)** - Template engine and automation tools
- **[Interface Documentation](interface/README.md)** - Universal GUI framework integration

## 🔒 Security Features

- Auto-generated secure passwords (24+ characters)
- No hardcoded credentials in templates
- Controlled interface binding (no wildcard exposure)
- Encrypted API key storage

## 🎛️ Legacy: Original EPS System

This repository evolved from the original **Operation EPS (Effortless Photo Stack)** - an Ansible-based coordination system. The legacy configuration is preserved in the `Ansible Playbook/` directory and provides the foundation for the automated coordination features.
