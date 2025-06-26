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

## 🔧 Current Status

### ✅ Phase 1 Complete: Core Infrastructure
- Docker Compose template system with variable substitution
- Multi-interface network binding (localhost + LAN + Tailscale)
- Environment file templates with auto-generated secrets
- Configuration schema and validation
- Template processing engine

### 🚧 In Development: Phase 2 - Electron Application

## 🚀 Quick Start

### Download and Run Latest Release

```bash
# Download the latest DPS release
wget $(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases/latest | grep -o "https://.*DPS-Linux-x64\.AppImage")

# Make executable and run
chmod +x DPS-Linux-x64.AppImage
./DPS-Linux-x64.AppImage
```

**Alternative one-liner:**
```bash
wget $(curl -s https://api.github.com/repos/JungleJM/DualPhotoStack/releases/latest | grep -o "https://.*DPS-Linux-x64\.AppImage") && chmod +x DPS-Linux-x64.AppImage && ./DPS-Linux-x64.AppImage
```

### Manual Installation
1. **Download** the latest release from [GitHub Releases](https://github.com/JungleJM/DualPhotoStack/releases/latest)
2. **Make executable**: `chmod +x DPS-Linux-x64.AppImage`  
3. **Run**: `./DPS-Linux-x64.AppImage`
4. **Follow** the configuration wizard

## 🧪 Development & Testing

### Clean Installation Testing
For repeated testing on the same system:

```bash
# Completely remove DPS and all related files
./uninstall-dps.sh

# Verify system is clean for fresh install
./verify-clean-install.sh

# Test with local development code
./test-download-and-run.sh --localdev --interactive
```

### Remote Logging for VM Testing
Stream logs to GitHub Gist for monitoring from any device:

```bash
# Enable remote logging with any test mode
./test-download-and-run.sh --localdev --interactive --remote-logs

# Or use the dedicated remote logging test
./test-remote-logging.sh
```

The remote logger will:
- 📡 Create a private GitHub Gist for the session
- 🔄 Stream all logs in real-time (every 10 seconds)
- 📱 Provide a URL you can monitor from any device
- 🧹 Automatically close the session when the app exits

### Uninstall Scripts
- **`uninstall-dps.sh`**: Complete removal of all DPS files, Docker containers, logs, and configuration
- **`verify-clean-install.sh`**: Verification that system is clean for fresh installation
- **`test-download-and-run.sh`**: Automated testing with `--localdev` mode for development

## 📖 Documentation

- **[Implementation Plan](Docs/IMPLEMENTATION_PLAN.md)** - Complete development roadmap
- **[Scripts README](scripts/README.md)** - Template engine documentation

## 🔒 Security Features

- Auto-generated secure passwords (24+ characters)
- No hardcoded credentials in templates
- Controlled interface binding (no wildcard exposure)
- Encrypted API key storage

## 🎛️ Legacy: Original EPS System

This repository evolved from the original **Operation EPS (Effortless Photo Stack)** - an Ansible-based coordination system. The legacy configuration is preserved in the `Ansible Playbook/` directory and provides the foundation for the automated coordination features.
