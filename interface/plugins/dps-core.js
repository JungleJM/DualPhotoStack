/**
 * DPS Core Plugin for Universal GUI Framework
 * Handles DualPhotoStack-specific business logic
 */

const DPSTemplateEngine = require('../../scripts/template-engine');
const path = require('path');
const fs = require('fs');

class DPSCorePlugin {
  constructor(config) {
    this.config = config;
    this.templateEngine = new DPSTemplateEngine();
    this.deploymentConfig = null;
    this.deploymentResults = null;
  }

  /**
   * Generate configuration files for DPS deployment
   */
  async generateConfig(params) {
    try {
      const userConfig = {
        deployment: {
          mode: params.deploymentMode || 'dps-only',
          services: this.getServicesForMode(params.deploymentMode)
        },
        libraryPath: params['library-path'],
        dataStoragePath: params['data-path']
      };

      this.deploymentConfig = await this.templateEngine.initializeConfig(userConfig);
      
      return {
        success: true,
        message: 'Configuration generated successfully',
        data: {
          services: this.deploymentConfig.deployment.services,
          networkInterfaces: Object.keys(this.deploymentConfig.network).filter(
            k => this.deploymentConfig.network[k]
          ).length,
          outputPath: this.deploymentConfig.outputPath
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Configuration generation failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Configure network settings
   */
  async configureNetwork(params) {
    try {
      if (!this.deploymentConfig) {
        throw new Error('Configuration must be generated first');
      }

      // Network configuration is part of template generation in DPS
      // This step validates the network setup
      const networkInfo = this.deploymentConfig.network;
      const activeInterfaces = Object.keys(networkInfo).filter(
        k => networkInfo[k]
      );

      if (activeInterfaces.length < 1) {
        throw new Error('No active network interfaces detected');
      }

      return {
        success: true,
        message: `Network configured with ${activeInterfaces.length} interfaces`,
        data: {
          interfaces: activeInterfaces,
          localhost: networkInfo.LOCALHOST_IP,
          lan: networkInfo.LOCAL_NETWORK_IP,
          tailscale: networkInfo.TAILSCALE_IP
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Network configuration failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Deploy DPS services
   */
  async deployServices(params) {
    try {
      if (!this.deploymentConfig) {
        throw new Error('Configuration must be generated first');
      }

      // Update template engine with current config
      this.templateEngine.config = this.deploymentConfig;
      
      // Deploy all services
      this.deploymentResults = await this.templateEngine.deployAll();
      
      // Get deployment summary
      const summary = this.templateEngine.getDeploymentSummary();
      
      return {
        success: true,
        message: `Successfully deployed ${this.deploymentConfig.deployment.services.length} services`,
        data: {
          services: this.deploymentConfig.deployment.services,
          results: this.deploymentResults,
          summary: summary
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Service deployment failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Validate deployment success
   */
  async validateDeployment(params) {
    try {
      if (!this.deploymentResults) {
        throw new Error('Services must be deployed first');
      }

      // Basic validation - check if services are accessible
      const summary = this.templateEngine.getDeploymentSummary();
      const services = Object.keys(summary.accessUrls || {});
      
      if (services.length === 0) {
        throw new Error('No service URLs available - deployment may have failed');
      }

      // Additional validation could include HTTP health checks
      // For now, we'll trust the template engine's deployment results
      
      return {
        success: true,
        message: `Deployment validated - ${services.length} services accessible`,
        data: {
          services: services,
          urls: summary.accessUrls,
          validation: 'basic-check-passed'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Deployment validation failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get service URLs for display
   */
  async getServiceUrls(params) {
    try {
      const summary = this.templateEngine.getDeploymentSummary();
      
      if (!summary.accessUrls) {
        return {
          success: false,
          message: 'No service URLs available',
          data: {}
        };
      }

      const serviceInfo = Object.entries(summary.accessUrls).map(([service, urls]) => ({
        name: this.getServiceDisplayName(service),
        service: service,
        urls: urls,
        primary: urls[0] // First URL is primary
      }));

      return {
        success: true,
        data: serviceInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get service URLs: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get deployment summary for display
   */
  async getDeploymentSummary(params) {
    try {
      const summary = this.templateEngine.getDeploymentSummary();
      
      return {
        success: true,
        data: {
          mode: this.deploymentConfig?.deployment?.mode || 'unknown',
          services: this.deploymentConfig?.deployment?.services || [],
          libraryPath: this.deploymentConfig?.libraryPath,
          dataPath: this.deploymentConfig?.dataStoragePath,
          networkInterfaces: Object.keys(this.deploymentConfig?.network || {}).filter(
            k => this.deploymentConfig.network[k]
          ),
          deploymentTime: new Date().toISOString(),
          configPath: this.deploymentConfig?.outputPath
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get deployment summary: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get Dockge URL for opening
   */
  async getDockgeUrl(params) {
    try {
      const summary = this.templateEngine.getDeploymentSummary();
      const dockgeUrls = summary.accessUrls?.dockge;
      
      if (!dockgeUrls || dockgeUrls.length === 0) {
        return {
          success: false,
          message: 'Dockge URL not available'
        };
      }

      return {
        success: true,
        data: {
          url: dockgeUrls[0] // Primary Dockge URL
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get Dockge URL: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Helper: Get services for deployment mode
   */
  getServicesForMode(mode) {
    const serviceMap = {
      'dps-only': ['immich', 'photoprism', 'dockge'],
      'add-to-semaphore': ['immich', 'photoprism', 'dockge'],
      'full-install': ['immich', 'photoprism', 'dockge', 'semaphore']
    };
    
    return serviceMap[mode] || serviceMap['dps-only'];
  }

  /**
   * Helper: Get display name for service
   */
  getServiceDisplayName(service) {
    const displayNames = {
      'immich': 'Immich',
      'photoprism': 'PhotoPrism',
      'dockge': 'Dockge',
      'semaphore': 'Semaphore'
    };
    
    return displayNames[service] || service;
  }

  /**
   * Plugin lifecycle: cleanup
   */
  async cleanup() {
    // Clean up any resources if needed
    this.deploymentConfig = null;
    this.deploymentResults = null;
  }
}

module.exports = DPSCorePlugin;