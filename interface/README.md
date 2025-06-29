# DualPhotoStack Universal GUI Interface

This directory contains the interface definition files for DualPhotoStack to work with universal GUI frameworks like Nucleus or similar systems.

## Overview

The interface files in this directory decouple the DPS business logic from the Electron GUI, allowing the same functionality to be used with different UI frameworks while maintaining the existing Electron app as a fallback.

## Files Structure

```
interface/
├── README.md                 # This file
├── project-config.yaml       # Main interface configuration
└── plugins/                  # Business logic plugins
    ├── dps-core.js           # Core DPS functionality
    ├── system.js             # System detection and validation
    ├── docker.js             # Docker installation checks
    └── network.js            # Network interface detection
```

## Configuration Format

### project-config.yaml
The main configuration file that defines:
- **Project metadata** (name, version, description)
- **UI layout and theming** (window settings, colors, styling)
- **Workflow definition** (screens, transitions, validation)
- **Plugin configuration** (business logic handlers)
- **Component definitions** (UI component types and properties)

### Key Sections

#### Workflow Screens
- **welcome**: Deployment mode selection
- **system-check**: Platform and dependency validation  
- **configuration**: File path and settings input
- **deployment**: Step-by-step service deployment
- **success**: Results and access URLs

#### Plugin System
- **dps-core**: Core deployment logic using existing template engine
- **system**: Platform compatibility and permissions
- **docker**: Docker/Compose installation validation
- **network**: Multi-interface network detection

## Plugin Architecture

Each plugin provides specific functionality:

### DPS Core Plugin (`plugins/dps-core.js`)
- Wraps the existing `scripts/template-engine.js`
- Handles configuration generation and service deployment
- Maintains compatibility with current DPS logic
- Returns structured results for UI display

### System Plugin (`plugins/system.js`)
- Platform detection (Linux requirement)
- User permissions validation
- Command availability checks
- Environment information gathering

### Docker Plugin (`plugins/docker.js`)
- Docker installation detection
- Version compatibility checking
- Docker Compose validation
- Service health monitoring

### Network Plugin (`plugins/network.js`)
- Multi-interface detection (localhost, LAN, Tailscale)
- Network connectivity validation
- Interface display formatting
- Connection recommendations

## Integration with Universal GUI Frameworks

### For Nucleus (or similar frameworks):

1. **Load Configuration**: Framework reads `project-config.yaml`
2. **Generate UI**: Dynamically creates screens based on workflow definition
3. **Load Plugins**: Instantiates business logic plugins
4. **Handle Interactions**: Routes user actions to appropriate plugin methods
5. **Display Results**: Formats plugin responses for UI presentation

### Plugin Communication

Plugins communicate through a standardized interface:

```javascript
// Plugin method signature
async methodName(params) {
  return {
    success: boolean,
    message: string,
    data: object,
    error?: Error
  };
}
```

### Screen Flow

1. **Welcome** → Select deployment mode → `system-check`
2. **System Check** → Validate requirements → `configuration` 
3. **Configuration** → Set paths and settings → `deployment`
4. **Deployment** → Execute deployment steps → `success`
5. **Success** → Display results and URLs

## Advantages of This Approach

### Dual UI Support
- **Keep existing Electron app** for immediate use
- **Add universal GUI support** for future flexibility
- **Gradual migration** as universal framework matures

### Separation of Concerns
- **UI logic** in universal framework
- **Business logic** in reusable plugins
- **Configuration** in declarative YAML

### Reusability
- **Same plugins** work with any GUI framework
- **Consistent behavior** across different interfaces
- **Easy testing** of business logic independent of UI

### Maintainability
- **Clear boundaries** between UI and logic
- **Independent versioning** of interface and implementation
- **Simplified debugging** with isolated components

## Usage with Existing Electron App

The interface files work **alongside** the existing Electron implementation:

```bash
# Use existing Electron app (current method)
./DPS-Linux-x64.AppImage

# Use universal GUI framework (future method)
nucleus --project ./interface/project-config.yaml
```

## Development Workflow

### Testing Plugins Independently
```bash
cd interface/plugins
node -e "
const DPSCore = require('./dps-core.js');
const plugin = new DPSCore({});
plugin.generateConfig({
  'library-path': '/home/user/Pictures',
  'data-path': '/home/user/dps-data',
  'deploymentMode': 'dps-only'
}).then(console.log);
"
```

### Validating Configuration
```bash
# Use YAML linter
yamllint project-config.yaml

# Validate against schema (when available)
ajv validate -s config-schema.json -d project-config.yaml
```

### Adding New Functionality

1. **Add to workflow** in `project-config.yaml`
2. **Implement in plugin** (existing or new)
3. **Test plugin method** independently
4. **Update documentation**

## Future Enhancements

- **JSON Schema validation** for configuration files
- **Plugin hot-reloading** for development
- **Multi-language support** for internationalization
- **Custom themes** and component libraries
- **Plugin marketplace** for community extensions

## Compatibility Notes

- **Node.js**: Requires same version as main DPS project
- **Dependencies**: Plugins use existing DPS dependencies
- **File paths**: Relative to DPS project root
- **Logging**: Integrates with DPS logging system
- **Error handling**: Compatible with existing error patterns

This interface system provides a bridge between DualPhotoStack and universal GUI frameworks while maintaining full backward compatibility with the existing Electron implementation.