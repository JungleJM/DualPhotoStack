#!/usr/bin/env node
/**
 * Test script to validate network detection functionality
 */

const os = require('os');
const { execSync } = require('child_process');

console.log('🔍 Testing Network Detection\n');

// Test 1: Check available network interfaces
console.log('1️⃣ Network Interfaces:');
const interfaces = os.networkInterfaces();
let localNetworkIP = null;

for (const [name, addresses] of Object.entries(interfaces)) {
  console.log(`  ${name}:`);
  for (const addr of addresses) {
    if (addr.family === 'IPv4') {
      console.log(`    - ${addr.address} (${addr.internal ? 'internal' : 'external'})`);
      
      // Find local network IP (non-internal, non-localhost, non-Tailscale)
      if (!addr.internal && addr.address !== '127.0.0.1' && !addr.address.startsWith('100.')) {
        localNetworkIP = addr.address;
      }
    }
  }
}

console.log(`\n📍 Detected Local Network IP: ${localNetworkIP || 'None found'}\n`);

// Test 2: Check Tailscale
console.log('2️⃣ Tailscale Detection:');
try {
  const tailscaleIP = execSync('tailscale ip --4', { encoding: 'utf8', timeout: 5000 }).trim();
  console.log(`  ✅ Tailscale IP: ${tailscaleIP}`);
} catch (error) {
  console.log('  ❌ Tailscale not detected or not running');
}

// Test 3: User Information
console.log('\n3️⃣ User Information:');
const userInfo = os.userInfo();
console.log(`  Username: ${userInfo.username}`);
console.log(`  UID: ${userInfo.uid}`);
console.log(`  GID: ${userInfo.gid}`);
console.log(`  Home: ${userInfo.homedir}`);

// Test 4: System Information
console.log('\n4️⃣ System Information:');
console.log(`  Platform: ${os.platform()}`);
console.log(`  Architecture: ${os.arch()}`);
console.log(`  Hostname: ${os.hostname()}`);
console.log(`  Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

console.log('\n✅ Network detection test completed!');