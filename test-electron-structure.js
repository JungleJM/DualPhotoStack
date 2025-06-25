#!/usr/bin/env node
/**
 * Test script to validate Electron app structure
 */

const fs = require('fs');
const path = require('path');

function testElectronApp() {
  console.log('🧪 Testing Electron App Structure\n');

  const electronDir = path.join(__dirname, 'electron-app');
  const requiredFiles = [
    'package.json',
    'src/main.js',
    'src/preload.js',
    'src/index.html',
    'src/styles.css',
    'src/renderer.js'
  ];

  const results = {
    structure: true,
    files: {},
    packageJson: null,
    mainIntegration: false
  };

  // Test 1: Check file structure
  console.log('1️⃣ Checking file structure...');
  
  requiredFiles.forEach(file => {
    const filePath = path.join(electronDir, file);
    const exists = fs.existsSync(filePath);
    results.files[file] = exists;
    
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    
    if (!exists) {
      results.structure = false;
    }
  });

  // Test 2: Validate package.json
  console.log('\\n2️⃣ Validating package.json...');
  
  try {
    const packagePath = path.join(electronDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      results.packageJson = packageJson;
      
      console.log(`  ✅ Name: ${packageJson.name}`);
      console.log(`  ✅ Main: ${packageJson.main}`);
      console.log(`  ✅ Scripts: ${Object.keys(packageJson.scripts).join(', ')}`);
      console.log(`  ✅ Electron version: ${packageJson.devDependencies?.electron || 'Not specified'}`);
      
      // Check if main file matches
      if (packageJson.main === 'src/main.js') {
        console.log('  ✅ Main file path correct');
      } else {
        console.log('  ❌ Main file path incorrect');
      }
    }
  } catch (error) {
    console.log(`  ❌ Package.json invalid: ${error.message}`);
    results.structure = false;
  }

  // Test 3: Check template engine integration
  console.log('\\n3️⃣ Checking template engine integration...');
  
  try {
    const mainJsPath = path.join(electronDir, 'src/main.js');
    if (fs.existsSync(mainJsPath)) {
      const mainContent = fs.readFileSync(mainJsPath, 'utf8');
      
      if (mainContent.includes('DPSTemplateEngine')) {
        console.log('  ✅ Template engine imported');
        results.mainIntegration = true;
      } else {
        console.log('  ❌ Template engine not imported');
      }
      
      if (mainContent.includes('ipcMain.handle')) {
        console.log('  ✅ IPC handlers defined');
      } else {
        console.log('  ❌ IPC handlers missing');
      }
    }
  } catch (error) {
    console.log(`  ❌ Main.js check failed: ${error.message}`);
  }

  // Test 4: Check CSS and HTML structure
  console.log('\\n4️⃣ Checking UI structure...');
  
  try {
    const htmlPath = path.join(electronDir, 'src/index.html');
    const cssPath = path.join(electronDir, 'src/styles.css');
    
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      if (htmlContent.includes('welcome-screen')) {
        console.log('  ✅ Welcome screen defined');
      }
      
      if (htmlContent.includes('deployment-screen')) {
        console.log('  ✅ Deployment screen defined');
      }
      
      if (htmlContent.includes('renderer.js')) {
        console.log('  ✅ Renderer script linked');
      }
    }
    
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      const cssSize = fs.statSync(cssPath).size;
      console.log(`  ✅ CSS file exists (${cssSize} bytes)`);
    }
  } catch (error) {
    console.log(`  ❌ UI structure check failed: ${error.message}`);
  }

  // Summary
  console.log('\\n📊 Test Summary:');
  console.log(`  File structure: ${results.structure ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`  Package config: ${results.packageJson ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`  Template integration: ${results.mainIntegration ? '✅ Valid' : '❌ Missing'}`);
  
  const fileCount = Object.values(results.files).filter(Boolean).length;
  console.log(`  Files present: ${fileCount}/${requiredFiles.length}`);

  if (results.structure && results.packageJson && results.mainIntegration) {
    console.log('\\n🎉 Electron app structure is valid!');
    console.log('\\nNext steps:');
    console.log('1. Run: cd electron-app && npm install');
    console.log('2. Test: npm run dev');
    console.log('3. Build: npm run build');
  } else {
    console.log('\\n⚠️  Electron app has structural issues that need fixing.');
  }
}

// Run test
testElectronApp();