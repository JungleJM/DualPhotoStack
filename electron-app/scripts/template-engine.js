/**
 * Dual Photo Stack Template Engine
 * Handles variable substitution and configuration generation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');

class DPSTemplateEngine {
  constructor() {
    this.config = {};
    this.templateDir = path.join(__dirname, '..', 'docker-templates');
    this.outputDir = path.join(process.env.HOME, '.local', 'share', 'docker-stacks');
  }

  /**
   * Initialize configuration with user inputs and auto-detected values
   */
  async initializeConfig(userConfig) {
    this.config = {
      deployment: userConfig.deployment,
      paths: {
        LIBRARY_PATH: userConfig.libraryPath,
        DATA_STORAGE_PATH: userConfig.dataStoragePath,
        STACK_PATH: path.join(process.env.HOME, '.local', 'share', 'docker-stacks')
      },
      network: await this.detectNetworkInterfaces(),
      user: this.getUserInfo(),
      secrets: this.generateSecrets(),
      urls: {},
      ports: {},
      api: {
        IMMICH_API_KEY: null // Will be set after deployment
      }
    };

    // Generate URLs based on detected network
    this.generateUrls();
    
    // Generate port bindings
    this.generatePortBindings();

    return this.config;
  }

  /**
   * Detect available network interfaces
   */
  async detectNetworkInterfaces() {
    const network = {
      LOCALHOST_IP: '127.0.0.1',
      LOCAL_NETWORK_IP: null,
      TAILSCALE_IP: null
    };

    try {
      // Detect local network IP
      const interfaces = os.networkInterfaces();
      for (const [name, addresses] of Object.entries(interfaces)) {
        for (const addr of addresses) {
          if (addr.family === 'IPv4' && !addr.internal && addr.address !== '127.0.0.1') {
            // Prefer non-Tailscale interfaces for local network
            if (!addr.address.startsWith('100.')) {
              network.LOCAL_NETWORK_IP = addr.address;
              break;
            }
          }
        }
        if (network.LOCAL_NETWORK_IP) break;
      }

      // Detect Tailscale IP with platform-specific paths
      network.TAILSCALE_IP = this.getTailscaleIP();

    } catch (error) {
      console.error('Network detection error:', error.message);
      // Fallback to localhost only
      network.LOCAL_NETWORK_IP = '127.0.0.1';
    }

    return network;
  }

  /**
   * Detect Tailscale IP with cross-platform support
   */
  getTailscaleIP() {
    const commands = [
      'tailscale ip --4',                                           // Standard Linux/PATH
      '/usr/bin/tailscale ip --4',                                 // Common Linux location
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale ip --4' // macOS location
    ];
    
    for (const cmd of commands) {
      try {
        const output = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
        if (output && output.startsWith('100.')) {
          console.log(`Tailscale detected via: ${cmd.split(' ')[0]}`);
          return output;
        }
      } catch (error) {
        continue; // Try next command
      }
    }
    
    console.log('Tailscale not detected or not running');
    return null;
  }

  /**
   * Get current user information
   */
  getUserInfo() {
    const userInfo = os.userInfo();
    return {
      USER_UID: userInfo.uid,
      USER_GID: userInfo.gid,
      TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
      SITE_AUTHOR: userInfo.username || 'DPS User'
    };
  }

  /**
   * Generate secure random passwords and keys
   */
  generateSecrets() {
    return {
      IMMICH_DB_PASSWORD: this.generatePassword(24),
      PHOTOPRISM_DB_PASSWORD: this.generatePassword(24),
      PHOTOPRISM_ROOT_PASSWORD: this.generatePassword(24),
      PHOTOPRISM_ADMIN_PASSWORD: this.generatePassword(16),
      SEMAPHORE_DB_PASSWORD: this.generatePassword(24),
      SEMAPHORE_ADMIN_PASSWORD: this.generatePassword(16),
      SEMAPHORE_ADMIN_EMAIL: 'admin@localhost',
      SEMAPHORE_ACCESS_KEY_ENCRYPTION: this.generateKey(32),
      JWT_SECRET: this.generateKey(32)
    };
  }

  /**
   * Generate secure random password
   */
  generatePassword(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Generate secure random key
   */
  generateKey(length) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate service URLs based on detected network
   */
  generateUrls() {
    // Use local network IP as primary, fallback to localhost
    const primaryIP = this.config.network.LOCAL_NETWORK_IP || this.config.network.LOCALHOST_IP;
    
    this.config.urls = {
      IMMICH_SERVER_URL: `http://${primaryIP}:2283`,
      PHOTOPRISM_SITE_URL: `http://${primaryIP}:2342`
    };
  }

  /**
   * Generate multi-interface port bindings
   */
  generatePortBindings() {
    const addresses = [this.config.network.LOCALHOST_IP];
    
    if (this.config.network.LOCAL_NETWORK_IP && 
        this.config.network.LOCAL_NETWORK_IP !== this.config.network.LOCALHOST_IP) {
      addresses.push(this.config.network.LOCAL_NETWORK_IP);
    }
    
    if (this.config.network.TAILSCALE_IP) {
      addresses.push(this.config.network.TAILSCALE_IP);
    }

    this.config.ports = {
      IMMICH_PORT_BINDINGS: addresses.map(addr => `      - "${addr}:2283:2283"`),
      PHOTOPRISM_PORT_BINDINGS: addresses.map(addr => `      - "${addr}:2342:2342"`),
      DOCKGE_PORT_BINDINGS: addresses.map(addr => `      - "${addr}:5001:5001"`),
      SEMAPHORE_PORT_BINDINGS: addresses.map(addr => `      - "${addr}:3000:3000"`)
    };
  }

  /**
   * Process template file with variable substitution
   */
  processTemplate(templateContent, config) {
    let processed = templateContent;

    // Substitute single variables like {{VARIABLE_NAME}}
    processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = this.getNestedValue(config, varName);
      if (value === undefined || value === null) {
        console.warn(`Warning: Variable ${varName} not found in config`);
        return ''; // Replace with empty string for null/undefined values
      }
      return value;
    });

    // Handle multi-line port bindings
    Object.entries(config.ports).forEach(([key, bindings]) => {
      const placeholder = `{{${key}}}`;
      if (processed.includes(placeholder)) {
        processed = processed.replace(placeholder, bindings.join('\n'));
      }
    });

    return processed;
  }

  /**
   * Get nested value from config object (e.g., "network.LOCAL_NETWORK_IP")
   * Also flattens config for direct access (e.g., "LIBRARY_PATH")
   */
  getNestedValue(obj, path) {
    // First try direct path lookup
    const directValue = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
    
    if (directValue !== undefined) {
      return directValue;
    }
    
    // Flatten config and try direct key lookup
    const flattened = this.flattenConfig(obj);
    return flattened[path];
  }

  /**
   * Flatten nested config object for easier template variable access
   */
  flattenConfig(obj) {
    const flattened = {};
    
    // Add all nested values with flattened keys
    const addToFlattened = (source, prefix = '') => {
      Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          addToFlattened(value, prefix ? `${prefix}.${key}` : key);
        } else {
          const flatKey = prefix ? `${prefix}.${key}` : key;
          flattened[flatKey] = value;
          flattened[key] = value; // Also add without prefix for direct access
        }
      });
    };
    
    addToFlattened(obj);
    return flattened;
  }

  /**
   * Deploy service templates to ~/.local/share/docker-stacks
   */
  async deployService(serviceName) {
    const serviceTemplateDir = path.join(this.templateDir, serviceName);
    const serviceOutputDir = path.join(this.outputDir, serviceName);

    // Create output directory
    fs.mkdirSync(serviceOutputDir, { recursive: true });

    try {
      // Process docker-compose.yml template
      const composeTemplate = fs.readFileSync(
        path.join(serviceTemplateDir, 'docker-compose.yml.template'), 
        'utf8'
      );
      const processedCompose = this.processTemplate(composeTemplate, this.config);
      fs.writeFileSync(
        path.join(serviceOutputDir, 'docker-compose.yml'), 
        processedCompose
      );

      // Process .env template if it exists
      const envTemplatePath = path.join(serviceTemplateDir, '.env.template');
      if (fs.existsSync(envTemplatePath)) {
        const envTemplate = fs.readFileSync(envTemplatePath, 'utf8');
        const processedEnv = this.processTemplate(envTemplate, this.config);
        fs.writeFileSync(
          path.join(serviceOutputDir, '.env'), 
          processedEnv
        );
      }

      console.log(`✅ Deployed ${serviceName} to ${serviceOutputDir}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to deploy ${serviceName}:`, error.message);
      return false;
    }
  }

  /**
   * Deploy all services based on deployment mode
   */
  async deployAll() {
    const services = this.config.deployment.services;
    const results = {};

    for (const service of services) {
      results[service] = await this.deployService(service);
    }

    // Create shared network
    try {
      execSync('docker network create dps-network || true', { stdio: 'ignore' });
    } catch (error) {
      console.log('Network creation skipped (may already exist)');
    }

    // Start the deployed services
    await this.startServices(services);

    return results;
  }

  /**
   * Get deployment summary with access URLs
   */
  getDeploymentSummary() {
    const summary = {
      services: this.config.deployment.services,
      accessUrls: {
        immich: [],
        photoprism: [],
        dockge: [],
        semaphore: []
      }
    };

    // Generate access URLs for each interface
    const addresses = [
      this.config.network.LOCALHOST_IP,
      this.config.network.LOCAL_NETWORK_IP,
      this.config.network.TAILSCALE_IP
    ].filter(Boolean);

    addresses.forEach(addr => {
      if (this.config.deployment.services.includes('immich')) {
        summary.accessUrls.immich.push(`http://${addr}:2283`);
      }
      if (this.config.deployment.services.includes('photoprism')) {
        summary.accessUrls.photoprism.push(`http://${addr}:2342`);
      }
      if (this.config.deployment.services.includes('dockge')) {
        summary.accessUrls.dockge.push(`http://${addr}:5001`);
      }
      if (this.config.deployment.services.includes('semaphore')) {
        summary.accessUrls.semaphore.push(`http://${addr}:3000`);
      }
    });

    return summary;
  }

  /**
   * Start deployed services using docker compose
   */
  async startServices(services) {
    console.log('Starting Docker services...');
    
    for (const service of services) {
      const serviceDir = path.join(this.outputDir, service);
      
      if (!fs.existsSync(serviceDir)) {
        console.log(`Warning: Service directory ${serviceDir} not found, skipping ${service}`);
        continue;
      }

      try {
        console.log(`Starting ${service} service...`);
        
        // Change to service directory and run docker compose up
        process.chdir(serviceDir);
        execSync('docker compose up -d', { stdio: 'inherit' });
        
        console.log(`✅ ${service} service started successfully`);
      } catch (error) {
        console.error(`❌ Failed to start ${service} service:`, error.message);
        throw error;
      }
    }
    
    console.log('All services started successfully!');
  }

  /**
   * Save configuration for future reference
   */
  saveConfig(outputPath) {
    const configToSave = {
      ...this.config,
      generated: new Date().toISOString(),
      version: '1.0.0'
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(configToSave, null, 2));
  }
}

module.exports = DPSTemplateEngine;