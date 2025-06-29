/**
 * Docker Plugin for Universal GUI Framework
 * Handles Docker detection and validation for DPS
 */

const { spawn } = require('child_process');

class DockerPlugin {
  constructor(config) {
    this.config = config;
  }

  /**
   * Check Docker installation and version
   */
  async checkInstallation(params) {
    try {
      // Check Docker
      const dockerResult = await this.checkDocker();
      
      // Check Docker Compose
      const composeResult = await this.checkDockerCompose();

      const success = dockerResult.success && composeResult.success;
      
      return {
        success: success,
        message: success 
          ? 'Docker and Docker Compose are available'
          : 'Docker installation issues detected',
        data: {
          docker: dockerResult.data,
          compose: composeResult.data,
          combined: success
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Docker check failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Check Docker daemon
   */
  async checkDocker() {
    try {
      // Check docker version
      const versionResult = await this.executeCommand('docker', ['--version']);
      const version = this.parseDockerVersion(versionResult.stdout);
      
      // Check if Docker daemon is running
      const psResult = await this.executeCommand('docker', ['ps'], 10000);
      
      // Validate minimum version
      const meetsMinVersion = this.compareVersions(version, this.config['min-version']) >= 0;
      
      return {
        success: true,
        data: {
          available: true,
          version: version,
          daemonRunning: true,
          meetsMinVersion: meetsMinVersion,
          rawVersion: versionResult.stdout.trim()
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          available: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Check Docker Compose
   */
  async checkDockerCompose() {
    try {
      // Try new 'docker compose' command first
      let composeResult;
      let isPlugin = true;
      
      try {
        composeResult = await this.executeCommand('docker', ['compose', 'version']);
      } catch (error) {
        // Fallback to legacy 'docker-compose' command
        try {
          composeResult = await this.executeCommand('docker-compose', ['--version']);
          isPlugin = false;
        } catch (legacyError) {
          throw new Error('Docker Compose not found (tried both docker compose and docker-compose)');
        }
      }

      const version = this.parseComposeVersion(composeResult.stdout);
      const meetsMinVersion = this.compareVersions(version, this.config['compose-min-version']) >= 0;
      
      return {
        success: true,
        data: {
          available: true,
          version: version,
          isPlugin: isPlugin,
          command: isPlugin ? 'docker compose' : 'docker-compose',
          meetsMinVersion: meetsMinVersion,
          rawVersion: composeResult.stdout.trim()
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          available: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Validate Docker Compose file syntax
   */
  async validateCompose(params) {
    try {
      const { filePath } = params;
      
      if (!filePath) {
        throw new Error('Compose file path required');
      }

      // Use docker-compose config to validate syntax
      const result = await this.executeCommand('docker', ['compose', '-f', filePath, 'config'], 15000);
      
      return {
        success: true,
        message: 'Docker Compose file is valid',
        data: {
          file: filePath,
          valid: true,
          services: this.extractServices(result.stdout)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Docker Compose validation failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get Docker version info
   */
  async getVersion(params) {
    try {
      const dockerInfo = await this.executeCommand('docker', ['version', '--format', '{{json .}}']);
      const parsed = JSON.parse(dockerInfo.stdout);
      
      return {
        success: true,
        data: {
          client: parsed.Client,
          server: parsed.Server
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get Docker version: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Helper: Execute command with timeout
   */
  executeCommand(command, args = [], timeout = 5000) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { timeout });
      
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Timeout handling
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Helper: Parse Docker version from output
   */
  parseDockerVersion(output) {
    const match = output.match(/Docker version (\d+\.\d+\.\d+)/);
    return match ? match[1] : '0.0.0';
  }

  /**
   * Helper: Parse Docker Compose version from output
   */
  parseComposeVersion(output) {
    // Handle both formats:
    // "Docker Compose version v2.21.0" (new)
    // "docker-compose version 1.29.2" (legacy)
    const match = output.match(/(?:version\s+v?|Docker Compose version v?)(\d+\.\d+\.\d+)/);
    return match ? match[1] : '0.0.0';
  }

  /**
   * Helper: Compare semantic versions
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Helper: Extract service names from compose config output
   */
  extractServices(composeOutput) {
    try {
      const lines = composeOutput.split('\n');
      const services = [];
      
      let inServicesSection = false;
      for (const line of lines) {
        if (line.trim() === 'services:') {
          inServicesSection = true;
          continue;
        }
        
        if (inServicesSection && line.match(/^[a-zA-Z]/)) {
          // New top-level section, exit services
          break;
        }
        
        if (inServicesSection && line.match(/^  \w+:/)) {
          const serviceName = line.trim().replace(':', '');
          services.push(serviceName);
        }
      }
      
      return services;
    } catch (error) {
      return [];
    }
  }
}

module.exports = DockerPlugin;