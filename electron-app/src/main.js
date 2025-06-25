/**
 * Dual Photo Stack - Electron Main Process
 * Linux-focused deployment tool for coordinated Immich/PhotoPrism setup
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');

// Import DPS components
const DPSTemplateEngine = require('../../scripts/template-engine');
const logger = require('./logger');

// Application state
let mainWindow;
let store;
let templateEngine;

// Initialize application
function createMainWindow() {
  logger.info('Creating main window');
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
  logger.info('Loading main window HTML');
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    logger.info('Main window ready - showing window');
    mainWindow.show();
    
    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      logger.info('Development mode - opening DevTools');
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    logger.info('Main window closed');
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
logger.info('Electron app starting up');

app.whenReady().then(() => {
  logger.info('Electron app ready - initializing components');
  // Initialize persistent storage
  logger.info('Initializing persistent storage');
  store = new Store({
    name: 'dps-config',
    defaults: {
      deploymentMode: 'dps-only',
      libraryPath: '',
      dataStoragePath: '',
      lastConfig: null
    }
  });
  logger.info('Persistent storage initialized');

  // Initialize template engine
  logger.info('Initializing DPS template engine');
  templateEngine = new DPSTemplateEngine();
  logger.info('Template engine initialized successfully');

  // Create main window
  logger.info('Creating main application window');
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
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    logger.info('Quitting application (non-macOS)');
    app.quit();
  }
});

// App quit handlers for crash-safe logging
app.on('before-quit', () => {
  logger.info('Application about to quit - saving logs');
  logger.flush();
});

app.on('will-quit', (event) => {
  logger.info('Application will quit');
  logger.flush();
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
  logger.info('Template initialization requested', { userConfig });
  try {
    const config = await templateEngine.initializeConfig(userConfig);
    logger.info('Template initialization completed successfully');
    return { success: true, data: config };
  } catch (error) {
    logger.error('Template initialization failed', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('template:deploy', async (event, config) => {
  logger.info('Template deployment requested', { config });
  try {
    // Update template engine config
    templateEngine.config = config;
    
    // Deploy services
    logger.info('Starting service deployment');
    const results = await templateEngine.deployAll();
    
    // Get deployment summary
    const summary = templateEngine.getDeploymentSummary();
    
    logger.info('Template deployment completed successfully', { results, summary });
    return { 
      success: true, 
      data: { 
        deploymentResults: results, 
        summary 
      } 
    };
  } catch (error) {
    logger.error('Template deployment failed', error);
    return { success: false, error: error.message };
  }
});

// External URL opening
ipcMain.handle('shell:openExternal', async (event, url) => {
  logger.info('External URL open requested', { url });
  try {
    await shell.openExternal(url);
    logger.info('External URL opened successfully');
    return { success: true };
  } catch (error) {
    logger.error('Failed to open external URL', error);
    return { success: false, error: error.message };
  }
});

// Process management
ipcMain.handle('app:quit', () => {
  logger.info('Application quit requested');
  app.quit();
});

ipcMain.handle('app:minimize', () => {
  logger.info('Window minimize requested');
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Logger integration
ipcMain.handle('logger:getLogFile', () => {
  logger.info('Log file path requested');
  return { success: true, data: logger.getLogFile() };
});

ipcMain.handle('logger:getLogs', () => {
  logger.info('In-memory logs requested');
  return { success: true, data: logger.getLogs() };
});

ipcMain.handle('logger:log', (event, level, message, data) => {
  logger.log(level, message, data);
  return { success: true };
});

// Development helpers
if (process.argv.includes('--dev') && !app.isPackaged) {
  try {
    // Only load electron-reload if available (development environment)
    require('electron-reload')(path.join(__dirname, '..'), {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
    console.log('Development mode: Hot reload enabled');
  } catch (error) {
    // Gracefully handle missing electron-reload in production builds
    console.warn('Could not load electron-reload:', error.message);
  }
}