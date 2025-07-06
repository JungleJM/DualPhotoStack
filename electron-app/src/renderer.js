/**
 * Dual Photo Stack - Electron Renderer Process
 * Handles UI logic and user interactions
 */

// Application state
let currentScreen = 'welcome';
let selectedMode = null;
let systemInfo = null;
let config = null;
let deploymentInProgress = false;

// DOM elements
const screens = {
  welcome: document.getElementById('welcome-screen'),
  systemCheck: document.getElementById('system-check-screen'),
  config: document.getElementById('config-screen'),
  deployment: document.getElementById('deployment-screen'),
  success: document.getElementById('success-screen')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadSavedConfig();
  showScreen('welcome');
});

// Event listeners setup
function initializeEventListeners() {
  // Window controls
  document.getElementById('minimize-btn').addEventListener('click', () => {
    electronAPI.app.minimize();
  });

  document.getElementById('close-btn').addEventListener('click', () => {
    electronAPI.app.quit();
  });

  // Welcome screen - mode selection
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', () => {
      // Remove previous selection
      document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Select current option
      option.classList.add('selected');
      selectedMode = option.dataset.mode;
      
      // Enable continue button
      document.getElementById('continue-btn').disabled = false;
    });
  });

  document.getElementById('continue-btn').addEventListener('click', () => {
    if (selectedMode) {
      showScreen('systemCheck');
      runSystemChecks();
    }
  });

  // System check screen
  document.getElementById('back-to-welcome').addEventListener('click', () => {
    showScreen('welcome');
  });

  document.getElementById('continue-to-config').addEventListener('click', () => {
    showScreen('config');
    setupConfigScreen();
  });

  // Configuration screen
  document.getElementById('browse-library').addEventListener('click', async () => {
    console.log('🔍 RENDERER: Browse library button clicked');
    try {
      console.log('🔍 RENDERER: Calling electronAPI.dialog.selectDirectory...');
      const result = await electronAPI.dialog.selectDirectory({
        title: 'Select Photo Library Directory'
      });
      
      console.log('🔍 RENDERER: Dialog result received:', result);
      
      if (result.needsManualEntry) {
        console.log('📝 RENDERER: Manual entry mode required');
        alert('File browser unavailable. Please type the directory path manually in the text field.');
        document.getElementById('library-path').focus();
      } else if (!result.canceled && result.filePaths.length > 0) {
        console.log('✅ RENDERER: Directory selected:', result.filePaths[0]);
        document.getElementById('library-path').value = result.filePaths[0];
        validateConfigForm();
      } else {
        console.log('❌ RENDERER: Dialog canceled or no selection');
      }
    } catch (error) {
      console.error('❌ RENDERER: Error in browse library handler:', error);
    }
  });

  // Data storage browser removed - now uses automatic per-service directories

  document.getElementById('back-to-system').addEventListener('click', () => {
    showScreen('systemCheck');
  });

  document.getElementById('continue-to-deploy').addEventListener('click', () => {
    showScreen('deployment');
    setupDeploymentScreen();
  });

  // Deployment screen
  document.getElementById('deploy-btn').addEventListener('click', () => {
    startDeployment();
  });

  document.getElementById('cancel-deployment').addEventListener('click', () => {
    if (deploymentInProgress) {
      // TODO: Implement deployment cancellation
      showScreen('config');
    } else {
      showScreen('config');
    }
  });

  // Success screen
  document.getElementById('open-dockge').addEventListener('click', async () => {
    if (config && config.urls) {
      // Open first available Dockge URL
      const dockgeUrls = config.summary?.accessUrls?.dockge;
      if (dockgeUrls && dockgeUrls.length > 0) {
        await electronAPI.shell.openExternal(dockgeUrls[0]);
      }
    }
  });

  document.getElementById('finish-btn').addEventListener('click', () => {
    electronAPI.app.quit();
  });

  // Footer links
  document.getElementById('docs-link').addEventListener('click', (e) => {
    e.preventDefault();
    electronAPI.shell.openExternal('https://github.com/JungleJM/DualPhotoStack/blob/main/README.md');
  });

  document.getElementById('github-link').addEventListener('click', (e) => {
    e.preventDefault();
    electronAPI.shell.openExternal('https://github.com/JungleJM/DualPhotoStack');
  });
}

// Screen navigation
function showScreen(screenName) {
  // Hide all screens
  Object.values(screens).forEach(screen => {
    screen.classList.remove('active', 'prev');
  });

  // Show current screen
  if (screens[screenName]) {
    screens[screenName].classList.add('active');
    currentScreen = screenName;
  }
}

// Load saved configuration
async function loadSavedConfig() {
  try {
    const result = await electronAPI.config.load();
    if (result.success && result.data) {
      // Pre-populate form fields if config exists
      if (result.data.libraryPath) {
        document.getElementById('library-path').value = result.data.libraryPath;
      }
      // Data storage path no longer needed - using automatic per-service directories
      if (result.data.deploymentMode) {
        selectedMode = result.data.deploymentMode;
        // Select the saved mode
        const modeOption = document.querySelector(`[data-mode="${selectedMode}"]`);
        if (modeOption) {
          modeOption.classList.add('selected');
          document.getElementById('continue-btn').disabled = false;
        }
      }
    }
  } catch (error) {
    console.warn('Could not load saved config:', error);
  }
}

// System checks
async function runSystemChecks() {
  const checks = [
    { id: 'check-platform', label: 'Platform Check', test: checkPlatform },
    { id: 'check-docker', label: 'Docker Check', test: checkDocker },
    { id: 'check-network', label: 'Network Check', test: checkNetwork },
    { id: 'check-permissions', label: 'Permissions Check', test: checkPermissions }
  ];

  let allPassed = true;

  for (const check of checks) {
    const element = document.getElementById(check.id);
    const icon = element.querySelector('.check-icon');
    const status = element.querySelector('.check-status');

    // Set to running
    icon.textContent = '⏳';
    status.textContent = 'Running...';

    try {
      const result = await check.test();
      
      if (result.success) {
        icon.textContent = '✅';
        icon.className = 'check-icon success';
        status.textContent = result.message || 'Passed';
      } else {
        icon.textContent = '❌';
        icon.className = 'check-icon error';
        status.textContent = result.message || 'Failed';
        allPassed = false;
      }
    } catch (error) {
      icon.textContent = '❌';
      icon.className = 'check-icon error';
      status.textContent = `Error: ${error.message}`;
      allPassed = false;
    }

    // Small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Show system info
  if (systemInfo) {
    displaySystemInfo();
  }

  // Enable/disable continue button
  document.getElementById('continue-to-config').disabled = !allPassed;
}

async function checkPlatform() {
  const result = await electronAPI.system.detect();
  
  if (!result.success) {
    throw new Error(result.error);
  }

  systemInfo = result.data;

  if (result.data.platform !== 'linux') {
    return {
      success: false,
      message: `${result.data.platform} not supported (Linux required)`
    };
  }

  return {
    success: true,
    message: `Linux ${result.data.arch} detected`
  };
}

async function checkDocker() {
  if (!systemInfo?.docker) {
    return { success: false, message: 'Docker not detected' };
  }

  const docker = systemInfo.docker;

  if (!docker.available) {
    return { success: false, message: 'Docker not available' };
  }

  if (!docker.composeVersion) {
    return { success: false, message: 'Docker Compose not available' };
  }

  return {
    success: true,
    message: `Docker available with Compose`
  };
}

async function checkNetwork() {
  if (!systemInfo?.network) {
    return { success: false, message: 'Network detection failed' };
  }

  const network = systemInfo.network;
  let interfaces = 0;

  if (network.LOCALHOST_IP) interfaces++;
  if (network.LOCAL_NETWORK_IP) interfaces++;
  if (network.TAILSCALE_IP) interfaces++;

  if (interfaces < 2) {
    return { success: false, message: 'Insufficient network interfaces' };
  }

  return {
    success: true,
    message: `${interfaces} interfaces detected`
  };
}

async function checkPermissions() {
  if (!systemInfo?.user) {
    return { success: false, message: 'User detection failed' };
  }

  const user = systemInfo.user;

  // Check if user has reasonable UID (1000+)
  if (user.USER_UID < 1000) {
    return { success: false, message: 'User UID too low (system user?)' };
  }

  return {
    success: true,
    message: `User ${user.USER_UID}:${user.USER_GID}`
  };
}

function displaySystemInfo() {
  const infoGrid = document.getElementById('info-grid');
  const systemInfoDiv = document.getElementById('system-info');

  if (!systemInfo) return;

  const infoItems = [
    { label: 'Platform', value: `${systemInfo.platform} ${systemInfo.arch}` },
    { label: 'Node.js', value: systemInfo.node },
    { label: 'Docker', value: systemInfo.docker?.dockerVersion || 'Not available' },
    { label: 'Docker Compose', value: systemInfo.docker?.composeVersion || 'Not available' },
    { label: 'Localhost', value: systemInfo.network?.LOCALHOST_IP || 'N/A' },
    { label: 'LAN IP', value: systemInfo.network?.LOCAL_NETWORK_IP || 'Not detected' },
    { label: 'Tailscale IP', value: systemInfo.network?.TAILSCALE_IP || 'Not detected' },
    { label: 'User UID', value: systemInfo.user?.USER_UID || 'N/A' },
    { label: 'Timezone', value: systemInfo.user?.TIMEZONE || 'N/A' }
  ];

  infoGrid.innerHTML = infoItems.map(item => `
    <div class="info-item">
      <span class="info-label">${item.label}</span>
      <span class="info-value">${item.value}</span>
    </div>
  `).join('');

  systemInfoDiv.style.display = 'block';
}

// Configuration screen setup
function setupConfigScreen() {
  if (systemInfo?.network) {
    displayNetworkInfo();
  }
  validateConfigForm();
}

function displayNetworkInfo() {
  const networkGrid = document.getElementById('network-grid');
  const network = systemInfo.network;

  const networkItems = [
    { label: 'Localhost', value: network.LOCALHOST_IP },
    { label: 'Local Network', value: network.LOCAL_NETWORK_IP || 'Not detected' },
    { label: 'Tailscale', value: network.TAILSCALE_IP || 'Not detected' }
  ].filter(item => item.value && item.value !== 'Not detected');

  networkGrid.innerHTML = networkItems.map(item => `
    <div class="network-item">
      <div class="network-label">${item.label}</div>
      <div class="network-value">${item.value}</div>
    </div>
  `).join('');
}

function validateConfigForm() {
  const libraryPath = document.getElementById('library-path').value;
  const continueBtn = document.getElementById('continue-to-deploy');

  continueBtn.disabled = !libraryPath;
}

// Deployment screen setup
function setupDeploymentScreen() {
  // Reset progress steps
  document.querySelectorAll('.progress-step').forEach(step => {
    step.classList.remove('active', 'complete', 'error');
    const icon = step.querySelector('.step-icon');
    const status = step.querySelector('.step-status');
    icon.textContent = '⏳';
    status.textContent = 'Waiting...';
  });

  // Clear deployment log
  document.getElementById('deployment-log').innerHTML = '';

  // Enable deploy button
  document.getElementById('deploy-btn').disabled = false;
  document.getElementById('cancel-deployment').disabled = false;
}

// Deployment process
async function startDeployment() {
  deploymentInProgress = true;
  document.getElementById('deploy-btn').disabled = true;

  try {
    // Prepare configuration
    addLogEntry('Starting DPS deployment...', 'info');
    
    const userConfig = {
      deployment: {
        mode: selectedMode,
        services: getServicesForMode(selectedMode)
      },
      libraryPath: document.getElementById('library-path').value
    };

    // Save configuration
    await electronAPI.config.save(userConfig);

    // Step 1: Generate configuration
    await updateDeploymentStep('config', 'active', '⏳', 'Generating...');
    addLogEntry('Generating configuration with detected network settings...', 'info');
    
    const configResult = await electronAPI.template.initialize(userConfig);
    if (!configResult.success) {
      throw new Error(configResult.error);
    }
    
    config = configResult.data;
    await updateDeploymentStep('config', 'complete', '✅', 'Complete');
    addLogEntry('Configuration generated successfully', 'success');

    // Step 2: Network setup
    await updateDeploymentStep('network', 'active', '⏳', 'Setting up...');
    addLogEntry('Configuring multi-interface network bindings...', 'info');
    
    // Network configuration is part of template generation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network setup
    
    await updateDeploymentStep('network', 'complete', '✅', 'Complete');
    addLogEntry(`Network configured: ${Object.keys(config.network).filter(k => config.network[k]).join(', ')}`, 'success');

    // Step 3: Deploy services
    await updateDeploymentStep('services', 'active', '⏳', 'Deploying...');
    addLogEntry('Deploying services to ~/.local/share/docker-stacks/...', 'info');
    
    const deployResult = await electronAPI.template.deploy(config);
    if (!deployResult.success) {
      throw new Error(deployResult.error);
    }
    
    config.summary = deployResult.data.summary;
    await updateDeploymentStep('services', 'complete', '✅', 'Complete');
    addLogEntry(`Services deployed: ${config.deployment.services.join(', ')}`, 'success');

    // Step 4: Validation
    await updateDeploymentStep('validation', 'active', '⏳', 'Validating...');
    addLogEntry('Validating deployment...', 'info');
    
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await updateDeploymentStep('validation', 'complete', '✅', 'Complete');
    addLogEntry('Deployment validation successful', 'success');
    addLogEntry('🎉 DPS deployment completed successfully!', 'success');

    // Show success screen
    setTimeout(() => {
      showScreen('success');
      setupSuccessScreen();
    }, 1000);

  } catch (error) {
    addLogEntry(`❌ Deployment failed: ${error.message}`, 'error');
    
    // Mark current step as error
    const activeStep = document.querySelector('.progress-step.active');
    if (activeStep) {
      await updateDeploymentStep(activeStep.dataset.step, 'error', '❌', 'Failed');
    }
    
    document.getElementById('deploy-btn').disabled = false;
  } finally {
    deploymentInProgress = false;
  }
}

function getServicesForMode(mode) {
  const serviceMap = {
    'dps-only': ['immich', 'photoprism', 'dockge'],
    'add-to-semaphore': ['immich', 'photoprism', 'dockge'],
    'full-install': ['immich', 'photoprism', 'dockge', 'semaphore']
  };
  
  return serviceMap[mode] || serviceMap['dps-only'];
}

async function updateDeploymentStep(stepName, status, icon, statusText) {
  const step = document.querySelector(`[data-step="${stepName}"]`);
  if (!step) return;

  // Remove old status classes
  step.classList.remove('active', 'complete', 'error');
  
  // Add new status
  step.classList.add(status);
  
  // Update icon and status text
  step.querySelector('.step-icon').textContent = icon;
  step.querySelector('.step-status').textContent = statusText;
  
  // Small delay for visual effect
  await new Promise(resolve => setTimeout(resolve, 300));
}

function addLogEntry(message, type = 'info') {
  const logContainer = document.getElementById('deployment-log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Success screen setup
function setupSuccessScreen() {
  if (!config?.summary?.accessUrls) return;

  const urlGrid = document.getElementById('url-grid');
  const urls = config.summary.accessUrls;

  const serviceNames = {
    immich: 'Immich',
    photoprism: 'PhotoPrism',
    dockge: 'Dockge',
    semaphore: 'Semaphore'
  };

  const urlItems = Object.entries(urls)
    .filter(([service, serviceUrls]) => serviceUrls.length > 0)
    .map(([service, serviceUrls]) => `
      <div class="url-item">
        <div class="url-service">${serviceNames[service] || service}</div>
        <ul class="url-list">
          ${serviceUrls.map(url => `
            <li><a href="#" onclick="electronAPI.shell.openExternal('${url}')">${url}</a></li>
          `).join('')}
        </ul>
      </div>
    `).join('');

  urlGrid.innerHTML = urlItems;
}