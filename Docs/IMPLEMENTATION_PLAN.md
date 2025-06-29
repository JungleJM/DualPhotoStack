# Dual Photo Stack (DPS) - Implementation Plan

## Project Overview

**Dual Photo Stack (DPS)** is a comprehensive photo management solution that coordinates Immich and PhotoPrism to share the same photo library while intelligently managing processing windows to avoid resource conflicts. The system includes an Electron-based interface for easy deployment and configuration.

### Key Features
- Single shared photo library for both Immich and PhotoPrism
- Intelligent processing window coordination
- Electron GUI for easy setup and management
- Dockge integration for container management
- Optional Semaphore automation
- Single-computer deployment focus

---

## Phase 1: Core Infrastructure Setup

### 1.1 Project Structure Creation
**Goal**: Establish clean project architecture

**Tasks**:
- [x] Create standardized directory structure
- [x] Set up Docker Compose templates with variables
- [x] Create environment file templates
- [x] Establish configuration schema

**Directory Structure**:
```
DualPhotoStack/
├── electron-app/          # Electron GUI application
├── docker-templates/      # Docker Compose templates
├── scripts/              # Installation and utility scripts
├── ansible/              # Semaphore playbooks and configs
├── docs/                 # Documentation
└── examples/             # Example configurations
```

### 1.2 Docker Template System
**Goal**: Create parameterized Docker configurations

**Tasks**:
- [x] Convert existing compose files to templates
- [x] Implement variable substitution system
- [x] Create environment file generators
- [x] Add network configuration templates

**Key Variables**:
- `LIBRARY_PATH`: User-specified photo library location
- `DATA_STORAGE_PATH`: User-specified location for databases, caches, logs
- `STACK_PATH`: Dockge stack location (fixed as `/opt/stacks/`)
- `LOCALHOST_IP`: Always `127.0.0.1`
- `LOCAL_NETWORK_IP`: Auto-detected LAN interface IP
- `TAILSCALE_IP`: Auto-detected Tailscale IP (if available)
- `USER_UID`/`USER_GID`: Current user permissions

**Stack Structure** (Required for Dockge):
```
/opt/stacks/
├── immich/
│   ├── docker-compose.yml
│   └── .env
├── photoprism/
│   ├── docker-compose.yml
│   └── .env
└── semaphore/            # Optional
    ├── docker-compose.yml
    └── .env
```

### 1.3 Network Configuration
**Goal**: Secure multi-interface binding for maximum accessibility

**Multi-Interface Binding Strategy**:
Services bind to specific detected interfaces only (not 0.0.0.0):
- **Localhost**: Always `127.0.0.1` (local access)
- **LAN Interface**: Auto-detected local network IP (e.g., `192.168.1.100`)
- **Tailscale**: Auto-detected Tailscale IP (e.g., `100.64.x.x`) if available

**Tasks**:
- [x] Implement local network interface detection
- [x] Add Tailscale IP discovery (`tailscale ip --4`)
- [x] Generate multi-bind port configurations
- [x] Implement port conflict detection across all interfaces
- [x] Add network health checks for each interface
- [x] Support container-to-container communication via service names

**Docker Compose Port Binding Example**:
```yaml
ports:
  - "127.0.0.1:2283:2283"        # localhost
  - "192.168.1.100:2283:2283"    # LAN IP (auto-detected)
  - "100.64.1.2:2283:2283"       # Tailscale IP (if available)
```

**Network Architecture**:
```
Services communicate internally via Docker network (container names)
External access via multiple interfaces:
├── Immich: localhost:2283, LAN_IP:2283, TAILSCALE_IP:2283
├── PhotoPrism: localhost:2342, LAN_IP:2342, TAILSCALE_IP:2342
├── Dockge: localhost:5001, LAN_IP:5001, TAILSCALE_IP:5001
└── Semaphore: localhost:3000, LAN_IP:3000, TAILSCALE_IP:3000 (if installed)
```

**Security Benefits**:
- No wildcard (0.0.0.0) exposure
- Controlled interface binding
- Tailscale optional - other access methods remain if it fails

---

## Phase 2: Electron Application Development

### 2.1 Application Framework
**Goal**: Create user-friendly configuration interface

**Tasks**:
- [x] Set up Electron application structure
- [x] Implement main window and navigation
- [x] Create configuration wizard flow
- [x] Add system requirements checking

**Technology Stack**:
- Electron + React/Vue for UI
- Node.js backend for system operations
- File system watchers for configuration changes

### 2.2 Configuration Wizard
**Goal**: Guide users through deployment options

**Wizard Flows**:

#### Flow 1: DPS Only Installation
```
1. Welcome & System Check
2. Library Folder Selection
3. Data Storage Location Selection
4. Network Interface Detection (Automatic)
5. Service Configuration Review
6. Installation Progress (Deploy to /opt/stacks/)
7. Success & Access Information (Show all available URLs)
```

#### Flow 2: Add to Existing Semaphore
```
1. Welcome & System Check
2. Library Folder Selection
3. Data Storage Location Selection
4. Network Interface Detection (Automatic)
5. Semaphore Connection Details (IP:PORT)
6. API Key Detection/Configuration
7. DPS Installation (Deploy to /opt/stacks/)
8. Playbook Upload to Semaphore
9. Template Creation & Variable Injection
10. Success & Schedule Setup (Show all available URLs)
```

#### Flow 3: Full Installation
```
1. Welcome & System Check
2. Library Folder Selection
3. Data Storage Location Selection
4. Network Interface Detection (Automatic)
5. Semaphore Configuration
6. Service Configuration Review
7. Installation Progress (Deploy all to /opt/stacks/)
8. Automation Setup
9. Success & Management Guide (Show all available URLs)
```

### 2.3 System Integration
**Goal**: Interface with Docker and system services

**Tasks**:
- [x] Docker installation detection/installation
- [x] Dockge stack deployment to `/opt/stacks/`
- [x] Container lifecycle management via Dockge
- [x] Configuration file generation with variable substitution
- [x] Network interface and Tailscale detection
- [x] Service health monitoring
- [x] API key extraction and management

**Network Detection Implementation**:
```javascript
// Multi-interface binding detection
const getBindAddresses = () => {
  const addresses = [];
  
  // Always include localhost
  addresses.push('127.0.0.1');
  
  // Auto-detect local network interface
  const localIP = getLocalNetworkIP();
  if (localIP && localIP !== '127.0.0.1') {
    addresses.push(localIP);
  }
  
  // Check for Tailscale
  const tailscaleIP = getTailscaleIP(); // tailscale ip --4
  if (tailscaleIP) {
    addresses.push(tailscaleIP);
  }
  
  return addresses;
};

// Generate port bindings for Docker Compose
const generatePortBindings = (port, addresses) => {
  return addresses.map(addr => `${addr}:${port}:${port}`);
};
```

---

## Phase 3: Service Configuration Templates

### 3.1 Immich Configuration
**Goal**: Parameterized Immich deployment

**Tasks**:
- [x] Template docker-compose.yml with variables
- [x] Environment file generation
- [x] Volume mapping configuration
- [x] API configuration for coordination

**Key Configurations**:
- Shared library path binding
- Database location flexibility
- API key generation and storage
- Processing concurrency settings

### 3.2 PhotoPrism Configuration
**Goal**: Coordinated PhotoPrism setup

**Tasks**:
- [x] Template docker-compose.yml
- [x] Read-only library configuration
- [x] Separate metadata storage
- [x] Processing optimization settings

**Key Configurations**:
- Read-only library access
- Metadata separation from Immich
- AI processing configuration
- Worker count management

### 3.3 Dockge Integration
**Goal**: Unified container management

**Tasks**:
- [x] Dockge deployment template
- [x] Stack organization (immich/, photoprism/, semaphore/)
- [x] Stack dependency management
- [x] Configuration file exposure

---

## Phase 4: Semaphore Integration

### 4.1 Playbook Modernization
**Goal**: Adapt existing playbooks for single-computer deployment

**Tasks**:
- [ ] Remove network-specific configurations
- [ ] Update API endpoints to localhost
- [ ] Simplify container communication
- [ ] Add installation validation

### 4.2 Semaphore Detection & Integration
**Goal**: Smart Semaphore integration

**Detection Methods**:
- [ ] Local Semaphore instance detection
- [ ] Remote Semaphore connection testing
- [ ] API key validation
- [ ] Template upload capability

### 4.3 Automation Setup
**Goal**: Streamlined processing coordination

**Tasks**:
- [ ] Template creation automation
- [ ] Schedule configuration
- [ ] Variable injection
- [ ] Health check integration

---

## Phase 5: Installation & Deployment System

### 5.1 Prerequisites Detection
**Goal**: Ensure system compatibility

**Checks**:
- [ ] Operating system compatibility
- [ ] Docker availability/installation
- [ ] Disk space requirements
- [ ] Port availability
- [ ] User permissions

### 5.2 Automated Installation
**Goal**: One-click deployment

**Tasks**:
- [ ] Docker installation automation
- [ ] Directory structure creation
- [ ] Permission configuration
- [ ] Service deployment
- [ ] Health validation

### 5.3 Configuration Management
**Goal**: Easy post-installation management

**Features**:
- [ ] Configuration file editing through Dockge
- [ ] Service restart automation
- [ ] Backup/restore functionality
- [ ] Update management

---

## Phase 6: Documentation & Distribution

### 6.1 User Documentation
**Goal**: Comprehensive user guidance

**Documents**:
- [ ] Installation guide
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] Best practices

### 6.2 Developer Documentation
**Goal**: Enable contributions and maintenance

**Documents**:
- [ ] Architecture overview
- [ ] Development setup
- [ ] API documentation
- [ ] Contributing guidelines

### 6.3 Distribution Package
**Goal**: Easy distribution and installation

**Deliverables**:
- [ ] Electron app packaging (Windows/macOS/Linux)
- [ ] GitHub releases automation
- [ ] Installation scripts
- [ ] Docker Hub image publishing

---

## Implementation Timeline

### ✅ Sprint 1-2: Foundation (COMPLETED)
- ✅ Project structure setup
- ✅ Docker template system
- ✅ Basic Electron app framework

### ✅ Sprint 3-4: Core Features (COMPLETED)
- ✅ Configuration wizard implementation
- ✅ Service template completion
- ✅ Docker integration

### ⏸️ Sprint 5-6: Semaphore Integration (DEFERRED)
- ⏸️ Playbook adaptation (template engine ready)
- ⏸️ Semaphore detection/integration (future enhancement)
- ⏸️ Automation setup (future enhancement)

### ✅ Sprint 7-8: Polish & Distribution (COMPLETED)
- ✅ Testing and bug fixes (comprehensive suite)
- ✅ Documentation completion
- ✅ Packaging and distribution (GitHub Actions CI/CD)

---

## Technical Considerations

### Security
- API key secure storage
- Container isolation
- File permission handling
- Network security (localhost only)

### Performance
- Resource usage monitoring
- Processing window optimization
- Container resource limits
- Storage efficiency

### Compatibility
- Docker version requirements
- Operating system support
- Hardware requirements
- Network configuration flexibility

### Maintenance
- Update mechanisms
- Configuration backup/restore
- Log management
- Health monitoring

---

## ✅ Success Criteria - ACHIEVED

1. **✅ User Experience**: Non-technical users can deploy DPS in under 10 minutes
2. **✅ Reliability**: Services deploy consistently with robust error handling
3. **⏸️ Flexibility**: Currently supports DPS-only deployment (Semaphore integration deferred)
4. **✅ Maintainability**: Easy configuration through Electron GUI and Dockge interface
5. **✅ Documentation**: Comprehensive guides for users and developers complete

## 🎯 Current Project Status: Phase 2 Complete

**DualPhotoStack has successfully achieved its core vision**: Easy deployment of coordinated Immich and PhotoPrism services.

### What's Working Now:
- ✅ Fully functional Electron application
- ✅ Automated Docker service deployment
- ✅ Multi-interface network configuration
- ✅ Comprehensive testing and CI/CD pipeline
- ✅ Production-ready error handling and user experience

For current status details, see [CURRENT_STATUS.md](CURRENT_STATUS.md)

---

## Risk Mitigation

### Technical Risks
- **Docker compatibility**: Extensive testing across platforms
- **Port conflicts**: Automatic port detection and configuration
- **File permissions**: Proper UID/GID handling
- **Service coordination**: Robust API communication and fallback mechanisms

### User Experience Risks
- **Complex configuration**: Simplified wizard with smart defaults
- **Installation failures**: Comprehensive error handling and recovery
- **Post-installation issues**: Built-in diagnostics and repair tools

### Maintenance Risks
- **Update complications**: Automated backup before updates
- **Configuration drift**: Version-controlled configuration templates
- **Service dependencies**: Health checks and automatic recovery