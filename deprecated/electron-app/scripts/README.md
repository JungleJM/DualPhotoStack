# DPS Scripts

This directory contains the core template processing and deployment scripts for Dual Photo Stack.

## Files

### `template-engine.js`
Core template processing engine that:
- Auto-detects network interfaces (localhost, LAN, Tailscale)
- Generates secure passwords and API keys
- Processes Docker Compose templates with variable substitution
- Handles multi-interface port binding
- Deploys services to `/opt/stacks/` for Dockge management

### `config-schema.json`
JSON schema defining all configuration variables and validation rules for:
- User inputs (library path, data storage path)
- Auto-detected values (network IPs, user info)
- Generated secrets (passwords, API keys)
- Service configurations

### `example-usage.js`
Demonstrates how the Electron app will use the template engine:
```bash
node example-usage.js
```

## Usage in Electron App

```javascript
const DPSTemplateEngine = require('./scripts/template-engine');

const engine = new DPSTemplateEngine();
const config = await engine.initializeConfig(userConfig);
const results = await engine.deployAll();
const summary = engine.getDeploymentSummary();
```

## Template Variable Format

Templates use `{{VARIABLE_NAME}}` syntax for substitution:
- `{{LIBRARY_PATH}}` - User-specified photo library
- `{{DATA_STORAGE_PATH}}` - User-specified data storage
- `{{LOCAL_NETWORK_IP}}` - Auto-detected LAN IP
- `{{IMMICH_PORT_BINDINGS}}` - Multi-line port bindings

## Security Features

- Auto-generated 24-character database passwords
- Auto-generated 32-character encryption keys
- Secure random password generation with special characters
- No hardcoded credentials in templates