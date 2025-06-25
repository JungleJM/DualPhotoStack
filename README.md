# Operation EPS Ansible Automation

Ansible playbooks for managing Operation EPS (Effortless Photo Stack) - a coordinated PhotoPrism/Immich photo management system.

## Architecture Overview
- **Immich Processing Window**: 11:00 AM - 1:00 PM (2 hours, high concurrency)
- **PhotoPrism Processing Window**: 1:05 PM - 10:55 AM (22+ hours, AI processing)
- **API-based Coordination**: Immich controlled via REST API with authentication
- **Container-based Control**: PhotoPrism managed via Docker exec commands
- **Timezone**: America/Chicago (configurable)

## Features
- ✅ Automated processing window coordination
- ✅ API-authenticated Immich control (concurrency management)
- ✅ Docker-based PhotoPrism control (indexing/optimization)
- ✅ Real-time status monitoring
- ✅ Semaphore UI integration with template variables
- ✅ Clean separation of concerns (no external cron jobs)

## Quick Start
1. Set up Semaphore UI templates with this playbook
2. Configure API key in template variables
3. Create automated schedules for coordination

## Semaphore Templates Required
- **EPS Check Status** - Manual status checking
- **EPS Start Immich** - High concurrency processing
- **EPS Stop Immich** - Low concurrency processing  
- **EPS Start PhotoPrism** - Indexing and optimization
- **EPS Stop PhotoPrism** - Graceful process shutdown
- **EPS Cleanup** - Manual cleanup instructions

## Processing Actions
- `status` - Check current system status
- `start_immich` - Enable high Immich processing (4 workers)
- `stop_immich` - Set low Immich processing (1 worker)
- `start_photoprism` - Start PhotoPrism indexing/optimization
- `stop_photoprism` - Gracefully stop PhotoPrism processes
- `schedule` - Display Semaphore schedule setup instructions
- `cleanup` - Display manual cleanup instructions

## Daily Automation Schedule
- **10:55 AM** - Stop PhotoPrism processing
- **11:00 AM** - Start Immich processing (mobile backup priority)
- **1:00 PM** - Stop Immich processing
- **1:05 PM** - Start PhotoPrism processing (AI analysis)

## Network Architecture
- **Semaphore**: 192.168.50.102 (orchestration)
- **Photos LXC**: 192.168.50.130 (Immich + PhotoPrism)
- **API Calls**: Cross-container communication via IP addresses

## Prerequisites
- Immich API key (configured in Semaphore template variables)
- Docker Compose stacks running on target host
- SSH connectivity from Semaphore to photos container
- Semaphore UI with scheduling capability