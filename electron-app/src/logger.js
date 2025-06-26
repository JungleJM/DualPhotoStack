/**
 * DPS Logging System
 * Comprehensive logging with crash-safe file output
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const SimpleRemoteLogger = require('./simple-remote-logger');

class DPSLogger {
  constructor() {
    this.logs = [];
    this.logFile = null;
    this.remoteLogger = null;
    this.initializeLogFile();
    this.setupRemoteLogging();
    this.setupProcessHandlers();
  }

  initializeLogFile() {
    try {
      // Create logs directory in user's config directory
      const logDir = path.join(os.homedir(), '.config', 'dps', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create timestamped log file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(logDir, `dps-${timestamp}.log`);

      // Initialize log file with session header
      const header = [
        `=== DPS Session Started: ${new Date().toISOString()} ===`,
        `Platform: ${process.platform} ${process.arch}`,
        `Node.js: ${process.version}`,
        `Electron: ${process.versions.electron}`,
        `Working Directory: ${process.cwd()}`,
        `User: ${os.userInfo().username}`,
        `Home: ${os.homedir()}`,
        ''.padEnd(60, '='),
        ''
      ].join('\n');

      fs.writeFileSync(this.logFile, header);
      console.log(`📝 DPS Logger initialized: ${this.logFile}`);
      
    } catch (error) {
      console.error('Failed to initialize log file:', error);
      this.logFile = null;
    }
  }

  setupRemoteLogging() {
    // Check for remote logging flags
    const enableRemoteLogging = process.argv.includes('--remote-logs') || 
                               process.argv.includes('--vm-testing') ||
                               process.argv.includes('--remote-debug');
    
    if (enableRemoteLogging) {
      this.remoteLogger = new SimpleRemoteLogger(true);
    }
  }

  setupProcessHandlers() {
    // Crash handlers
    process.on('uncaughtException', (error) => {
      this.error('FATAL: Uncaught Exception', error);
      this.saveAndExit('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.error('FATAL: Unhandled Promise Rejection', { reason, promise });
      this.saveAndExit('unhandledRejection');
    });

    // Graceful shutdown handlers
    process.on('SIGINT', () => {
      this.info('Application interrupted (SIGINT)');
      this.saveAndExit('SIGINT');
    });

    process.on('SIGTERM', () => {
      this.info('Application terminated (SIGTERM)');
      this.saveAndExit('SIGTERM');
    });

    // App quit handler (Electron specific)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', () => {
        this.info('Window closing - saving logs');
        this.flush();
      });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data: data ? this.serializeData(data) : null,
      pid: process.pid
    };

    // Add to memory buffer
    this.logs.push(logEntry);

    // Format for console and file
    const consoleMsg = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    const fileMsg = `[${timestamp}] [${process.pid}] ${level.toUpperCase()}: ${message}${data ? '\n  Data: ' + JSON.stringify(data, null, 2) : ''}`;

    // Console output with colors
    switch (level.toLowerCase()) {
      case 'error':
        console.error(consoleMsg, data || '');
        break;
      case 'warn':
        console.warn(consoleMsg, data || '');
        break;
      case 'info':
        console.info(consoleMsg, data || '');
        break;
      default:
        console.log(consoleMsg, data || '');
    }

    // Write to file immediately for crash safety
    this.writeToFile(fileMsg);

    // Send to remote logger if enabled
    if (this.remoteLogger) {
      this.remoteLogger.log(level.toUpperCase(), message, data);
    }

    // Keep memory buffer manageable
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500); // Keep last 500 entries
    }
  }

  writeToFile(message) {
    if (!this.logFile) return;
    
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  serializeData(data) {
    try {
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack
        };
      }
      return data;
    } catch (error) {
      return { error: 'Failed to serialize data', original: String(data) };
    }
  }

  // Convenience methods
  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  // System event logging
  systemEvent(event, details) {
    this.log('system', `System Event: ${event}`, details);
  }

  // Template engine logging
  templateEvent(action, service, details) {
    this.log('template', `Template ${action}: ${service}`, details);
  }

  // Network detection logging
  networkEvent(action, interfaces) {
    this.log('network', `Network ${action}`, interfaces);
  }

  // Flush logs to file
  flush() {
    if (!this.logFile || this.logs.length === 0) return;

    try {
      const summary = [
        '',
        '=== Session Summary ===',
        `Total log entries: ${this.logs.length}`,
        `Session duration: ${Date.now() - this.startTime}ms`,
        `Log file: ${this.logFile}`,
        ''.padEnd(30, '='),
        ''
      ].join('\n');

      fs.appendFileSync(this.logFile, summary);
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  async saveAndExit(reason) {
    try {
      this.info(`Application exiting: ${reason}`);
      this.flush();
      
      // Shutdown remote logger if enabled
      if (this.remoteLogger) {
        await this.remoteLogger.shutdown();
      }
      
      const exitMessage = [
        '',
        `=== Application Exit: ${reason} ===`,
        `Exit time: ${new Date().toISOString()}`,
        `Total runtime: ${Date.now() - this.startTime}ms`,
        ''.padEnd(40, '='),
        ''
      ].join('\n');

      if (this.logFile) {
        fs.appendFileSync(this.logFile, exitMessage);
        console.log(`📝 Logs saved to: ${this.logFile}`);
      }
    } catch (error) {
      console.error('Failed to save logs on exit:', error);
    }

    // Exit after a short delay to allow log writing
    setTimeout(() => {
      process.exit(reason === 'uncaughtException' ? 1 : 0);
    }, 100);
  }

  // Get current log file path
  getLogFile() {
    return this.logFile;
  }

  // Get in-memory logs
  getLogs() {
    return [...this.logs];
  }
}

// Create singleton instance
const logger = new DPSLogger();
logger.startTime = Date.now();

module.exports = logger;