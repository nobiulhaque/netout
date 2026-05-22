const { app } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const { log } = require('./settings');

let isAdmin = false;
let isToggling = false;
let cachedAdapters = [];
let getMainWindow = () => null;

function checkAdminPrivileges() {
  return new Promise((resolve) => {
    exec('net session', (err) => {
      isAdmin = !err;
      resolve(isAdmin);
    });
  });
}

function getIsAdmin() {
  return isAdmin;
}

function getIsToggling() {
  return isToggling;
}

function setIsToggling(val) {
  isToggling = val;
}

function setMainWindowGetter(fn) {
  getMainWindow = fn;
}

// Execute PowerShell command
function execPowerShell(command) {
  return new Promise((resolve, reject) => {
    let args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command];

    const child = spawn('powershell.exe', args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `PowerShell exited with code ${code}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

// Get physical adapters status
async function getPhysicalAdapters() {
  try {
    const stdout = await execPowerShell(`Get-NetAdapter -Physical | Select-Object Name, Status, AdminStatus, InterfaceDescription | ConvertTo-Json`);
    if (!stdout || !stdout.trim()) {
      return [];
    }
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    cachedAdapters = list;
    return list;
  } catch (err) {
    console.error('Error getting physical adapters:', err);
    return cachedAdapters; // Return cached if command fails (e.g. temporary lock)
  }
}

// Low-level helper to toggle a single adapter (no notifications/timeouts)
async function toggleAdapter(name, targetState) {
  if (typeof name !== 'string' || typeof targetState !== 'boolean') {
    return { success: false, error: 'Invalid parameters: types mismatch' };
  }

  // Validate that name corresponds to a valid physical network adapter to prevent any command/argument injection
  let adaptersList = cachedAdapters;
  if (!adaptersList || adaptersList.length === 0) {
    adaptersList = await getPhysicalAdapters();
  }
  const exists = adaptersList.some(a => a && a.Name === name);
  if (!exists) {
    console.error(`Rejected toggle attempt for non-existent/invalid adapter name: "${name}"`);
    return { success: false, error: 'Access denied: Invalid network adapter name' };
  }

  const escapedName = name.replace(/'/g, "''");
  const cmd = targetState
    ? `Enable-NetAdapter -Name '${escapedName}' -Confirm:$false`
    : `Disable-NetAdapter -Name '${escapedName}' -Confirm:$false`;
  
  try {
    await execPowerShell(cmd);
    return { success: true };
  } catch (err) {
    console.error(`Failed to toggle adapter ${name}:`, err);
    return { success: false, error: err.message };
  }
}

// Toggle all adapters (ethernet and wifi) in a single PowerShell command
async function toggleAllAdapters(targetState) {
  const cmd = targetState
    ? "Get-NetAdapter -Physical | Enable-NetAdapter -Confirm:$false"
    : "Get-NetAdapter -Physical | Disable-NetAdapter -Confirm:$false";
  
  try {
    await execPowerShell(cmd);
    return { success: true };
  } catch (err) {
    console.error('Failed to toggle all adapters:', err);
    return { success: false, error: err.message };
  }
}

// Wrapper to coordinate toggle state, handle propagation delay, and notify renderer
async function runToggleAction(actionFn) {
  if (isToggling) return { success: false, error: 'Another toggle is in progress' };
  
  isToggling = true;
  try {
    const res = await actionFn();
    // Wait for adapter changes to propagate (50ms is sufficient), then query and broadcast new status
    setTimeout(async () => {
      try {
        const adapters = await getPhysicalAdapters();
        const mainWindow = getMainWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('adapters-updated', adapters);
        }
      } catch (err) {
        console.error('Error refreshing adapters after toggle:', err);
      } finally {
        isToggling = false;
      }
    }, 50);
    return res;
  } catch (err) {
    isToggling = false;
    return { success: false, error: err.message };
  }
}

module.exports = {
  checkAdminPrivileges,
  getIsAdmin,
  getIsToggling,
  setIsToggling,
  setMainWindowGetter,
  getPhysicalAdapters,
  toggleAdapter,
  toggleAllAdapters,
  runToggleAction
};
