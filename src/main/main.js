const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getSettings, loadSettings, saveSettings, log } = require('./settings');
const { 
  checkAdminPrivileges, 
  getIsAdmin, 
  getIsToggling, 
  setMainWindowGetter, 
  getPhysicalAdapters, 
  toggleAdapter, 
  toggleAllAdapters, 
  runToggleAction 
} = require('./powerShell');
const { registerGlobalShortcut, initShortcut } = require('./shortcut');
const { createTray } = require('./tray');

// Command line optimization switches for minimal memory & background execution
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('proxy-server', 'direct://');
app.commandLine.appendSwitch('js-flags', '--max-semi-space-size=1 --max-old-space-size=16');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let pollingInterval = null;

// Initialize the main window getter for PowerShell and shortcuts
setMainWindowGetter(() => mainWindow);

function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(async () => {
    if (getIsToggling()) return;
    const adapters = await getPhysicalAdapters();
    if (mainWindow && mainWindow.webContents && !getIsToggling()) {
      mainWindow.webContents.send('adapters-updated', adapters);
    }
  }, 4000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function createWindow(showImmediately = false) {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 580,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0b10',
    show: false,
    icon: path.join(__dirname, '../renderer/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (showImmediately) {
      mainWindow.show();
    } else {
      const settings = getSettings();
      // If started minimized (e.g. at startup/settings), hide window
      const shouldHide = settings.startMinimized || process.argv.includes('--hidden');
      if (!shouldHide) {
        mainWindow.show();
      }
    }
  });

  mainWindow.on('close', (event) => {
    const settings = getSettings();
    if (!app.isQuitting && settings.minimizeToTray) {
      // Allow the window to be closed/destroyed instead of just hidden.
      // This kills the renderer process and saves 40-50MB RAM.
    } else if (!app.isQuitting && !settings.minimizeToTray) {
      app.isQuitting = true;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopPolling();
  });

  startPolling();
}

function showWindow() {
  if (!mainWindow) {
    createWindow(true);
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(async () => {
  await checkAdminPrivileges();
  loadSettings();

  const isAdmin = getIsAdmin();
  log(`App whenReady. Admin: ${isAdmin}. Args: ${JSON.stringify(process.argv)}`);

  log('Initializing window, tray, and shortcuts...');
  
  const settings = getSettings();
  const shouldHide = settings.startMinimized || process.argv.includes('--hidden');
  
  if (!shouldHide) {
    createWindow(false);
  }
  
  createTray(showWindow);
  initShortcut(() => mainWindow);
});

// Second instance handling
app.on('second-instance', (event, commandLine, workingDirectory) => {
  log(`Second instance event: commandLine=${JSON.stringify(commandLine)}, workingDirectory=${workingDirectory}`);
  showWindow();
});

app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
  stopPolling();
});

app.on('window-all-closed', () => {
  const settings = getSettings();
  if (process.platform !== 'darwin') {
    if (!settings.minimizeToTray || app.isQuitting) {
      app.quit();
    }
  }
});

// IPC communication handlers
ipcMain.handle('check-admin', () => getIsAdmin());
ipcMain.handle('get-adapters', () => getPhysicalAdapters());

ipcMain.handle('toggle-adapter', async (event, payload) => {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload type' };
  }
  const { name, targetState } = payload;
  if (typeof name !== 'string' || typeof targetState !== 'boolean') {
    return { success: false, error: 'Invalid parameters: name must be string, targetState must be boolean' };
  }
  return await runToggleAction(() => toggleAdapter(name, targetState));
});

ipcMain.handle('toggle-all', async (event, payload) => {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload type' };
  }
  const { targetState } = payload;
  if (typeof targetState !== 'boolean') {
    return { success: false, error: 'Invalid parameters: targetState must be boolean' };
  }
  return await runToggleAction(() => toggleAllAdapters(targetState));
});

ipcMain.handle('get-settings', () => getSettings());

ipcMain.handle('save-settings', (event, newSettings) => {
  if (!newSettings || typeof newSettings !== 'object') {
    return getSettings();
  }
  
  // Whitelist and type check configuration keys to prevent prototype pollution or arbitrary injection
  const sanitized = {};
  if (typeof newSettings.shortcut === 'string') {
    sanitized.shortcut = newSettings.shortcut;
  }
  if (typeof newSettings.startMinimized === 'boolean') {
    sanitized.startMinimized = newSettings.startMinimized;
  }
  if (typeof newSettings.runAtStartup === 'boolean') {
    sanitized.runAtStartup = newSettings.runAtStartup;
  }
  if (typeof newSettings.minimizeToTray === 'boolean') {
    sanitized.minimizeToTray = newSettings.minimizeToTray;
  }

  const settings = saveSettings(sanitized);
  // Re-register global shortcuts as they might have changed
  registerGlobalShortcut();
  return settings;
});
// No relaunch handler needed since manifest enforces admin level

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  const settings = getSettings();
  if (settings.minimizeToTray) {
    if (mainWindow) mainWindow.close();
  } else {
    app.isQuitting = true;
    app.quit();
  }
});
