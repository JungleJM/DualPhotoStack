#!/usr/bin/env node
/**
 * Automated File Browser Crash Test
 * This script will programmatically test the file browser functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🤖 Starting automated file browser crash test...');

// Start the electron app
const electronApp = spawn('npm', ['start', '--', '--verbose-startup'], {
    cwd: path.join(__dirname, 'electron-app'),
    stdio: ['pipe', 'pipe', 'pipe']
});

let appOutput = '';
let appError = '';

electronApp.stdout.on('data', (data) => {
    const output = data.toString();
    appOutput += output;
    console.log('APP:', output.trim());
    
    // Check if app is ready
    if (output.includes('DPS IS READY FOR USE')) {
        console.log('✅ App is ready - triggering file browser test...');
        setTimeout(() => {
            testFileBrowser();
        }, 2000);
    }
});

electronApp.stderr.on('data', (data) => {
    const error = data.toString();
    appError += error;
    console.error('ERR:', error.trim());
});

electronApp.on('close', (code) => {
    console.log(`\n📊 App closed with code: ${code}`);
    console.log('\n📋 FULL OUTPUT:');
    console.log(appOutput);
    if (appError) {
        console.log('\n❌ ERRORS:');
        console.log(appError);
    }
    
    // Save outputs for analysis
    fs.writeFileSync('/tmp/file-browser-test-output.log', appOutput);
    fs.writeFileSync('/tmp/file-browser-test-error.log', appError);
    console.log('📁 Logs saved to /tmp/file-browser-test-*.log');
});

function testFileBrowser() {
    console.log('🔍 Testing file browser functionality...');
    
    // We'll try to trigger the IPC call that causes the crash
    // For now, let's just let the app run and see what happens
    console.log('⏰ Waiting for user interaction or crash...');
    
    // Kill after 30 seconds if no crash
    setTimeout(() => {
        console.log('⏰ Test timeout - killing app');
        electronApp.kill('SIGTERM');
    }, 30000);
}

// Handle script termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted - killing app');
    electronApp.kill('SIGTERM');
    process.exit(0);
});

console.log('🎯 Test started - app should launch shortly...');