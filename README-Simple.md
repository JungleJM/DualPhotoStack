# Simple DualPhotoStack Deployment

**Simplified deployment approach using pre-formed Docker Compose files.**

## Quick Start

```bash
# Deploy with default settings
./simple-deploy.js

# Deploy with custom library path  
./simple-deploy.js /path/to/your/photos

# Test without starting containers
node simple-deploy.js
```

## What This Does

1. **Copies working Docker Compose files** from `simple-docker/`
2. **Replaces basic variables** (paths, passwords, ports)
3. **Creates service directories** in `~/.local/share/docker-stacks/`
4. **Starts containers** automatically
5. **No complex templating** or YAML processing

## Generated Structure

```
~/.local/share/docker-stacks/
├── immich/
│   ├── docker-compose.yml  (from examples)
│   ├── .env               (processed)
│   └── data/              (auto-created)
├── photoprism/
│   ├── docker-compose.yml
│   └── data/
└── dockge/
    ├── docker-compose.yml
    └── data/
```

## Key Simplifications

### Before (Complex)
- 200+ line template engine
- Variable substitution system
- Multi-interface port binding generation
- YAML formatting issues
- Template processing order problems

### After (Simple)
- ~150 line deployment script
- Direct file copying
- Simple string replacement
- Pre-tested Docker Compose files
- No template processing

## Services Deployed

- **Immich**: Photo management (port 2283)
- **PhotoPrism**: Photo organization (port 2342)  
- **Dockge**: Container management (port 5001)

## Advantages

✅ **Reliable** - Uses proven Docker Compose files  
✅ **Simple** - No complex template processing  
✅ **Fast** - Direct file operations  
✅ **Debuggable** - Clear variable replacement  
✅ **Maintainable** - Easy to understand and modify  

## Integration Points

- **Ansible**: Can call `simple-deploy.js` from playbooks
- **CLI**: Direct command line usage
- **Nucleus**: Simple parameter passing
- **Docker**: Standard docker-compose workflow

## Migration Path

1. **Phase 1**: Use simple deployment (this)
2. **Phase 2**: Add Ansible integration  
3. **Phase 3**: Deprecate complex template system
4. **Phase 4**: Remove electron app entirely