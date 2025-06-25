# DPS Development Strategy: Linux-First Approach

## 🎯 **Primary Target: Linux Systems**

DPS is designed primarily for **Linux-based home servers and self-hosted environments** where photo management systems typically run.

## 📋 **Linux-First Development Principles**

### ✅ **Core Assumptions:**
- **Target Environment**: Ubuntu/Debian/RHEL-based servers
- **Docker**: Standard Docker Engine (not Docker Desktop)
- **User Context**: Non-root user with sudo privileges
- **File System**: Standard Linux filesystem with `/opt/` access
- **Network**: Standard Linux network interfaces (eth0, wlan0, etc.)
- **Tailscale**: Standard `/usr/bin/tailscale` installation

### 🏗️ **Linux-Optimized Architecture:**

#### File Structure
```
/opt/stacks/              # Dockge stacks (standard Linux location)
├── immich/
├── photoprism/
├── dockge/
└── semaphore/           # Optional

/home/user/photos/       # User photo library
/home/user/dps-data/     # Application data storage
```

#### Network Configuration
- **Primary Interface**: Auto-detect first non-loopback interface
- **Tailscale**: Standard `tailscale ip --4` command
- **Ports**: Standard binding without macOS-specific considerations

#### User Permissions
- **Standard Linux UIDs**: 1000+ for regular users
- **Sudo Access**: Required for `/opt/stacks` creation
- **Docker Group**: User should be in `docker` group

## 🚀 **Development Roadmap**

### Phase 2: Linux-First Electron App
- **Target Platform**: Linux AppImage/Snap/Deb
- **UI Framework**: Electron with Linux-native styling
- **File Dialogs**: Linux file picker integration
- **Privilege Escalation**: `sudo` command integration
- **Package Management**: Detect apt/yum/pacman for Docker installation

### Phase 3: Linux Deployment & Testing
- **Test Environments**: Ubuntu 22.04, Debian 12, CentOS Stream
- **Docker Integration**: Docker Engine compatibility
- **Service Management**: systemd integration considerations
- **Network Configuration**: iptables/firewall compatibility

### Phase 4: Cross-Platform (Future Enhancement)
- **macOS Support**: Add after Linux version is stable
- **Windows Support**: WSL2-based implementation
- **Simplified Deployment**: Universal installer with platform detection

## 📊 **Linux-Specific Features to Implement**

### 1. Docker Engine Integration
```javascript
// Linux-specific Docker detection
const detectLinuxDocker = () => {
  return {
    dockerEngine: commandExists('docker'),
    dockerCompose: commandExists('docker-compose') || commandExists('docker compose'),
    userInDockerGroup: checkDockerGroup(),
    dockerService: checkSystemdService('docker')
  };
};
```

### 2. System Service Integration
```javascript
// Optional: systemd service creation for coordination
const createSystemdService = (serviceName) => {
  const serviceFile = `
[Unit]
Description=DPS ${serviceName} Coordination
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker compose -f /opt/stacks/${serviceName}/docker-compose.yml up -d

[Install]
WantedBy=multi-user.target
`;
  // Write to /etc/systemd/system/
};
```

### 3. Linux Package Manager Integration
```javascript
// Auto-install Docker if missing
const installDockerLinux = async () => {
  const distro = detectLinuxDistro();
  
  switch (distro.family) {
    case 'debian':
      return execSudo('apt update && apt install -y docker.io docker-compose');
    case 'rhel':
      return execSudo('dnf install -y docker docker-compose');
    case 'arch':
      return execSudo('pacman -S docker docker-compose');
  }
};
```

## 🎭 **Testing Strategy**

### Primary Test Environments
1. **Ubuntu 22.04 LTS** (Primary target)
2. **Debian 12** (Server deployments)
3. **Rocky Linux 9** (Enterprise environments)

### Secondary Test Environments
4. **Raspberry Pi OS** (ARM compatibility)
5. **Ubuntu Server** (Headless testing)

### Test Scenarios
- Fresh Linux installation with Docker
- Existing Linux server with containers
- User without sudo access (error handling)
- Network-restricted environment (no internet)
- Different filesystem layouts

## ⚠️ **Scope Management**

### ✅ **In Scope (Linux-First)**:
- Standard Linux Docker Engine integration
- `/opt/stacks` deployment structure
- Linux network interface detection
- Standard Tailscale CLI integration
- Electron AppImage distribution
- Ubuntu/Debian primary support

### ❌ **Out of Scope (Future Phases)**:
- macOS-specific path handling
- Docker Desktop integration
- Windows/WSL2 support
- iOS/Android mobile apps
- Advanced network configuration (VPNs beyond Tailscale)

## 🔄 **Migration Strategy for Future Cross-Platform**

When we eventually add cross-platform support:

1. **Abstraction Layer**: Create platform detection module
2. **Configuration Profiles**: Platform-specific defaults
3. **Installer Variants**: Separate packages per platform
4. **Testing Matrix**: Expand to include macOS/Windows

## ✅ **Success Metrics for Linux-First Approach**

- **Primary Goal**: Working DPS deployment on Ubuntu 22.04
- **Secondary Goal**: Compatible with Debian/RHEL families
- **User Experience**: Single-command installation on fresh Linux system
- **Reliability**: 99% success rate on standard Linux distributions

---

**Bottom Line**: Focus entirely on Linux until we have a rock-solid, production-ready Linux version. Then consider platform expansion as a separate project phase.