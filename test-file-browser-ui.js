#!/usr/bin/env node
/**
 * Automated File Browser UI Test with Button Clicks
 * This script will actually click the browse buttons to test the crash
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🤖 Starting automated file browser UI test...');

// Start the electron app with remote debugging
const electronApp = spawn('npm', ['start', '--', '--verbose-startup', '--remote-debugging-port=9222'], {
    cwd: path.join(__dirname, 'electron-app'),
    stdio: ['pipe', 'pipe', 'pipe']
});

let appOutput = '';
let appError = '';
let testStarted = false;

electronApp.stdout.on('data', (data) => {
    const output = data.toString();
    appOutput += output;
    console.log('APP:', output.trim());
    
    // Check if app is ready and start UI automation
    if (output.includes('DPS IS READY FOR USE') && !testStarted) {
        testStarted = true;
        console.log('✅ App is ready - starting UI automation...');
        setTimeout(() => {
            automateUI();
        }, 3000); // Give time for UI to fully load
    }
});

electronApp.stderr.on('data', (data) => {
    const error = data.toString();
    appError += error;
    console.error('ERR:', error.trim());
    
    // Check for crash indicators
    if (error.includes('Segmentation fault') || error.includes('Aborted') || error.includes('FATAL')) {
        console.log('💥 CRASH DETECTED!');
        analyzeCrash();
    }
});

electronApp.on('close', (code) => {
    console.log(`\\n📊 App closed with code: ${code}`);
    if (code !== 0) {
        console.log('💥 App crashed or exited unexpectedly!');
    }
    
    // Save outputs for analysis
    fs.writeFileSync('/tmp/file-browser-ui-test-output.log', appOutput);
    fs.writeFileSync('/tmp/file-browser-ui-test-error.log', appError);
    console.log('📁 Logs saved to /tmp/file-browser-ui-test-*.log');
    
    analyzeCrash();
});

async function automateUI() {
    console.log('🎮 Starting UI automation...');
    
    try {
        // Use Chrome DevTools Protocol to interact with the UI
        const puppeteer = require('puppeteer-core');
        
        const browser = await puppeteer.connect({ 
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
        
        const pages = await browser.pages();
        const page = pages[0]; // Get the main Electron window
        
        console.log('📱 Connected to Electron window');
        
        // Wait for the UI to be ready
        await page.waitForSelector('#continue-btn', { timeout: 10000 });
        console.log('🔍 Found continue button - clicking...');
        
        // Click continue to get to config screen
        await page.click('#continue-btn');
        await page.waitForTimeout(2000);
        
        // Wait for config screen and browse button
        await page.waitForSelector('#browse-library', { timeout: 10000 });
        console.log('🔍 Found browse library button - about to click...');
        
        // This is where the crash should happen
        console.log('💣 Triggering file browser dialog...');
        await page.click('#browse-library');
        
        // Wait a bit to see if crash happens
        console.log('⏰ Waiting for potential crash...');
        await page.waitForTimeout(5000);
        
        console.log('✅ File browser dialog survived! Testing data path...');
        
        // Try the second browse button
        await page.click('#browse-data');
        await page.waitForTimeout(3000);
        
        console.log('🎉 Both file browser dialogs work! No crash detected.');
        
        await browser.disconnect();
        
    } catch (error) {
        console.error('❌ UI automation failed:', error.message);
        
        if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
            console.log('💥 App crashed during file browser test!');
        }
    }
    
    // Kill the app after test
    setTimeout(() => {
        console.log('⏰ Test completed - killing app');
        electronApp.kill('SIGTERM');
    }, 2000);
}

function analyzeCrash() {
    console.log('\\n🔍 CRASH ANALYSIS:');
    
    // Check DPS logs for crash details
    const logsDir = '/var/home/j/.config/dps/logs/';
    try {
        const logFiles = fs.readdirSync(logsDir)
            .filter(f => f.includes('2025-06-26'))
            .sort()
            .slice(-1); // Get latest log
        
        if (logFiles.length > 0) {
            const latestLog = fs.readFileSync(path.join(logsDir, logFiles[0]), 'utf8');
            console.log('📋 Latest DPS log contents:');
            console.log(latestLog);
        }
    } catch (err) {
        console.log('⚠️  Could not read DPS logs:', err.message);
    }
}

// Handle script termination
process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted - killing app');
    electronApp.kill('SIGTERM');
    process.exit(0);
});

console.log('🎯 UI automation test started - app should launch shortly...');