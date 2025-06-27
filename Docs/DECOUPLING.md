# Decoupling Electron Interface from DualPhotoStack

## Overview

This document outlines the strategy for decoupling the Electron GUI interface from the DualPhotoStack project to create a **Universal Project GUI Generator** that can dynamically generate cross-platform interfaces for any project based on configuration files.

## Current Architecture Analysis

### Tightly Coupled Components

#### 1. **Domain-Specific Logic in Electron App**
- `electron-app/src/renderer.js` - Contains DPS-specific workflow logic
- Hard-coded screen transitions: welcome → system check → config → deployment
- DPS-specific validation rules and field names
- Immich/PhotoPrism specific terminology and options

#### 2. **DPS Template Engine Integration**
- `electron-app/scripts/template-engine.js` - DPS Docker template system
- Direct imports and calls to DPS-specific template processing
- Docker Compose generation logic embedded in main process

#### 3. **System Detection Logic**
- Network interface detection (Tailscale, LAN, localhost)
- Docker/Docker Compose validation
- Linux-specific platform assumptions

#### 4. **Hard-coded UI Elements**
- Static HTML structure in `electron-app/src/index.html`
- CSS styling tied to specific workflow steps
- Fixed form fields and validation logic

#### 5. **IPC Handlers**
- Main process handlers specific to DPS operations
- Template engine communication
- System detection and validation

## Decoupling Strategy

### Phase 1: Extract Core Electron Framework

#### Create Universal Electron Shell
```
universal-gui/
├── src/
│   ├── main.js           # Generic Electron main process
│   ├── preload.js        # Universal IPC bridge
│   ├── renderer.js       # Dynamic UI generator
│   ├── config-loader.js  # YAML/JSON config parser
│   └── plugin-system.js  # Project-specific plugin loader
├── templates/
│   ├── base.html         # Base HTML template
│   ├── components/       # Reusable UI components
│   └── themes/           # CSS themes
└── config-schema.json    # Configuration validation
```

#### Generic IPC Architecture
Replace DPS-specific handlers with generic ones:
```javascript
// Instead of: ipcMain.handle('template:initialize', ...)
ipcMain.handle('project:execute', async (event, action, params) => {
  const plugin = loadProjectPlugin();
  return await plugin.executeAction(action, params);
});
```

### Phase 2: Configuration-Driven UI Generation

#### YAML Configuration Schema
```yaml
# project-config.yaml
project:
  name: "DualPhotoStack"
  version: "0.25.0"
  description: "Coordinated photo management deployment"
  
interface:
  theme: "modern-dark"
  window:
    title: "DPS Setup Wizard"
    width: 1200
    height: 800
    
workflow:
  screens:
    - id: "welcome"
      title: "Welcome to DPS"
      type: "selection"
      description: "Choose your deployment mode"
      options:
        - id: "dps-only"
          label: "DPS Only"
          description: "Install Immich + PhotoPrism + Dockge"
        - id: "add-semaphore"
          label: "Add to Existing Semaphore"
        - id: "full-install"
          label: "Full Installation"
      next: "system-check"
      
    - id: "system-check"
      title: "System Validation"
      type: "validation"
      checks:
        - id: "platform"
          label: "Platform Check"
          plugin: "system.checkPlatform"
          required: true
        - id: "docker"
          label: "Docker Check" 
          plugin: "docker.checkInstallation"
          required: true
      next: "configuration"
      
    - id: "configuration"
      title: "Configuration"
      type: "form"
      fields:
        - id: "library-path"
          type: "directory"
          label: "Photo Library Directory"
          required: true
          default: "~/Pictures"
        - id: "data-path"
          type: "directory"
          label: "Data Storage Directory"
          required: true
          default: "~/dps-data"
      next: "deployment"
      
    - id: "deployment"
      title: "Deployment"
      type: "progress"
      steps:
        - id: "config"
          label: "Generate Configuration"
          plugin: "dps.generateConfig"
        - id: "network"
          label: "Setup Network"
          plugin: "dps.configureNetwork"
        - id: "services"
          label: "Deploy Services"
          plugin: "dps.deployServices"
        - id: "validation"
          label: "Validate Deployment"
          plugin: "dps.validateDeployment"
      next: "success"

plugins:
  system:
    path: "./plugins/system.js"
    methods: ["checkPlatform", "detectNetwork"]
  docker:
    path: "./plugins/docker.js"
    methods: ["checkInstallation", "validateCompose"]
  dps:
    path: "./plugins/dps-core.js"
    methods: ["generateConfig", "deployServices"]

components:
  directory:
    type: "file-browser"
    properties: ["browse-button", "manual-entry", "validation"]
  selection:
    type: "radio-cards"
    properties: ["icons", "descriptions", "single-select"]
  validation:
    type: "check-list"
    properties: ["progress-icons", "real-time", "dependencies"]
```

### Phase 3: Plugin Architecture

#### Project Plugin Interface
```javascript
// plugins/dps-core.js
class DPSPlugin {
  constructor(config) {
    this.config = config;
    this.templateEngine = require('../../../scripts/template-engine');
  }
  
  async generateConfig(params) {
    // DPS-specific configuration generation
    return await this.templateEngine.initializeConfig(params);
  }
  
  async deployServices(config) {
    // DPS-specific deployment logic
    return await this.templateEngine.deploy(config);
  }
  
  async validateDeployment(config) {
    // DPS-specific validation
    return this.templateEngine.getDeploymentSummary();
  }
}

module.exports = DPSPlugin;
```

#### Generic Plugin Loader
```javascript
// src/plugin-system.js
class PluginSystem {
  constructor(config) {
    this.plugins = new Map();
    this.loadPlugins(config.plugins);
  }
  
  loadPlugins(pluginConfigs) {
    for (const [name, config] of Object.entries(pluginConfigs)) {
      const PluginClass = require(config.path);
      this.plugins.set(name, new PluginClass(config));
    }
  }
  
  async executePlugin(pluginPath, method, params) {
    const [pluginName, methodName] = pluginPath.split('.');
    const plugin = this.plugins.get(pluginName);
    return await plugin[methodName](params);
  }
}
```

### Phase 4: Dynamic UI Generation

#### Screen Generator
```javascript
// src/renderer.js
class DynamicUIGenerator {
  constructor(config) {
    this.config = config;
    this.currentScreen = null;
    this.state = {};
  }
  
  generateScreen(screenId) {
    const screenConfig = this.config.workflow.screens.find(s => s.id === screenId);
    
    switch (screenConfig.type) {
      case 'selection':
        return this.generateSelectionScreen(screenConfig);
      case 'form':
        return this.generateFormScreen(screenConfig);
      case 'validation':
        return this.generateValidationScreen(screenConfig);
      case 'progress':
        return this.generateProgressScreen(screenConfig);
    }
  }
  
  generateFormScreen(config) {
    const formHTML = config.fields.map(field => {
      const component = this.config.components[field.type];
      return this.generateComponent(component, field);
    }).join('');
    
    return `
      <div class="screen" id="${config.id}">
        <h2>${config.title}</h2>
        <form>${formHTML}</form>
        <button onclick="navigateNext('${config.next}')">Continue</button>
      </div>
    `;
  }
}
```

## Migration Roadmap

### Step 1: Create Universal Framework Repository
```bash
# New repository structure
universal-project-gui/
├── README.md
├── package.json
├── src/                    # Universal Electron framework
├── templates/              # UI templates and components
├── examples/              
│   ├── dualphotostack/    # DPS configuration example
│   ├── simple-web-app/    # Simple example
│   └── docker-compose/    # Generic Docker project
└── docs/
    ├── CONFIGURATION.md   # YAML schema documentation
    ├── PLUGINS.md         # Plugin development guide
    └── EXAMPLES.md        # Usage examples
```

### Step 2: Extract DPS-Specific Logic
1. **Move template engine** → `plugins/dps/template-engine.js`
2. **Extract system detection** → `plugins/system/linux-detector.js`
3. **Create DPS configuration** → `examples/dualphotostack/project-config.yaml`
4. **Migrate UI logic** → DPS-specific plugin methods

### Step 3: Implement Configuration Schema
1. **Design YAML schema** for project definitions
2. **Create JSON Schema validation** for config files
3. **Build configuration parser** and validator
4. **Implement component library** for common UI patterns

### Step 4: Build Plugin System
1. **Define plugin interface** and lifecycle
2. **Create plugin loader** and sandbox
3. **Implement IPC bridge** for plugin communication
4. **Add plugin validation** and error handling

### Step 5: Test with DPS Migration
1. **Create DPS plugin** using extracted logic
2. **Generate DPS configuration** file
3. **Test full workflow** with universal framework
4. **Validate feature parity** with original implementation

## Configuration Language Design

### Core Configuration Structure
```yaml
# Meta information
meta:
  schema-version: "1.0"
  generator-version: ">=1.0.0"
  
# Project identification
project:
  id: "com.example.myproject"
  name: "My Project"
  version: "1.0.0"
  description: "Project description"
  repository: "https://github.com/user/project"
  
# UI configuration
interface:
  theme: "default" | "dark" | "light" | "custom"
  window:
    title: "string"
    width: number
    height: number
    resizable: boolean
    icon: "path/to/icon.png"
  
# Workflow definition
workflow:
  start: "screen-id"
  screens: [Screen]
  
# Component definitions
components:
  component-name: ComponentDefinition
  
# Plugin configuration  
plugins:
  plugin-name: PluginDefinition
  
# Theming and styling
styling:
  css: "path/to/custom.css"
  variables:
    primary-color: "#007acc"
    font-family: "Arial, sans-serif"
```

### Screen Types and Properties
```yaml
# Selection screen (radio buttons, cards)
type: "selection"
options: [SelectionOption]
multiple: boolean (default: false)
layout: "cards" | "list" | "grid"

# Form screen (input fields)
type: "form" 
fields: [FormField]
validation: ValidationRules

# Progress screen (step-by-step execution)
type: "progress"
steps: [ProgressStep]
allow-cancel: boolean
show-logs: boolean

# Validation screen (system checks)
type: "validation"
checks: [ValidationCheck]
continue-on-warning: boolean

# Information screen (display only)
type: "info"
content: "markdown content"
buttons: [ActionButton]
```

### Field Type Definitions
```yaml
# Directory selector
type: "directory"
properties:
  browse-button: boolean
  manual-entry: boolean  
  validation: "exists" | "writable" | "readable"
  create-if-missing: boolean

# Text input
type: "text"
properties:
  placeholder: "string"
  validation: RegExp | "email" | "url" | "ip"
  required: boolean

# Number input  
type: "number"
properties:
  min: number
  max: number
  step: number

# Dropdown selection
type: "select"
properties:
  options: [SelectOption]
  multiple: boolean
  searchable: boolean
```

### Plugin Integration
```yaml
plugins:
  system:
    type: "node-module"
    path: "./plugins/system"
    config:
      supported-platforms: ["linux", "darwin", "win32"]
      
  docker:
    type: "executable"
    command: "docker"
    validation: ["--version"]
    
  custom:
    type: "script"
    interpreter: "python3"
    script: "./scripts/custom-plugin.py"
```

## Benefits of Decoupling

### For DualPhotoStack
- **Simplified maintenance** - Focus on core Docker/template logic
- **Easier testing** - Plugin-based architecture improves testability
- **Reduced complexity** - Remove Electron concerns from main project

### For Universal GUI Framework
- **Reusability** - One framework for all future projects
- **Rapid prototyping** - Quick GUI creation for new projects
- **Cross-platform consistency** - Same UI framework everywhere
- **Community contribution** - Others can create plugins and themes

### For Development Workflow
- **Separation of concerns** - UI vs. business logic
- **Independent versioning** - GUI and project evolve separately
- **Technology flexibility** - Could add web interface alongside Electron
- **Easier contribution** - Contributors can focus on UI or logic

## Implementation Timeline

### Phase 1 (1-2 weeks): Framework Setup
- Create universal-project-gui repository
- Build basic Electron shell with config loading
- Implement simple YAML parser and validator

### Phase 2 (2-3 weeks): Core Components
- Build dynamic UI generation system
- Create plugin architecture and loader
- Implement basic component library

### Phase 3 (2-3 weeks): DPS Migration
- Extract DPS logic into plugins
- Create DPS configuration file
- Test feature parity and performance

### Phase 4 (1-2 weeks): Documentation & Examples
- Write comprehensive documentation
- Create multiple example projects
- Build plugin development guide

## Next Steps

1. **Create new repository** for universal-project-gui
2. **Design and validate** YAML configuration schema
3. **Extract minimal viable** DPS plugin
4. **Implement basic** screen generation
5. **Test with simple example** project first
6. **Gradually migrate** DPS functionality

This decoupling strategy transforms a project-specific GUI into a universal tool that can generate interfaces for any project, making future development significantly more efficient and maintainable.