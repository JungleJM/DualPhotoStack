/**
 * Example usage of the DPS Template Engine
 * This demonstrates how the Electron app would use the template system
 */

const DPSTemplateEngine = require('./template-engine');

async function exampleDeployment() {
  console.log('🚀 DPS Template Engine Example Usage\n');

  // Initialize template engine
  const engine = new DPSTemplateEngine();

  // Example user configuration (from Electron app wizard)
  const userConfig = {
    deployment: {
      mode: 'full-install',
      services: ['immich', 'photoprism', 'dockge', 'semaphore']
    },
    libraryPath: '/home/user/Photos',
    dataStoragePath: '/home/user/dps-data'
  };

  try {
    // Initialize configuration with auto-detection
    console.log('📡 Detecting network interfaces and generating configuration...');
    const config = await engine.initializeConfig(userConfig);
    
    console.log('Network Configuration:');
    console.log(`  Localhost: ${config.network.LOCALHOST_IP}`);
    console.log(`  LAN IP: ${config.network.LOCAL_NETWORK_IP || 'Not detected'}`);
    console.log(`  Tailscale IP: ${config.network.TAILSCALE_IP || 'Not detected'}`);
    console.log();

    console.log('Generated URLs:');
    console.log(`  Immich: ${config.urls.IMMICH_SERVER_URL}`);
    console.log(`  PhotoPrism: ${config.urls.PHOTOPRISM_SITE_URL}`);
    console.log();

    // Deploy services
    console.log('📦 Deploying services to ~/.local/share/docker-stacks...');
    const deploymentResults = await engine.deployAll();
    
    Object.entries(deploymentResults).forEach(([service, success]) => {
      console.log(`  ${service}: ${success ? '✅ Success' : '❌ Failed'}`);
    });
    console.log();

    // Get deployment summary
    const summary = engine.getDeploymentSummary();
    console.log('🎯 Deployment Summary:');
    console.log(`Services: ${summary.services.join(', ')}`);
    console.log();
    
    console.log('Access URLs:');
    Object.entries(summary.accessUrls).forEach(([service, urls]) => {
      if (urls.length > 0) {
        console.log(`  ${service.toUpperCase()}:`);
        urls.forEach(url => console.log(`    - ${url}`));
      }
    });
    console.log();

    // Save configuration
    const configPath = '/tmp/dps-config.json';
    engine.saveConfig(configPath);
    console.log(`💾 Configuration saved to: ${configPath}`);
    
    console.log('\\n🎉 DPS deployment example completed!');
    console.log('\\nNext steps:');
    console.log('1. Start services with: cd ~/.local/share/docker-stacks/<service> && docker compose up -d');
    console.log('2. Access Dockge at one of the URLs above to manage containers');
    console.log('3. Configure Immich mobile app with the Immich server URL');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  exampleDeployment();
}

module.exports = { exampleDeployment };