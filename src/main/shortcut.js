const { globalShortcut } = require('electron');
const { getSettings } = require('./settings');
const { getIsToggling, getPhysicalAdapters, toggleAllAdapters, runToggleAction } = require('./powerShell');

let getMainWindowFn = () => null;

function registerGlobalShortcut() {
  globalShortcut.unregisterAll();
  
  const settings = getSettings();
  if (!settings.shortcut || settings.shortcut === 'None') {
    return;
  }

  try {
    const registered = globalShortcut.register(settings.shortcut, async () => {
      if (getIsToggling()) return;
      
      // Toggle logic: if any adapter is enabled, turn them all off. Otherwise, turn them all on.
      const adapters = await getPhysicalAdapters();
      const anyEnabled = adapters.some(a => a.Status !== 'Disabled');
      
      // Notify main window of toggle start
      const mainWindow = getMainWindowFn();
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-triggered');
      }
      
      const targetState = !anyEnabled;
      await runToggleAction(() => toggleAllAdapters(targetState));
    });

    if (!registered) {
      console.warn(`Failed to register global shortcut: ${settings.shortcut}`);
    }
  } catch (err) {
    console.error('Error registering global shortcut:', err);
  }
}

function initShortcut(mainWindowGetter) {
  getMainWindowFn = mainWindowGetter;
  registerGlobalShortcut();
}

module.exports = {
  registerGlobalShortcut,
  initShortcut
};
