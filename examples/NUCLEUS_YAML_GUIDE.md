# Nucleus YAML Configuration Guide

This guide explains how to create `nucleus-config.yaml` files for your deployment projects.

## Basic Structure

Every nucleus project requires a `nucleus-config.yaml` file in the root directory:

```yaml
name: "Your Project Name"
description: "Brief description of what this project does"
version: "1.0.0"

fields:
  # UI form fields go here

deployment:
  # Deployment configuration goes here

logging:
  # Logging configuration goes here
```

## Project Metadata

```yaml
name: "My Awesome Deployer"          # Required: Display name for your project
description: "Deploys awesome stuff"  # Optional: Brief description
version: "1.0.0"                     # Optional: Project version
```

## Form Fields

The `fields` section defines the UI form that users will fill out:

### Text Input
```yaml
- type: "text"
  label: "Server Name"               # Display label
  key: "server_name"                 # Variable name (used in scripts)
  required: true                     # Optional: defaults to false
  default: "my-server"               # Optional: default value
  description: "Enter server name"   # Optional: help text
  placeholder: "e.g., web-server-01" # Optional: placeholder text
```

### Password Input
```yaml
- type: "password"
  label: "Database Password"
  key: "db_password"
  required: true
  description: "Enter database password"
```

### Number Input
```yaml
- type: "number"
  label: "Port Number"
  key: "port_number"
  default: 8080
  description: "Enter port number"
```

### Dropdown/Select
```yaml
- type: "dropdown"
  label: "Environment"
  key: "environment"
  required: true
  options: ["development", "staging", "production"]
  default: "development"
  description: "Select deployment environment"
```

### Checkbox
```yaml
- type: "checkbox"
  label: "Enable SSL"
  key: "enable_ssl"
  default: true
  description: "Enable HTTPS encryption"
```

### Information Box
```yaml
- type: "info"
  title: "SSL Configuration"           # Optional: Box title
  content: "SSL certificates provide secure HTTPS connections. When enabled, you'll need to configure additional settings below."
  style: "info"                       # Optional: info, warning, success, error
  icon: "info"                        # Optional: info, warning, check, error
  collapsible: true                   # Optional: allows users to expand/collapse
  expanded: true                      # Optional: initial state if collapsible
```

### Conditional Fields
Fields can be shown/hidden based on other field values:

```yaml
- type: "dropdown"
  label: "Installation Type"
  key: "install_type"
  options: ["automatic", "custom"]
  default: "automatic"

- type: "text"
  label: "Custom Path"
  key: "custom_path"
  required_if: "install_type == custom"  # Only required if install_type is "custom"
  description: "Enter custom installation path"
```

## Deployment Configuration

```yaml
deployment:
  script: "./deploy.sh"              # Required: Path to deployment script
  type: "shell"                      # Optional: deployment type (shell, docker, etc.)
```

### Deployment Scripts
- Must be executable (`chmod +x deploy.sh`)
- Receive form data as environment variables
- Special nucleus variables are also provided:
  - `NUCLEUS_PROJECT_PATH`: Path to the project directory
  - `NUCLEUS_OUTPUT_DIR`: Directory for deployment outputs

## Logging Configuration

```yaml
logging:
  events: 
    - "deployment_start"             # Log when deployment begins
    - "service_config"               # Log during service configuration
    - "docker_pull"                  # Log during Docker operations
    - "deployment_complete"          # Log when deployment finishes
    - "deployment_error"             # Log any errors
```

## Information Box Styles

You can create different types of information boxes to provide context and guidance:

### Info Box (Default)
```yaml
- type: "info"
  title: "Configuration Overview"
  content: "This section configures the basic web server settings. All fields are required unless marked optional."
  style: "info"
```

### Warning Box
```yaml
- type: "info"
  title: "Important Security Notice"
  content: "Enabling SSL in production environments requires valid certificates. Self-signed certificates should only be used for testing."
  style: "warning"
  icon: "warning"
```

### Success Box
```yaml
- type: "info"
  title: "Ready to Deploy"
  content: "All prerequisites are met. Click deploy to start the installation process."
  style: "success"
  icon: "check"
```

### Error Box
```yaml
- type: "info"
  title: "Configuration Error"
  content: "Missing required dependencies. Please ensure Docker is installed and running."
  style: "error"
  icon: "error"
```

## Example: Complete Configuration with Info Boxes

```yaml
name: "Web Server Deployer"
description: "Deploy NGINX web server with custom configuration"
version: "2.1.0"

fields:
  - type: "info"
    title: "Welcome to Web Server Deployment"
    content: "This tool will help you deploy and configure an NGINX web server with optional SSL support. Please fill out the configuration below."
    style: "info"
    collapsible: false

  - type: "text"
    label: "Server Name"
    key: "server_name"
    required: true
    default: "web-server"
    description: "Name for the web server instance"

  - type: "dropdown"
    label: "Environment"
    key: "environment"
    required: true
    options: ["development", "staging", "production"]
    default: "development"
    description: "Deployment environment"

  - type: "info"
    title: "Port Configuration"
    content: "Configure the ports for your web server. HTTP typically uses port 80, while HTTPS uses port 443."
    style: "info"
    collapsible: true
    expanded: false

  - type: "number"
    label: "HTTP Port"
    key: "http_port"
    default: 80
    description: "Port for HTTP traffic"

  - type: "checkbox"
    label: "Enable SSL"
    key: "enable_ssl"
    default: false
    description: "Enable HTTPS with SSL certificates"

  - type: "info"
    title: "SSL Security Warning"
    content: "SSL certificates provide encrypted connections. Make sure you have valid certificates for production use."
    style: "warning"
    icon: "warning"
    show_if: "enable_ssl == true"

  - type: "number"
    label: "HTTPS Port"
    key: "https_port"
    required_if: "enable_ssl == true"
    default: 443
    description: "Port for HTTPS traffic"

  - type: "text"
    label: "Domain Name"
    key: "domain_name"
    required_if: "enable_ssl == true"
    placeholder: "example.com"
    description: "Domain name for SSL certificate"

deployment:
  script: "./deploy-nginx.sh"
  type: "shell"

logging:
  events:
    - "deployment_start"
    - "nginx_config"
    - "ssl_setup"
    - "service_start"
    - "deployment_complete"
    - "deployment_error"
```

## Variable Substitution in Scripts

Form field values are passed to your deployment script as environment variables using the `key` names:

```bash
#!/bin/bash

echo "Server Name: ${server_name}"
echo "Environment: ${environment}"
echo "HTTP Port: ${http_port}"
echo "SSL Enabled: ${enable_ssl}"

if [ "${enable_ssl}" = "true" ]; then
  echo "HTTPS Port: ${https_port}"
  echo "Domain: ${domain_name}"
fi
```

## Special Variables

Nucleus provides these special environment variables to your scripts:

- `NUCLEUS_PROJECT_PATH`: Full path to your project directory
- `NUCLEUS_OUTPUT_DIR`: Directory where nucleus stores deployment outputs
- `USER_HOME`: User's home directory
- `USER_NAME`: Current username
- `PLATFORM`: Operating system platform
- `HOSTNAME`: System hostname
- `PROJECT_NAME`: Project name from YAML
- `PROJECT_VERSION`: Project version from YAML
- `TIMESTAMP`: ISO timestamp of deployment

## Templates Directory (Optional)

If your project has a `templates/` directory, nucleus will process template files with variable substitution:

```
my-project/
├── nucleus-config.yaml
├── deploy.sh
├── templates/
│   ├── nginx.conf.template
│   ├── docker-compose.yml.template
│   └── ssl-config.template
└── README.md
```

Template files support these variable formats:
- `${VARIABLE_NAME}`
- `{{VARIABLE_NAME}}`
- `%VARIABLE_NAME%`

## Project Structure

Recommended project structure:

```
my-nucleus-project/
├── nucleus-config.yaml          # Required: Main configuration
├── deploy.sh                    # Required: Deployment script
├── templates/                   # Optional: Template files
│   ├── config.template
│   └── docker-compose.yml.template
├── scripts/                     # Optional: Additional scripts
│   ├── setup.sh
│   └── cleanup.sh
├── docs/                        # Optional: Documentation
│   └── README.md
└── examples/                    # Optional: Example configurations
    └── sample-config.conf
```

## Testing Your Configuration

1. Create your project directory with `nucleus-config.yaml`
2. Test YAML syntax: ensure proper indentation and structure
3. Test your deployment script independently
4. Use nucleus to load your local project folder
5. Fill out the generated form and run deployment
6. Check nucleus logs and deployment outputs

## Information Box Features

### Conditional Display
Information boxes can be shown/hidden based on other field values, just like form fields:

```yaml
- type: "info"
  title: "SSL Configuration Required"
  content: "Since you've enabled SSL, please configure the HTTPS settings below."
  style: "info"
  show_if: "enable_ssl == true"
```

### Collapsible Boxes
Make boxes collapsible to save space and provide optional detailed information:

```yaml
- type: "info"
  title: "Advanced Configuration"
  content: "These advanced settings are optional and can be configured later if needed."
  collapsible: true
  expanded: false  # Starts collapsed
```

### Grouping with Boxes
Use information boxes to create logical sections in your forms:

```yaml
fields:
  - type: "info"
    title: "Step 1: Basic Configuration"
    content: "Configure the fundamental settings for your deployment."
    style: "info"
  
  - type: "text"
    label: "Project Name"
    key: "project_name"
    required: true
  
  - type: "info"
    title: "Step 2: Advanced Settings"
    content: "Optional advanced configuration for power users."
    style: "info"
    collapsible: true
    expanded: false
  
  - type: "checkbox"
    label: "Enable Debug Mode"
    key: "debug_mode"
    default: false
```

## Best Practices

1. **Validation**: Always validate required fields and provide good defaults
2. **Documentation**: Use clear labels and helpful descriptions
3. **Information Boxes**: Use info boxes to guide users through complex configurations
4. **Visual Hierarchy**: Use different box styles (info, warning, success, error) to create clear visual cues
5. **Collapsible Content**: Make detailed explanations collapsible to keep the interface clean
6. **Conditional Information**: Show relevant information boxes based on user selections
7. **Error Handling**: Make your deployment scripts robust with error checking
8. **Logging**: Log important steps for debugging
9. **Templates**: Use templates for complex configuration files
10. **Testing**: Test with different input combinations