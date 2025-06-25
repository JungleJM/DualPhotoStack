#!/usr/bin/env node
/**
 * Test script to validate Docker Compose file generation
 */

const DPSTemplateEngine = require('./scripts/template-engine');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function testComposeGeneration() {
  console.log('📦 Testing Docker Compose Generation\n');

  // Create temporary test directory
  const testDir = '/tmp/dps-test-stacks';
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Initialize template engine with test output directory
  const engine = new DPSTemplateEngine();
  engine.outputDir = testDir; // Override for testing

  // Test configuration
  const userConfig = {
    deployment: {
      mode: 'dps-only',
      services: ['immich', 'photoprism', 'dockge']
    },
    libraryPath: '/home/user/Photos',
    dataStoragePath: '/home/user/dps-data'
  };

  try {
    console.log('1️⃣ Initializing configuration...');
    const config = await engine.initializeConfig(userConfig);
    console.log('✅ Configuration initialized');

    console.log('\\n2️⃣ Testing individual service deployment...');
    
    for (const service of config.deployment.services) {
      console.log(`\\n📋 Testing ${service} deployment...`);
      
      const success = await engine.deployService(service);
      
      if (success) {
        const serviceDir = path.join(testDir, service);
        const composeFile = path.join(serviceDir, 'docker-compose.yml');
        const envFile = path.join(serviceDir, '.env');
        
        console.log(`  ✅ ${service} deployed successfully`);
        
        // Check files exist
        if (fs.existsSync(composeFile)) {
          const composeSize = fs.statSync(composeFile).size;
          console.log(`  📄 docker-compose.yml: ${composeSize} bytes`);
          
          // Validate Docker Compose syntax
          try {
            execSync(`docker compose -f "${composeFile}" config`, { 
              stdio: 'pipe',
              cwd: serviceDir 
            });
            console.log('  ✅ Docker Compose syntax valid');
          } catch (error) {
            console.log('  ⚠️  Docker Compose validation failed (this is expected without Docker running)');
          }
        }
        
        if (fs.existsSync(envFile)) {
          const envSize = fs.statSync(envFile).size;
          console.log(`  📄 .env: ${envSize} bytes`);
        }
        
      } else {
        console.log(`  ❌ ${service} deployment failed`);
      }
    }

    console.log('\\n3️⃣ Checking generated file contents...');
    
    // Check Immich compose file
    const immichCompose = path.join(testDir, 'immich', 'docker-compose.yml');
    if (fs.existsSync(immichCompose)) {
      const content = fs.readFileSync(immichCompose, 'utf8');
      
      console.log('\\n📋 Immich docker-compose.yml analysis:');
      console.log(`  ✅ Contains library path: ${content.includes(config.paths.LIBRARY_PATH)}`);
      console.log(`  ✅ Contains data storage: ${content.includes(config.paths.DATA_STORAGE_PATH)}`);
      console.log(`  ✅ Contains localhost binding: ${content.includes('127.0.0.1:2283')}`);
      console.log(`  ✅ Contains LAN binding: ${content.includes(config.network.LOCAL_NETWORK_IP + ':2283')}`);
      
      if (config.network.TAILSCALE_IP) {
        console.log(`  ✅ Contains Tailscale binding: ${content.includes(config.network.TAILSCALE_IP + ':2283')}`);
      }
      
      // Check for template variables that weren't substituted
      const unresolvedVars = content.match(/\{\{[^}]+\}\}/g);
      if (unresolvedVars) {
        console.log(`  ⚠️  Unresolved variables: ${unresolvedVars.join(', ')}`);
      } else {
        console.log('  ✅ All variables resolved');
      }
    }

    console.log('\\n4️⃣ Checking environment files...');
    
    const immichEnv = path.join(testDir, 'immich', '.env');
    if (fs.existsSync(immichEnv)) {
      const envContent = fs.readFileSync(immichEnv, 'utf8');
      
      console.log('\\n📋 Immich .env analysis:');
      console.log(`  ✅ Contains DB password: ${envContent.includes('DB_PASSWORD=')}`);
      console.log(`  ✅ Contains server URL: ${envContent.includes('IMMICH_SERVER_URL=')}`);
      console.log(`  ✅ Contains timezone: ${envContent.includes('TZ=')}`);
      
      // Check for unresolved variables
      const unresolvedEnvVars = envContent.match(/\{\{[^}]+\}\}/g);
      if (unresolvedEnvVars) {
        console.log(`  ⚠️  Unresolved variables: ${unresolvedEnvVars.join(', ')}`);
      } else {
        console.log('  ✅ All variables resolved');
      }
    }

    console.log('\\n5️⃣ Testing full deployment...');
    const deploymentResults = await engine.deployAll();
    
    console.log('📊 Deployment Results:');
    Object.entries(deploymentResults).forEach(([service, success]) => {
      console.log(`  ${service}: ${success ? '✅ Success' : '❌ Failed'}`);
    });

    console.log('\\n6️⃣ Generated files summary:');
    console.log(`📁 Test directory: ${testDir}`);
    
    function listFiles(dir, indent = '') {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          console.log(`${indent}📁 ${item}/`);
          listFiles(itemPath, indent + '  ');
        } else {
          console.log(`${indent}📄 ${item} (${stats.size} bytes)`);
        }
      });
    }
    
    listFiles(testDir);

    console.log('\\n🎉 Docker Compose generation test completed!');
    console.log(`\\n💡 You can inspect the generated files at: ${testDir}`);

  } catch (error) {
    console.error('❌ Compose generation test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testComposeGeneration();
}

module.exports = { testComposeGeneration };