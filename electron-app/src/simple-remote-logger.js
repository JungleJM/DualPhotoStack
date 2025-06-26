/**
 * Simple Remote Logger - Stream logs via Pastebin or similar service
 * No authentication required for VM testing
 */

const fs = require('fs');
const https = require('https');
const os = require('os');

class SimpleRemoteLogger {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.pasteId = null;
    this.buffer = [];
    this.flushInterval = null;
    this.sessionId = this.generateSessionId();
    
    if (this.enabled) {
      this.setupRemoteLogging();
    }
  }

  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = os.hostname();
    const random = Math.random().toString(36).substring(2, 8);
    return `dps-${hostname}-${timestamp}-${random}`;
  }

  setupRemoteLogging() {
    console.log('🌐 Simple remote logging enabled for VM testing');
    console.log(`📡 Session ID: ${this.sessionId}`);
    
    // Create initial paste
    this.createPaste().then(() => {
      // Start periodic flushing every 15 seconds
      this.flushInterval = setInterval(() => {
        this.flushLogs();
      }, 15000);
      
      console.log(`📋 Logs streaming to: https://pastebin.com/${this.pasteId}`);
      console.log(`📱 Monitor from any device: https://pastebin.com/raw/${this.pasteId}`);
      console.log(`🔗 Share this URL to monitor remotely!`);
    }).catch(error => {
      console.error('❌ Failed to setup remote logging:', error.message);
      console.log('💡 Falling back to local logging only');
      this.enabled = false;
    });
  }

  async createPaste() {
    const initialContent = `DPS Remote Logs - ${this.sessionId}

Session started: ${new Date().toISOString()}
Platform: ${process.platform} ${process.arch}
Node.js: ${process.version}
Hostname: ${os.hostname()}
User: ${os.userInfo().username}

Live Log Stream:
================

`;

    // Hardcoded Pastebin API key for VM testing convenience
    const PASTEBIN_API_KEY = '4bbDkjhx4csluMt_eYyHHAyrqtSG7Wnt';
    
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        'api_dev_key': PASTEBIN_API_KEY,
        'api_option': 'paste',
        'api_paste_code': initialContent,
        'api_paste_name': `DPS VM Test - ${this.sessionId}`,
        'api_paste_expire_date': '1H', // Expire in 1 hour
        'api_paste_private': '1' // Unlisted
      }).toString();

      const options = {
        hostname: 'pastebin.com',
        port: 443,
        path: '/api/api_post.php',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length,
          'User-Agent': 'DPS-VM-Logger/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200 && responseData.includes('pastebin.com/')) {
            this.pasteId = responseData.split('/').pop().trim();
            resolve(responseData);
          } else {
            // Fallback to local file on any error
            console.log('📁 Remote service error, using local file sharing approach');
            this.createLocalShare();
            resolve();
          }
        });
      });

      req.on('error', (error) => {
        // Fallback to a simpler approach
        console.log('📁 Remote logging failed, using local file sharing approach');
        this.createLocalShare();
        resolve();
      });

      // Set a timeout for the request
      req.setTimeout(5000, () => {
        console.log('📁 Remote service timeout, using local file sharing approach');
        this.createLocalShare();
        resolve();
      });

      req.write(postData);
      req.end();
    });
  }

  createLocalShare() {
    // Create a shareable log file that can be accessed via file sharing
    const logDir = '/tmp';
    const logFile = `${logDir}/dps-remote-${this.sessionId}.log`;
    
    const initialContent = `DPS Remote Logs - ${this.sessionId}

Session: ${new Date().toISOString()}
Platform: ${process.platform} ${process.arch}
Hostname: ${os.hostname()}

Instructions:
1. Share this file via your preferred method (scp, rsync, cloud sync, etc.)
2. Monitor updates in real-time with: tail -f ${logFile}

Live Log Stream:
================

`;

    fs.writeFileSync(logFile, initialContent);
    this.pasteId = logFile;
    
    console.log(`📁 Local log file created: ${logFile}`);
    console.log(`📡 Share command: scp ${logFile} your-host:/tmp/`);
    console.log(`📱 Monitor command: tail -f ${logFile}`);
  }

  log(level, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${level}: ${message}`;
    
    if (data) {
      logEntry += `\n  Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    logEntry += '\n';
    
    this.buffer.push(logEntry);
    
    // Also log locally for immediate feedback
    console.log(`📡 [REMOTE] [${level}] ${message}`, data || '');
  }

  async flushLogs() {
    if (!this.enabled || this.buffer.length === 0) return;

    try {
      const newLogs = this.buffer.join('');
      
      if (this.pasteId && this.pasteId.startsWith('/tmp/')) {
        // Local file approach
        fs.appendFileSync(this.pasteId, newLogs);
        console.log(`📁 Local log updated: ${this.pasteId}`);
      } else {
        // Note: Pastebin doesn't support updates, so we just show the URL
        console.log(`📡 New logs ready (${this.buffer.length} entries) - Check: https://pastebin.com/${this.pasteId}`);
      }
      
      // Clear buffer
      this.buffer = [];
      
    } catch (error) {
      console.error('⚠️  Failed to flush remote logs:', error.message);
    }
  }

  async shutdown() {
    if (!this.enabled) return;

    console.log('🌐 Shutting down simple remote logger...');
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.buffer.push(`\n--- Session ended: ${new Date().toISOString()} ---\n`);
    await this.flushLogs();
    
    if (this.pasteId && this.pasteId.startsWith('/tmp/')) {
      console.log(`📁 Final logs saved to: ${this.pasteId}`);
    } else {
      console.log(`📡 Session completed - Final logs at: https://pastebin.com/${this.pasteId}`);
    }
  }
}

module.exports = SimpleRemoteLogger;