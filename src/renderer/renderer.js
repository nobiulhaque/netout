// UI Logic for NetOut

let appSettings = {};
let isTogglingAll = false;
let currentInternetState = true; // true if any adapter is enabled

const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const btnMaster = document.getElementById('btn-master-toggle');
const glowContainer = document.getElementById('master-glow-container');
const masterLabel = document.getElementById('master-status-label');
const masterSub = document.getElementById('master-status-sub');
const shortcutDisplay = document.getElementById('shortcut-display');
const btnClearShortcut = document.getElementById('btn-clear-shortcut');
const chkStartup = document.getElementById('chk-startup');
const chkStartMinimized = document.getElementById('chk-start-minimized');
const chkTray = document.getElementById('chk-tray');
const refreshIndicator = document.getElementById('refresh-indicator');

let isRecording = false;

// 1. Titlebar window control buttons
btnMinimize.addEventListener('click', () => {
  window.api.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  window.api.closeWindow();
});

// 2. Master Power Toggle Button
btnMaster.addEventListener('click', async () => {
  if (isTogglingAll) return;
  
  isTogglingAll = true;
  setMasterChangingState(true);
  
  const targetState = !currentInternetState;
  try {
    const res = await window.api.toggleAll(targetState);
    if (!res || !res.success) {
      // If failed (e.g. UAC cancelled), clear changing state and refresh
      isTogglingAll = false;
      setMasterChangingState(false);
      await refreshAdapters();
    }
  } catch (err) {
    console.error('Failed to toggle all adapters:', err);
    isTogglingAll = false;
    setMasterChangingState(false);
    await refreshAdapters();
  }
});

// 4. Keyboard Shortcut Recording
shortcutDisplay.addEventListener('click', () => {
  isRecording = true;
  shortcutDisplay.classList.add('recording');
  shortcutDisplay.value = 'Press keys to bind...';
});

shortcutDisplay.addEventListener('keydown', (e) => {
  if (!isRecording) return;
  e.preventDefault();
  
  const keys = [];
  if (e.ctrlKey) keys.push('Ctrl');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');
  
  let key = e.key;
  if (key === 'Control' || key === 'Alt' || key === 'Shift') {
    shortcutDisplay.value = keys.join('+');
    return;
  }
  
  // Format key name to Electron standard
  if (key === ' ') {
    key = 'Space';
  } else if (key === 'ArrowUp') {
    key = 'Up';
  } else if (key === 'ArrowDown') {
    key = 'Down';
  } else if (key === 'ArrowLeft') {
    key = 'Left';
  } else if (key === 'ArrowRight') {
    key = 'Right';
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }
  
  keys.push(key);
  
  const shortcutStr = keys.join('+');
  shortcutDisplay.value = shortcutStr;
  
  isRecording = false;
  shortcutDisplay.classList.remove('recording');
  shortcutDisplay.blur();
  
  saveShortcut(shortcutStr);
});

shortcutDisplay.addEventListener('blur', () => {
  if (isRecording) {
    isRecording = false;
    shortcutDisplay.classList.remove('recording');
    displayCurrentShortcut();
  }
});

btnClearShortcut.addEventListener('click', () => {
  saveShortcut('None');
});

// 5. Settings Checkboxes
const settingsCheckboxIds = ['chk-startup', 'chk-start-minimized', 'chk-tray'];
settingsCheckboxIds.forEach(id => {
  document.getElementById(id).addEventListener('change', async () => {
    appSettings.runAtStartup = chkStartup.checked;
    appSettings.startMinimized = chkStartMinimized.checked;
    appSettings.minimizeToTray = chkTray.checked;
    
    await window.api.saveSettings(appSettings);
  });
});

// 6. Refresh indicator click (manual refresh)
refreshIndicator.addEventListener('click', () => {
  if (!refreshIndicator.classList.contains('refreshing')) {
    refreshAdapters();
  }
});

// UI helper functions
async function refreshAdapters() {
  refreshIndicator.classList.add('refreshing');
  const adapters = await window.api.getAdapters();
  renderAdapters(adapters);
  setTimeout(() => {
    refreshIndicator.classList.remove('refreshing');
  }, 500);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function renderAdapters(adapters) {
  const listContainer = document.getElementById('adapters-list');
  listContainer.innerHTML = '';

  if (!adapters || adapters.length === 0) {
    listContainer.innerHTML = `<div class="adapter-desc" style="text-align: center; padding: 10px;">No physical network adapters found.</div>`;
    updateMasterStatus(false, false);
    return;
  }

  const anyEnabled = adapters.some(a => a.Status !== 'Disabled');
  const allEnabled = adapters.every(a => a.Status !== 'Disabled');

  updateMasterStatus(anyEnabled, allEnabled);

  adapters.forEach(adapter => {
    const item = document.createElement('div');
    item.className = 'adapter-item';

    const isEnabled = adapter.Status !== 'Disabled';
    
    // Status color badge
    let badgeClass = 'badge-disconnected';
    let badgeText = 'Offline';
    if (!isEnabled) {
      badgeClass = 'badge-disabled';
      badgeText = 'Disabled';
    } else if (adapter.Status === 'Up') {
      badgeClass = 'badge-connected';
      badgeText = 'Connected';
    }

    // Attempt to guess type based on name description
    const nameLower = adapter.Name.toLowerCase();
    const descLower = (adapter.InterfaceDescription || '').toLowerCase();
    const isWifi = nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('wireless') ||
                    descLower.includes('wi-fi') || descLower.includes('wifi') || descLower.includes('wireless') || descLower.includes('802.11');
    const typeLabel = isWifi ? 'Wi-Fi' : 'Ethernet';

    const safeName = escapeHTML(adapter.Name);
    const safeDesc = escapeHTML(adapter.InterfaceDescription || typeLabel);

    item.innerHTML = `
      <div class="adapter-info">
        <div class="adapter-name-row">
          <span class="adapter-name" title="${safeName}">${safeName}</span>
        </div>
        <div class="adapter-desc" title="${safeDesc}">${safeDesc}</div>
      </div>
      <span class="adapter-badge ${badgeClass}">${badgeText}</span>
    `;

    listContainer.appendChild(item);
  });
}

function updateMasterStatus(anyEnabled, allEnabled) {
  currentInternetState = anyEnabled;
  
  if (isTogglingAll) return;

  if (anyEnabled) {
    glowContainer.className = 'master-outer-glow active';
    masterLabel.textContent = 'Internet is Active';
    masterLabel.style.color = 'var(--color-active)';
    masterSub.textContent = allEnabled ? 'All physical adapters online' : 'Some physical adapters online';
  } else {
    glowContainer.className = 'master-outer-glow';
    masterLabel.textContent = 'Internet is Cut';
    masterLabel.style.color = 'var(--text-muted)';
    masterSub.textContent = 'All physical adapters disabled';
  }
}

function setMasterChangingState(changing) {
  if (changing) {
    glowContainer.className = 'master-outer-glow changing';
    masterLabel.textContent = 'Toggling...';
    masterLabel.style.color = 'var(--color-warning)';
    masterSub.textContent = 'Applying network rules';
  } else {
    // Re-evaluate current internet state and restore master button status
    updateMasterStatus(currentInternetState, false);
  }
}

async function displayCurrentShortcut() {
  const shortcut = appSettings.shortcut || 'None';
  shortcutDisplay.value = shortcut === 'None' ? 'No Hotkey Bound' : shortcut;
}

async function saveShortcut(newShortcut) {
  appSettings.shortcut = newShortcut;
  await window.api.saveSettings(appSettings);
  displayCurrentShortcut();
}

async function loadAppSettings() {
  appSettings = await window.api.getSettings();
  
  chkStartup.checked = appSettings.runAtStartup || false;
  chkStartMinimized.checked = appSettings.startMinimized || false;
  chkTray.checked = appSettings.minimizeToTray || false;
  
  displayCurrentShortcut();
}

async function initAdminStatus() {
  const isAdmin = await window.api.checkAdmin();
  const badge = document.getElementById('admin-badge');
  const badgeText = document.getElementById('admin-badge-text');

  badge.className = 'admin-badge';
  if (isAdmin) {
    badge.classList.add('admin-granted');
    badgeText.textContent = 'Administrator Mode (Instant Toggles)';
  } else {
    badge.classList.add('admin-restricted');
    badgeText.textContent = 'Standard Mode (Requires elevation)';
  }
}

// Startup Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await initAdminStatus();
  await loadAppSettings();
  await refreshAdapters();

  // Listen for background global shortcut toggle start
  window.api.onShortcutTriggered(() => {
    isTogglingAll = true;
    setMasterChangingState(true);
  });

  // Listen for polling state changes
  window.api.onAdaptersUpdated((adapters) => {
    if (isTogglingAll) {
      isTogglingAll = false;
      setMasterChangingState(false);
    }
    if (!isRecording) {
      renderAdapters(adapters);
    }
  });
});
