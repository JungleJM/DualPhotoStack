/**
 * Dual Photo Stack - Electron Preload Script
 * Secure communication bridge between main and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System detection and validation
  system: {
    detect: () => ipcRenderer.invoke('system:detect'),
  },

  // File and directory operations
  dialog: {
    selectDirectory: (options) => ipcRenderer.invoke('dialog:selectDirectory', options),
  },

  // Configuration management
  config: {
    save: (config) => ipcRenderer.invoke('config:save', config),
    load: () => ipcRenderer.invoke('config:load'),
  },

  // Template engine operations
  template: {
    initialize: (userConfig) => ipcRenderer.invoke('template:initialize', userConfig),
    deploy: (config) => ipcRenderer.invoke('template:deploy', config),
  },

  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Application controls
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
  },

  // Event listeners for renderer process
  on: (channel, callback) => {
    const validChannels = [
      'deployment-progress',
      'deployment-complete',
      'deployment-error'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // Remove event listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Development helpers
if (process.argv && process.argv.includes('--dev')) {
  contextBridge.exposeInMainWorld('devAPI', {
    reload: () => location.reload(),
    toggleDevTools: () => ipcRenderer.invoke('dev:toggleDevTools')
  });
}