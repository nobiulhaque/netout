const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkAdmin: () => ipcRenderer.invoke('check-admin'),
  getAdapters: () => ipcRenderer.invoke('get-adapters'),
  toggleAdapter: (name, targetState) => ipcRenderer.invoke('toggle-adapter', { name, targetState }),
  toggleAll: (targetState) => ipcRenderer.invoke('toggle-all', { targetState }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onShortcutTriggered: (callback) => {
    ipcRenderer.removeAllListeners('shortcut-triggered');
    ipcRenderer.on('shortcut-triggered', () => callback());
  },
  onAdaptersUpdated: (callback) => {
    ipcRenderer.removeAllListeners('adapters-updated');
    ipcRenderer.on('adapters-updated', (event, adapters) => callback(adapters));
  }
});
