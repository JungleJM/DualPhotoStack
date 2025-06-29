/**
 * Network Plugin for Universal GUI Framework
 * Handles network detection and configuration for DPS
 */

const os = require('os');
const { spawn } = require('child_process');

class NetworkPlugin {
  constructor(config) {
    this.config = config;
    this.detectedInterfaces = null;
  }

  /**
   * Detect available network interfaces
   */
  async detectInterfaces(params) {
    try {
      const interfaces = {
        LOCALHOST_IP: '127.0.0.1', // Always available
        LOCAL_NETWORK_IP: null,
        TAILSCALE_IP: null
      };

      // Detect LAN IP
      const lanIP = this.detectLANInterface();
      if (lanIP) {
        interfaces.LOCAL_NETWORK_IP = lanIP;
      }

      // Detect Tailscale IP if enabled
      if (this.config['detect-tailscale']) {
        const tailscaleIP = await this.detectTailscaleInterface();
        if (tailscaleIP) {
          interfaces.TAILSCALE_IP = tailscaleIP;
        }
      }

      // Validate we have minimum required interfaces
      const activeInterfaces = Object.keys(interfaces).filter(k => interfaces[k]);
      const hasMinimum = activeInterfaces.length >= (this.config['require-localhost'] ? 1 : 2);

      this.detectedInterfaces = interfaces;

      return {
        success: hasMinimum,
        message: hasMinimum 
          ? `Network detection successful: ${activeInterfaces.length} interfaces`
          : 'Insufficient network interfaces detected',
        data: {
          interfaces: interfaces,
          active: activeInterfaces,
          count: activeInterfaces.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Network detection failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Display interfaces for UI
   */
  async displayInterfaces(params) {
    try {
      if (!this.detectedInterfaces) {
        // Run detection if not already done
        const detectResult = await this.detectInterfaces(params);
        if (!detectResult.success) {
          return detectResult;
        }
      }

      const interfaceList = Object.entries(this.detectedInterfaces)
        .filter(([key, value]) => value)
        .map(([key, value]) => ({
          name: this.getInterfaceDisplayName(key),
          key: key,
          ip: value,
          type: this.getInterfaceType(key)
        }));

      return {
        success: true,
        data: {
          interfaces: interfaceList,
          count: interfaceList.length,
          formatted: this.formatInterfacesForDisplay(interfaceList)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to display interfaces: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Validate network connectivity
   */
  async validateConnectivity(params) {
    try {
      const results = {};

      // Test localhost connectivity
      results.localhost = await this.testConnectivity('127.0.0.1', 22, 1000);

      // Test LAN connectivity if available
      if (this.detectedInterfaces?.LOCAL_NETWORK_IP) {
        results.lan = await this.testConnectivity(this.detectedInterfaces.LOCAL_NETWORK_IP, 22, 2000);
      }

      // Test Tailscale connectivity if available
      if (this.detectedInterfaces?.TAILSCALE_IP) {
        results.tailscale = await this.testConnectivity(this.detectedInterfaces.TAILSCALE_IP, 22, 3000);
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalTests = Object.keys(results).length;

      return {
        success: successCount > 0,
        message: `Connectivity test: ${successCount}/${totalTests} interfaces reachable`,
        data: {
          results: results,
          successRate: successCount / totalTests,
          recommendations: this.getConnectivityRecommendations(results)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connectivity validation failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Helper: Detect LAN interface IP
   */
  detectLANInterface() {
    try {
      const interfaces = os.networkInterfaces();
      
      for (const [name, addresses] of Object.entries(interfaces)) {
        if (name.toLowerCase().includes('lo')) continue; // Skip loopback
        
        for (const addr of addresses) {
          if (addr.family === 'IPv4' && !addr.internal) {
            // Check if it's a private IP range
            if (this.isPrivateIP(addr.address)) {
              return addr.address;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Detect Tailscale interface IP
   */
  async detectTailscaleInterface() {
    try {
      // Method 1: Check for tailscale command
      try {
        const result = await this.executeCommand('tailscale', ['ip'], 3000);
        const ip = result.stdout.trim();
        if (this.isValidIP(ip)) {
          return ip;
        }
      } catch (error) {
        // Tailscale command not available or not running
      }

      // Method 2: Check network interfaces for tailscale pattern
      const interfaces = os.networkInterfaces();
      for (const [name, addresses] of Object.entries(interfaces)) {
        if (name.toLowerCase().includes('tailscale') || name.toLowerCase().includes('tun')) {
          for (const addr of addresses) {
            if (addr.family === 'IPv4' && !addr.internal) {
              // Tailscale typically uses 100.x.x.x range
              if (addr.address.startsWith('100.')) {
                return addr.address;
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Check if IP is in private range
   */
  isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    return false;
  }

  /**
   * Helper: Validate IP address format
   */
  isValidIP(ip) {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * Helper: Get display name for interface
   */
  getInterfaceDisplayName(key) {
    const displayNames = {
      'LOCALHOST_IP': 'Localhost',
      'LOCAL_NETWORK_IP': 'Local Network',
      'TAILSCALE_IP': 'Tailscale VPN'
    };
    
    return displayNames[key] || key;
  }

  /**
   * Helper: Get interface type
   */
  getInterfaceType(key) {
    const types = {
      'LOCALHOST_IP': 'loopback',
      'LOCAL_NETWORK_IP': 'lan',
      'TAILSCALE_IP': 'vpn'
    };
    
    return types[key] || 'unknown';
  }

  /**
   * Helper: Format interfaces for display
   */
  formatInterfacesForDisplay(interfaces) {
    return interfaces.map(iface => 
      `${iface.name}: ${iface.ip} (${iface.type})`
    ).join('\n');
  }

  /**
   * Helper: Test connectivity to an IP/port
   */
  async testConnectivity(ip, port, timeout) {
    try {
      const result = await this.executeCommand('nc', ['-z', '-w', '1', ip, port.toString()], timeout);
      return { success: true, latency: 'fast' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Get connectivity recommendations
   */
  getConnectivityRecommendations(results) {
    const recommendations = [];
    
    if (!results.localhost?.success) {
      recommendations.push('Localhost connectivity issues detected - system may have network problems');
    }
    
    if (!results.lan?.success && results.lan !== undefined) {
      recommendations.push('LAN connectivity not available - services will only be accessible locally');
    }
    
    if (!results.tailscale?.success && results.tailscale !== undefined) {
      recommendations.push('Tailscale connectivity not available - remote access may be limited');
    }
    
    return recommendations;
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
}

module.exports = NetworkPlugin;