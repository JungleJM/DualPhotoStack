/**
 * DPS Remote Logger - Stream logs to GitHub Gist for VM testing
 * Only active in development mode with --remote-logs flag
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

class RemoteLogger {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.gistId = null;
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
    return `dps-${hostname}-${timestamp}`;
  }

  setupRemoteLogging() {
    console.log('🌐 Remote logging enabled for VM testing');
    console.log(`📡 Session ID: ${this.sessionId}`);
    
    // Create initial gist
    this.createGist().then(() => {
      // Start periodic flushing every 10 seconds
      this.flushInterval = setInterval(() => {
        this.flushLogs();
      }, 10000);
      
      console.log(`📋 Logs streaming to: https://gist.github.com/${this.gistId}`);
    }).catch(error => {
      console.error('❌ Failed to setup remote logging:', error.message);
      this.enabled = false;
    });
  }

  async createGist() {
    const initialContent = `# DPS Remote Logs - ${this.sessionId}

Session started: ${new Date().toISOString()}
Platform: ${process.platform} ${process.arch}
Node.js: ${process.version}
Hostname: ${os.hostname()}
User: ${os.userInfo().username}

## Live Log Stream
Logs will appear below in real-time...

---

`;

    const gistData = {
      description: `DPS VM Test Logs - ${this.sessionId}`,
      public: true, // Public gist for anonymous access
      files: {
        [`${this.sessionId}.md`]: {
          content: initialContent
        }
      }
    };

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(gistData);
      
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/gists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': 'DPS-Remote-Logger/1.0',
          'Accept': 'application/vnd.github.v3+json'
          // Note: For auth, we'll use anonymous gists for now
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (res.statusCode === 201) {
              this.gistId = response.id;
              resolve(response);
            } else {
              reject(new Error(`GitHub API error: ${res.statusCode} - ${responseData}`));
            }
          } catch (error) {
            reject(new Error(`JSON parse error: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  log(level, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] **${level}**: ${message}`;
    
    if (data) {
      logEntry += `\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }
    
    logEntry += '\n\n';
    
    this.buffer.push(logEntry);
    
    // Also log locally for immediate feedback
    console.log(`📡 [REMOTE] [${level}] ${message}`, data || '');
  }

  async flushLogs() {
    if (!this.enabled || !this.gistId || this.buffer.length === 0) return;

    try {
      // Get current gist content
      const currentGist = await this.getGist();
      const fileName = `${this.sessionId}.md`;
      const currentContent = currentGist.files[fileName]?.content || '';
      
      // Append new logs
      const newLogs = this.buffer.join('');
      const updatedContent = currentContent + newLogs;
      
      // Update gist
      await this.updateGist(fileName, updatedContent);
      
      // Clear buffer
      this.buffer = [];
      
      console.log(`📡 Remote logs updated (${newLogs.split('\n').length} lines)`);
      
    } catch (error) {
      console.error('⚠️  Failed to flush remote logs:', error.message);
    }
  }

  async getGist() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: `/gists/${this.gistId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'DPS-Remote-Logger/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (res.statusCode === 200) {
              resolve(response);
            } else {
              reject(new Error(`GitHub API error: ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`JSON parse error: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async updateGist(fileName, content) {
    const gistData = {
      files: {
        [fileName]: {
          content: content
        }
      }
    };

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(gistData);
      
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: `/gists/${this.gistId}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': 'DPS-Remote-Logger/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async shutdown() {
    if (!this.enabled) return;

    console.log('🌐 Shutting down remote logger...');
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flushLogs();
    
    // Add session end marker
    this.buffer.push(`\n---\n**Session ended**: ${new Date().toISOString()}\n\n`);
    await this.flushLogs();
    
    console.log(`📡 Final logs sent to: https://gist.github.com/${this.gistId}`);
  }
}

module.exports = RemoteLogger;