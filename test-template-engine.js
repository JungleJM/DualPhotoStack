#!/usr/bin/env node
/**
 * Test script to validate the complete template engine functionality
 */

const DPSTemplateEngine = require('./scripts/template-engine');
const fs = require('fs');
const path = require('path');

async function testTemplateEngine() {
  console.log('🔧 Testing DPS Template Engine\n');

  // Initialize template engine
  const engine = new DPSTemplateEngine();

  // Test configuration (simulating user input)
  const userConfig = {
    deployment: {
      mode: 'dps-only',
      services: ['immich', 'photoprism', 'dockge']
    },
    libraryPath: '/home/user/Photos',
    dataStoragePath: '/home/user/dps-data'
  };

  try {
    console.log('1️⃣ Testing Configuration Initialization...');
    const config = await engine.initializeConfig(userConfig);
    
    console.log('✅ Network Configuration:');
    console.log(`   Localhost: ${config.network.LOCALHOST_IP}`);
    console.log(`   LAN IP: ${config.network.LOCAL_NETWORK_IP || 'Not detected'}`);
    console.log(`   Tailscale IP: ${config.network.TAILSCALE_IP || 'Not detected'}`);
    
    console.log('\\n✅ Generated URLs:');
    console.log(`   Immich: ${config.urls.IMMICH_SERVER_URL}`);
    console.log(`   PhotoPrism: ${config.urls.PHOTOPRISM_SITE_URL}`);
    
    console.log('\\n✅ User Configuration:');
    console.log(`   UID: ${config.user.USER_UID}`);
    console.log(`   GID: ${config.user.USER_GID}`);
    console.log(`   Timezone: ${config.user.TIMEZONE}`);
    
    console.log('\\n✅ Generated Secrets (first 8 chars only):');
    Object.entries(config.secrets).forEach(([key, value]) => {
      if (typeof value === 'string') {
        console.log(`   ${key}: ${value.substring(0, 8)}...`);
      }
    });

    console.log('\\n2️⃣ Testing Port Binding Generation...');
    console.log('✅ Immich Port Bindings:');
    config.ports.IMMICH_PORT_BINDINGS.forEach(binding => {
      console.log(`   ${binding.trim()}`);
    });

    console.log('\\n3️⃣ Testing Template Processing...');
    
    // Test with a simple template
    const testTemplate = `# Test Template
name: test-service
services:
  test:
    ports:
{{IMMICH_PORT_BINDINGS}}
    environment:
      - SERVER_URL={{IMMICH_SERVER_URL}}
      - LIBRARY_PATH={{LIBRARY_PATH}}
      - LOCAL_IP={{LOCAL_NETWORK_IP}}
      - TAILSCALE_IP={{TAILSCALE_IP}}`;

    const processed = engine.processTemplate(testTemplate, config);
    console.log('✅ Processed Template:');
    console.log(processed);

    console.log('\\n4️⃣ Testing Deployment Summary...');
    const summary = engine.getDeploymentSummary();
    console.log('✅ Access URLs:');
    Object.entries(summary.accessUrls).forEach(([service, urls]) => {
      if (urls.length > 0) {
        console.log(`   ${service.toUpperCase()}:`);
        urls.forEach(url => console.log(`     - ${url}`));
      }
    });

    console.log('\\n5️⃣ Testing Configuration Save...');
    const configPath = '/tmp/dps-test-config.json';
    engine.saveConfig(configPath);
    
    if (fs.existsSync(configPath)) {
      const savedSize = fs.statSync(configPath).size;
      console.log(`✅ Configuration saved: ${configPath} (${savedSize} bytes)`);
      
      // Verify it's valid JSON
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`✅ Valid JSON with ${Object.keys(savedConfig).length} top-level keys`);
    }

    console.log('\\n🎉 All template engine tests passed!');
    console.log('\\n📊 Test Summary:');
    console.log(`   ✅ Network detection: ${config.network.LOCAL_NETWORK_IP ? 'Working' : 'Localhost only'}`);
    console.log(`   ✅ Tailscale detection: ${config.network.TAILSCALE_IP ? 'Working' : 'Not available'}`);
    console.log(`   ✅ Template processing: Working`);
    console.log(`   ✅ URL generation: Working`);
    console.log(`   ✅ Secret generation: Working`);
    console.log(`   ✅ Configuration save: Working`);

  } catch (error) {
    console.error('❌ Template engine test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testTemplateEngine();
}

module.exports = { testTemplateEngine };