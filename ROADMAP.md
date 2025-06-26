# DualPhotoStack Development Roadmap

## Current Phase: v0.25.x - Infrastructure & Core Functionality
**Status**: In Progress - Debugging file browser crashes

### ✅ Completed
- [x] Automated GitHub Actions builds (AppImage/DEB)
- [x] Comprehensive logging system
- [x] Agentic testing infrastructure  
- [x] Window visibility improvements
- [x] Multi-architecture support (x64/arm64)
- [x] Immutable OS support (uses ~/.local/share)
- [x] Public release system
- [x] Template engine fixes (Tailscale IP handling)

### 🔄 Current Sprint
- [ ] **CRITICAL**: Fix file browser dialog crashes
- [ ] Test complete configuration wizard workflow
- [ ] Validate Docker template generation
- [ ] Test service coordination

## Phase 1: ✅ Build Infrastructure (COMPLETE)
- Automated builds with GitHub Actions
- Multi-platform AppImage generation
- Public release downloads
- Crash-safe logging

## Phase 2: ✅ Linux Testing (COMPLETE) 
- Immutable OS compatibility
- Dependency detection
- Agentic testing loop
- Window visibility handling

## Phase 3: 🔄 Core Functionality (IN PROGRESS)
**Target**: v0.50.0 - Full functionality validated
- File browser dialog system (FIXING)
- Configuration wizard completion
- Docker template deployment
- Service coordination testing
- Error handling and recovery

## Phase 4: 🚀 Advanced Features (FUTURE)
**Target**: v1.0.0 - Production ready

### Headless/CLI Mode Detection
**Priority**: Medium | **Scope**: New feature
- Automatic detection of headless environments (no DISPLAY, LXC containers)
- CLI fallback mode when GUI unavailable
- Interactive terminal-based configuration wizard
- Headless Docker deployment capabilities
- Remote management interface

**Detection criteria**:
- No DISPLAY environment variable
- Missing GUI libraries (GTK3, X11)
- Container environment detection
- SSH-only sessions
- User-forced CLI mode (`--cli` flag)

**CLI Features**:
- Text-based configuration prompts
- Progress indicators for deployments
- Log streaming and monitoring
- Service status checking
- Configuration validation

### Container Orchestration
- Docker Swarm support
- Kubernetes deployment options
- Multi-node coordination
- High availability configurations

### Monitoring & Management
- Web-based dashboard
- Metrics collection
- Alert system
- Backup automation

## Version Milestones
- **v0.25.x**: Infrastructure complete ✅
- **v0.50.x**: Core functionality validated 🔄
- **v0.75.x**: Advanced features complete 🚀
- **v1.0.0**: Production release 🎯

---
*Current focus: Resolving file browser crashes to achieve v0.50.0 milestone*