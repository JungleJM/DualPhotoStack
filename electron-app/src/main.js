/**
 * Dual Photo Stack - Electron Main Process
 * Linux-focused deployment tool for coordinated Immich/PhotoPrism setup
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');

// Import DPS template engine
const DPSTemplateEngine = require('../../scripts/template-engine');

// Application state
let mainWindow;
let store;
let templateEngine;

// Initialize application
function createMainWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'Dual Photo Stack Setup',
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  // Initialize persistent storage
  store = new Store({
    name: 'dps-config',
    defaults: {
      deploymentMode: 'dps-only',
      libraryPath: '',
      dataStoragePath: '',
      lastConfig: null
    }
  });

  // Initialize template engine
  templateEngine = new DPSTemplateEngine();

  // Create main window
  createMainWindow();

  // macOS - create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});

// ============================================================================
// IPC Handlers - Communication between main and renderer processes
// ============================================================================

// System detection and validation
ipcMain.handle('system:detect', async () => {
  try {
    const detection = {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      docker: await checkDocker(),
      network: await templateEngine.detectNetworkInterfaces(),
      user: templateEngine.getUserInfo(),
      tailscale: templateEngine.getTailscaleIP()
    };
    
    return { success: true, data: detection };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Docker detection
async function checkDocker() {
  return new Promise((resolve) => {
    const dockerCheck = spawn('docker', ['--version']);
    const composeCheck = spawn('docker', ['compose', 'version']);
    
    let dockerVersion = null;
    let composeVersion = null;
    
    dockerCheck.stdout.on('data', (data) => {
      dockerVersion = data.toString().trim();
    });
    
    composeCheck.stdout.on('data', (data) => {
      composeVersion = data.toString().trim();
    });
    
    Promise.allSettled([
      new Promise(res => dockerCheck.on('close', res)),
      new Promise(res => composeCheck.on('close', res))
    ]).then(() => {
      resolve({
        available: !!dockerVersion,
        dockerVersion,
        composeVersion: composeVersion || null,
        dockerDesktop: fs.existsSync('/Applications/Docker.app') // macOS check
      });
    });
  });
}

// File/directory selection
ipcMain.handle('dialog:selectDirectory', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: options.title || 'Select Directory',
    defaultPath: options.defaultPath || process.env.HOME,
    buttonLabel: options.buttonLabel || 'Select'
  });
  
  return result;
});

// Configuration management
ipcMain.handle('config:save', async (event, config) => {
  try {
    store.set('lastConfig', config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:load', async () => {
  try {
    const config = store.get('lastConfig');
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Template engine integration
ipcMain.handle('template:initialize', async (event, userConfig) => {
  try {
    const config = await templateEngine.initializeConfig(userConfig);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('template:deploy', async (event, config) => {
  try {
    // Update template engine config
    templateEngine.config = config;
    
    // Deploy services
    const results = await templateEngine.deployAll();
    
    // Get deployment summary
    const summary = templateEngine.getDeploymentSummary();
    
    return { 
      success: true, 
      data: { 
        deploymentResults: results, 
        summary 
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// External URL opening
ipcMain.handle('shell:openExternal', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Process management
ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('app:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Development helpers
if (process.argv.includes('--dev')) {
  // Auto-reload in development
  require('electron-reload')(path.join(__dirname, '..'), {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}