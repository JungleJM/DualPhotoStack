/**
 * System Plugin for Universal GUI Framework
 * Handles system detection and validation for DPS
 */

const os = require('os');
const { spawn } = require('child_process');

class SystemPlugin {
  constructor(config) {
    this.config = config;
  }

  /**
   * Check platform compatibility
   */
  async checkPlatform(params) {
    try {
      const platform = process.platform;
      const arch = process.arch;
      const nodeVersion = process.version;
      
      if (!this.config['supported-platforms'].includes(platform)) {
        return {
          success: false,
          message: `Platform ${platform} not supported (Linux required)`,
          data: { platform, arch, nodeVersion }
        };
      }

      return {
        success: true,
        message: `Platform compatible: ${platform} ${arch}`,
        data: {
          platform,
          arch,
          nodeVersion,
          hostname: os.hostname(),
          release: os.release()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Platform check failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Check user permissions and environment
   */
  async checkPermissions(params) {
    try {
      const userInfo = os.userInfo();
      
      // Check if user has reasonable UID (1000+)
      if (userInfo.uid < 1000) {
        return {
          success: false,
          message: 'User UID too low (system user?) - may cause permission issues',
          data: userInfo
        };
      }

      // Check if user can write to common directories
      const testPaths = [
        os.homedir(),
        '/tmp'
      ];

      const accessResults = {};
      for (const testPath of testPaths) {
        try {
          const testFile = `${testPath}/.dps-write-test`;
          require('fs').writeFileSync(testFile, 'test');
          require('fs').unlinkSync(testFile);
          accessResults[testPath] = true;
        } catch (error) {
          accessResults[testPath] = false;
        }
      }

      const canWrite = Object.values(accessResults).every(result => result);
      
      return {
        success: canWrite,
        message: canWrite 
          ? `User permissions OK: ${userInfo.username} (${userInfo.uid}:${userInfo.gid})`
          : 'Permission issues detected - may not be able to write files',
        data: {
          userInfo,
          writeAccess: accessResults
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Permission check failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get detailed user information
   */
  async getUserInfo(params) {
    try {
      const userInfo = os.userInfo();
      const envInfo = {
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL,
        TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      return {
        success: true,
        data: {
          user: userInfo,
          environment: envInfo,
          system: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            totalmem: os.totalmem(),
            freemem: os.freemem()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get user info: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Check if required commands are available
   */
  async checkRequiredCommands(params) {
    try {
      const commands = this.config['required-commands'] || [];
      const results = {};

      for (const command of commands) {
        try {
          await this.executeCommand(command, ['--version']);
          results[command] = { available: true };
        } catch (error) {
          results[command] = { 
            available: false, 
            error: error.message 
          };
        }
      }

      const allAvailable = Object.values(results).every(r => r.available);

      return {
        success: allAvailable,
        message: allAvailable 
          ? 'All required commands available'
          : 'Some required commands missing',
        data: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Command check failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Helper: Execute command and return promise
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

module.exports = SystemPlugin;