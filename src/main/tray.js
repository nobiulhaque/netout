const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { getIsToggling, getPhysicalAdapters, toggleAllAdapters, runToggleAction } = require('./powerShell');

let tray = null;

function createTray(showWindow) {
  // Load custom branding icon and resize for system tray (16x16)
  const iconPath = path.join(__dirname, '../renderer/icon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  if (trayIcon.isEmpty()) {
    // Beautiful minimal base64 16x16 network adapter tray icon fallback (white/gray circle outline with dot)
    const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAN0lEQVQ4T2NkoBAwUqifAW6AqZH6mGBqOhoGICNDDwwGg8FoGAz+gz/yGg0D4EcxmK8cADnEDyHT21i/AAAAAElFTkSuQmCC';
    trayIcon = nativeImage.createFromBuffer(Buffer.from(iconBase64, 'base64'));
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip('NetOut - Internet Controller');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show NetOut', click: () => { 
        showWindow();
      } 
    },
    { type: 'separator' },
    { label: 'Toggle Internet', click: async () => {
        if (getIsToggling()) return;
        const adapters = await getPhysicalAdapters();
        const anyEnabled = adapters.some(a => a.Status !== 'Disabled');
        await runToggleAction(() => toggleAllAdapters(!anyEnabled));
      }
    },
    { type: 'separator' },
    { label: 'Exit', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    showWindow();
  });

  return tray;
}

module.exports = {
  createTray
};
