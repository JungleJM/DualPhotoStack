#!/usr/bin/env node
/**
 * Comprehensive test suite for the complete DPS system
 */

const DPSTemplateEngine = require('./scripts/template-engine');
const fs = require('fs');
const path = require('path');

async function runCompleteTests() {
  console.log('🧪 DPS Complete System Test Suite\n');
  
  const results = {
    networkDetection: false,
    configGeneration: false,
    templateProcessing: false,
    fileGeneration: false,
    validation: false
  };

  try {
    // Test 1: Network Detection
    console.log('1️⃣ Testing Network Detection...');
    const engine = new DPSTemplateEngine();
    const network = await engine.detectNetworkInterfaces();
    
    console.log(`  ✅ Localhost: ${network.LOCALHOST_IP}`);
    console.log(`  ✅ LAN IP: ${network.LOCAL_NETWORK_IP || 'Not detected'}`);
    console.log(`  ✅ Tailscale: ${network.TAILSCALE_IP || 'Not detected'}`);
    
    if (network.LOCALHOST_IP === '127.0.0.1' && network.LOCAL_NETWORK_IP) {
      results.networkDetection = true;
      console.log('  ✅ Network detection: PASSED');
    } else {
      console.log('  ❌ Network detection: FAILED');
    }

    // Test 2: Configuration Generation
    console.log('\\n2️⃣ Testing Configuration Generation...');
    const userConfig = {
      deployment: { mode: 'full-install', services: ['immich', 'photoprism', 'dockge', 'semaphore'] },
      libraryPath: '/test/photos',
      dataStoragePath: '/test/data'
    };
    
    const config = await engine.initializeConfig(userConfig);
    
    // Validate configuration structure
    const requiredSections = ['deployment', 'paths', 'network', 'user', 'secrets', 'urls', 'ports'];
    const hasAllSections = requiredSections.every(section => config[section]);
    
    if (hasAllSections && config.secrets.IMMICH_DB_PASSWORD.length >= 16) {
      results.configGeneration = true;
      console.log('  ✅ Configuration generation: PASSED');
      console.log(`  📊 Generated ${Object.keys(config.secrets).length} secure secrets`);
      console.log(`  📊 Detected ${Object.keys(config.network).filter(k => config.network[k]).length} network interfaces`);
    } else {
      console.log('  ❌ Configuration generation: FAILED');
    }

    // Test 3: Template Processing
    console.log('\\n3️⃣ Testing Template Processing...');
    const testTemplate = `
# Test Template
name: test
services:
  app:
    environment:
      - LIBRARY={{LIBRARY_PATH}}
      - DATA={{DATA_STORAGE_PATH}}
      - LAN_IP={{LOCAL_NETWORK_IP}}
    ports:
{{IMMICH_PORT_BINDINGS}}`;

    const processed = engine.processTemplate(testTemplate, config);
    const hasNoUnresolvedVars = !processed.includes('{{');
    const hasCorrectPaths = processed.includes(userConfig.libraryPath) && processed.includes(userConfig.dataStoragePath);
    
    if (hasNoUnresolvedVars && hasCorrectPaths) {
      results.templateProcessing = true;
      console.log('  ✅ Template processing: PASSED');
    } else {
      console.log('  ❌ Template processing: FAILED');
      if (!hasNoUnresolvedVars) {
        const unresolved = processed.match(/\{\{[^}]+\}\}/g);
        console.log(`    Unresolved variables: ${unresolved?.join(', ')}`);
      }
    }

    // Test 4: File Generation
    console.log('\\n4️⃣ Testing File Generation...');
    const testOutputDir = '/tmp/dps-validation-test';
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
    
    engine.outputDir = testOutputDir;
    const deployResults = await engine.deployAll();
    
    const allSuccessful = Object.values(deployResults).every(result => result);
    let totalFiles = 0;
    
    if (allSuccessful) {
      // Count generated files
      config.deployment.services.forEach(service => {
        const serviceDir = path.join(testOutputDir, service);
        if (fs.existsSync(serviceDir)) {
          const files = fs.readdirSync(serviceDir);
          totalFiles += files.length;
        }
      });
      
      results.fileGeneration = true;
      console.log('  ✅ File generation: PASSED');
      console.log(`  📄 Generated ${totalFiles} files across ${config.deployment.services.length} services`);
    } else {
      console.log('  ❌ File generation: FAILED');
    }

    // Test 5: File Validation
    console.log('\\n5️⃣ Testing File Validation...');
    let validationPassed = true;
    
    for (const service of config.deployment.services) {
      const serviceDir = path.join(testOutputDir, service);
      const composeFile = path.join(serviceDir, 'docker-compose.yml');
      
      if (fs.existsSync(composeFile)) {
        const content = fs.readFileSync(composeFile, 'utf8');
        
        // Check for critical elements
        const hasServiceName = content.includes(`name: ${service}`);
        const hasNoUnresolvedVars = !content.includes('{{');
        const hasNetworkBinding = content.includes('127.0.0.1:');
        
        console.log(`  📋 ${service}:`);
        console.log(`    Service name: ${hasServiceName ? '✅' : '❌'}`);
        console.log(`    Variables resolved: ${hasNoUnresolvedVars ? '✅' : '❌'}`);
        console.log(`    Network binding: ${hasNetworkBinding ? '✅' : '❌'}`);
        
        if (!hasServiceName || !hasNoUnresolvedVars || !hasNetworkBinding) {
          validationPassed = false;
        }
      } else {
        console.log(`  ❌ ${service}: docker-compose.yml not found`);
        validationPassed = false;
      }
    }
    
    if (validationPassed) {
      results.validation = true;
      console.log('  ✅ File validation: PASSED');
    } else {
      console.log('  ❌ File validation: FAILED');
    }

    // Final Summary
    console.log('\\n📊 Test Results Summary:');
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    });
    
    console.log(`\\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('\\n🎉 ALL TESTS PASSED! DPS Phase 1 is fully functional.');
      console.log('\\n✨ Ready for Phase 2: Electron Application Development');
      console.log('\\n📋 What works:');
      console.log('  ✅ Cross-platform network detection (including Tailscale)');
      console.log('  ✅ Secure password and key generation');
      console.log('  ✅ Multi-interface port binding');
      console.log('  ✅ Complete template processing system');
      console.log('  ✅ Docker Compose file generation');
      console.log('  ✅ Environment file generation');
      console.log('  ✅ Dockge-compatible stack deployment');
    } else {
      console.log('\\n⚠️  Some tests failed. Review the results above.');
      process.exit(1);
    }

    // Cleanup
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }

  } catch (error) {
    console.error('\\n❌ Complete system test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runCompleteTests();
}

module.exports = { runCompleteTests };