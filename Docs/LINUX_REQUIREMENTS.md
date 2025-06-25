# DPS Linux Requirements & Assumptions

## 🐧 **Target Linux Environment**

### Primary Distributions
- **Ubuntu 22.04 LTS** (Primary development target)
- **Debian 12** (Bookworm)
- **Rocky Linux 9** / **AlmaLinux 9** (RHEL family)

### Secondary Support
- **Ubuntu 20.04 LTS** (Still widely used)
- **Raspberry Pi OS** (ARM compatibility)
- **Fedora 38+** (Latest features testing)

## 📋 **System Requirements**

### Hardware Minimums
- **CPU**: 2+ cores (4+ recommended for AI processing)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 50GB available space (excluding photo library)
- **Network**: Ethernet or Wi-Fi with internet access

### Software Prerequisites
- **Docker Engine**: 20.10+ (not Docker Desktop)
- **Docker Compose**: 2.0+ (V2 syntax)
- **Node.js**: 18+ (for development/testing only)
- **systemd**: For service management
- **sudo**: User must have sudo privileges

## 🔧 **Linux-Specific Assumptions**

### File System Structure
```
/opt/stacks/                    # Dockge managed stacks (requires sudo)
├── immich/
│   ├── docker-compose.yml
│   └── .env
├── photoprism/
│   ├── docker-compose.yml  
│   └── .env
├── dockge/
│   └── docker-compose.yml
└── semaphore/                  # Optional
    ├── docker-compose.yml
    └── .env

/home/$USER/                    # User-writable areas
├── Photos/                     # Photo library (user specified)
└── dps-data/                   # Application data (user specified)
    ├── immich/
    ├── photoprism/
    ├── dockge/
    └── semaphore/
```

### Network Configuration
- **Standard Interfaces**: eth0, wlan0, enp0s3, etc.
- **Docker Network**: `dps-network` bridge created automatically
- **Port Binding**: Multi-interface (localhost + LAN + Tailscale)
- **Firewall**: User responsible for opening ports if needed

### User & Permissions
- **User UID**: 1000+ (standard Linux user)
- **Docker Group**: User should be in `docker` group
- **Sudo Access**: Required for `/opt/stacks` creation only
- **File Ownership**: DPS maintains proper ownership of created files

## 🐳 **Docker Integration**

### Docker Engine (Required)
```bash
# Standard installation check
docker --version          # Should return version 20.10+
docker compose version    # Should return version 2.0+
systemctl status docker   # Should be active/running
```

### Docker Compose V2 Syntax
DPS uses modern Docker Compose V2 syntax:
```yaml
# V2 syntax (used by DPS)
name: immich
services:
  immich-server:
    image: ghcr.io/immich-app/immich-server:release

# NOT V1 syntax
version: '3.8'  # Not used
```

### Docker Group Membership
```bash
# User should be in docker group to run without sudo
groups $USER | grep docker
# If not in group: sudo usermod -aG docker $USER
```

## 📦 **Package Manager Detection**

DPS will detect and use appropriate package manager:

### Debian/Ubuntu Family
```bash
apt update && apt install -y docker.io docker-compose-plugin
```

### RHEL/Rocky/AlmaLinux Family
```bash
dnf install -y docker docker-compose-plugin
systemctl enable --now docker
```

### Arch Family
```bash
pacman -S docker docker-compose
systemctl enable --now docker
```

## 🌐 **Network Requirements**

### Required Network Access
- **Docker Hub**: For pulling container images
- **GitHub Container Registry**: For Immich images
- **Package Repositories**: For dependency installation
- **Tailscale API**: If using Tailscale integration

### Firewall Considerations
DPS binds to multiple interfaces - users may need to configure:
```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 2283/tcp  # Immich
sudo ufw allow 2342/tcp  # PhotoPrism
sudo ufw allow 5001/tcp  # Dockge
sudo ufw allow 3000/tcp  # Semaphore (optional)

# RHEL/Rocky (firewalld)
sudo firewall-cmd --permanent --add-port=2283/tcp
sudo firewall-cmd --permanent --add-port=2342/tcp
sudo firewall-cmd --permanent --add-port=5001/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 🔐 **Security Assumptions**

### User Security Model
- **Non-root execution**: DPS runs as regular user
- **Sudo only when needed**: For `/opt/stacks` creation
- **Container isolation**: Services run in containers
- **Local network access**: Services bind to detected interfaces

### Generated Secrets
- **24+ character passwords**: Auto-generated for databases
- **Secure random keys**: Cryptographically secure generation
- **No hardcoded credentials**: All secrets are unique per installation

## 🧪 **Development Environment**

### For DPS Development
```bash
# Required for running DPS tests
node --version        # 18+
npm --version         # 9+
docker --version      # 20.10+
tailscale version     # If testing Tailscale integration
```

### For DPS Usage
```bash
# Only Docker required for end users
docker --version
docker compose version
```

## ⚠️ **Known Limitations**

### Not Supported
- **Docker Desktop**: Use Docker Engine instead
- **Podman**: Docker Engine required (for now)
- **Snap Docker**: May have permission issues with `/opt/stacks`
- **Rootless Docker**: Requires `/opt/stacks` access
- **SELinux Enforcing**: May require additional configuration

### Manual Configuration Needed
- **Firewall rules**: User must open ports if needed
- **Storage permissions**: User must ensure adequate disk space
- **Network routing**: Complex network setups may need manual configuration

## ✅ **Validation Checklist**

Before DPS installation:
- [ ] Linux distribution supported (Ubuntu/Debian/RHEL family)
- [ ] Docker Engine installed and running
- [ ] User in docker group
- [ ] Sudo access available
- [ ] At least 8GB RAM available
- [ ] At least 50GB disk space available
- [ ] Network connectivity to Docker Hub
- [ ] Ports 2283, 2342, 5001 available (not in use)

---

**Summary**: DPS assumes a standard Linux server environment with Docker Engine and focuses on simplicity and reliability within this well-defined scope.