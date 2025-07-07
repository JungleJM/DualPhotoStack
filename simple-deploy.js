#!/usr/bin/env node

/**
 * Simple Docker Deployment Script for DualPhotoStack
 * Replaces complex template system with straightforward file copying and variable replacement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class SimpleDPSDeployer {
  constructor() {
    this.outputDir = path.join(process.env.HOME, '.local', 'share', 'docker-stacks');
    this.sourceDir = path.join(__dirname, 'simple-docker');
  }

  /**
   * Main deployment function
   */
  async deploy(config) {
    console.log('🚀 Starting Simple DPS Deployment...');
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }

    // Generate configuration
    const deployConfig = this.generateConfig(config);
    console.log('⚙️ Generated deployment configuration');

    // Deploy each service
    const services = config.services || ['immich', 'photoprism', 'dockge'];
    
    for (const service of services) {
      await this.deployService(service, deployConfig);
    }

    // Create network
    this.createNetwork();

    console.log('✅ Deployment complete!');
    this.printAccessInfo(deployConfig);
  }

  /**
   * Deploy a single service
   */
  async deployService(service, config) {
    console.log(`📦 Deploying ${service}...`);
    
    const serviceDir = path.join(this.outputDir, service);
    const sourceServiceDir = path.join(this.sourceDir, 'stacks', service);
    
    // Create service directory
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }

    // Create data directory
    const dataDir = path.join(serviceDir, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`  📁 Created data directory: ${dataDir}`);
    }

    // Copy and process files
    if (fs.existsSync(sourceServiceDir)) {
      const files = fs.readdirSync(sourceServiceDir);
      
      for (const file of files) {
        const sourcePath = path.join(sourceServiceDir, file);
        const destPath = path.join(serviceDir, file.includes('compose') ? 'docker-compose.yml' : file);
        
        let content = fs.readFileSync(sourcePath, 'utf8');
        
        // Simple variable replacement
        content = this.replaceVariables(content, config, service);
        
        fs.writeFileSync(destPath, content);
        console.log(`  📄 Processed: ${file} → ${path.basename(destPath)}`);
      }
    } else {
      console.log(`  ⚠️ No source files found for ${service}`);
    }

    // Start service if requested
    if (config.autoStart) {
      await this.startService(service, serviceDir);
    }
  }

  /**
   * Simple variable replacement (no complex templating)
   */
  replaceVariables(content, config, service) {
    const variables = {
      // Paths
      '{{STACK_PATH}}': this.outputDir,
      '${UPLOAD_LOCATION}': path.join(config.libraryPath, 'apps', service),
      '${SHARED_LIBRARY_LOCATION}': config.libraryPath,
      '${IMMICH_APP_LOCATION}': path.join(config.libraryPath, 'apps', 'immich'),
      '${DB_DATA_LOCATION}': path.join(this.outputDir, service, 'data', 'database'),
      
      // Passwords
      '${DB_PASSWORD}': config.secrets.dbPassword,
      '${PHOTOPRISM_DATABASE_PASSWORD}': config.secrets.photoprismDbPassword,
      '${PHOTOPRISM_ROOT_PASSWORD}': config.secrets.photoprismRootPassword,
      '${PHOTOPRISM_ADMIN_PASSWORD}': config.secrets.photoprismAdminPassword,
      
      // Network/URLs
      'TZ=America/Chicago': `TZ=${config.timezone}`,
      '2283:2283': '127.0.0.1:2283:2283',
      '2342:2342': '127.0.0.1:2342:2342',
      '5001:5001': '127.0.0.1:5001:5001',
      
      // Paths to relative data directories
      '/mnt/photovault/library': config.libraryPath,
      '/mnt/photovault/apps/photoprism/sidecar': './data/sidecar',
      '/mnt/photovault/apps/photoprism/cache': './data/cache',
      '/mnt/photovault/apps/photoprism/albums': './data/albums',
    };

    let processed = content;
    
    // Replace all variables
    for (const [placeholder, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return processed;
  }

  /**
   * Generate deployment configuration
   */
  generateConfig(userConfig) {
    return {
      libraryPath: userConfig.libraryPath || '/mnt/photovault/library',
      timezone: userConfig.timezone || 'America/Chicago',
      autoStart: userConfig.autoStart !== false,
      secrets: {
        dbPassword: this.generatePassword(24),
        photoprismDbPassword: this.generatePassword(24),
        photoprismRootPassword: this.generatePassword(24),
        photoprismAdminPassword: this.generatePassword(16),
      },
      network: {
        localhost: '127.0.0.1'
      }
    };
  }

  /**
   * Generate secure password
   */
  generatePassword(length) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  /**
   * Create Docker network
   */
  createNetwork() {
    try {
      execSync('docker network create dps-network 2>/dev/null || true', { stdio: 'ignore' });
      console.log('🔗 Docker network ready');
    } catch (error) {
      console.log('⚠️ Network creation skipped (may already exist)');
    }
  }

  /**
   * Start a service
   */
  async startService(service, serviceDir) {
    try {
      console.log(`  🔄 Starting ${service} containers...`);
      
      process.chdir(serviceDir);
      execSync('docker compose up -d', { stdio: 'inherit' });
      
      console.log(`  ✅ ${service} started successfully`);
    } catch (error) {
      console.log(`  ❌ Failed to start ${service}: ${error.message}`);
    }
  }

  /**
   * Print access information
   */
  printAccessInfo(config) {
    console.log('\n🌐 Service Access Information:');
    console.log('  Immich:     http://127.0.0.1:2283');
    console.log('  PhotoPrism: http://127.0.0.1:2342');
    console.log('  Dockge:     http://127.0.0.1:5001');
    console.log(`\n📁 Data Location: ${this.outputDir}`);
    console.log(`📚 Library Path: ${config.libraryPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new SimpleDPSDeployer();
  
  // Simple configuration - can be made interactive later
  const config = {
    libraryPath: process.argv[2] || '/home/user/Photos',
    services: ['immich', 'photoprism', 'dockge'],
    autoStart: true
  };

  deployer.deploy(config).catch(console.error);
}

module.exports = SimpleDPSDeployer;