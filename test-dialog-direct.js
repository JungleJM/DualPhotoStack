#!/usr/bin/env node
/**
 * Direct Dialog Test - Test file dialog by simulating renderer calls
 */

const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🤖 Starting direct dialog test...');

app.whenReady().then(async () => {
    console.log('⚡ Electron ready - testing file dialog directly...');
    
    // Create a mock window
    const testWindow = new BrowserWindow({
        width: 400,
        height: 300,
        show: false
    });
    
    try {
        console.log('🔍 Testing showOpenDialog...');
        
        const result = await dialog.showOpenDialog(testWindow, {
            properties: ['openDirectory'],
            title: 'Test Directory Selection',
            defaultPath: process.env.HOME,
            buttonLabel: 'Select Test'
        });
        
        console.log('✅ Dialog result:', result);
        console.log('🎉 File dialog works correctly!');
        
    } catch (error) {
        console.error('❌ Dialog failed:', error);
        console.error('💥 This is the source of the crash!');
    }
    
    app.quit();
});

console.log('🎯 Direct dialog test started...');