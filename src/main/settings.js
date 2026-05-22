const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const settingsDir = app.getPath('userData');
const settingsPath = path.join(settingsDir, 'settings.json');
const logPath = path.join(settingsDir, 'app.log');

let settings = {
  shortcut: 'Ctrl+Alt+I',
  startMinimized: false,
  runAtStartup: false,
  minimizeToTray: true
};

function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    console.log(`[${timestamp}] ${msg}`);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

function loadSettings() {
  try {
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      settings = { ...settings, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
  return settings;
}

function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    // Update startup settings
    app.setLoginItemSettings({
      openAtLogin: settings.runAtStartup,
      path: process.execPath,
      args: ['--hidden']
    });
  } catch (err) {
    console.error('Error saving settings:', err);
  }
  return settings;
}

module.exports = {
  getSettings: () => settings,
  loadSettings,
  saveSettings,
  log,
  settingsDir,
  settingsPath
};
