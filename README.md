# NetOut 🌐✂️

NetOut is a lightweight, high-performance Windows utility designed to instantly cut or restore your internet connection with a single click or keyboard shortcut.

It operates by toggling your computer's physical network adapters (Ethernet and Wi-Fi) using optimized PowerShell cmdlets.

---

## ✨ Features

- **Instant Toggle (< 50ms)**: Optimised adapter cmdlets update and refresh connection status instantly.
- **Global Keyboard Shortcut**: Toggle connection states globally using a configurable hotkey (default is `Ctrl+Alt+I`), even when the app is minimized or running in the background.
- **System Tray Integration**: Minimize the application to your Windows system tray to keep your desktop clean.
- **Run at Startup**: Option to automatically start NetOut when Windows boots up.
- **Security Hardened**: Built-in Content Security Policy (CSP), isolated renderer contexts, whitelisted commands, and whitelisted parameters to prevent any security vulnerabilities.

---

## 🚀 How to Download & Install

1. Go to the [**Releases**](https://github.com/nobiulhaque/netout/releases) page on the GitHub repository.
2. Download the latest installer file: **`NetOut Setup 1.0.0.exe`**.
3. Run the installer (you can customize the installation folder; it will automatically create a `NetOut` subfolder).
4. Launch the application.
   > ⚠️ **Note**: Windows requires Administrator privileges to enable or disable network hardware. When you start NetOut, a standard Windows User Account Control (UAC) prompt will ask for permission. This is normal and required for the application to toggle adapters.

---

## 🛠️ Global Hotkey Bindings

To register or change your global hotkey:
1. Click the hotkey textbox under **Global Hotkey** in the app.
2. Press your desired key combination (e.g., `Ctrl+Shift+F12` or `Ctrl+Alt+I`).
3. The hotkey will register immediately. 
4. To clear the hotkey, click the **Clear** button.

---

## 💻 Developer Setup & Building

If you want to run the project in development mode or build it yourself:

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Scripts
- **Start App in Dev Mode**:
  ```bash
  npm start
  ```
- **Compile Icon**:
  ```bash
  npm run build:icon
  ```
- **Compile & Build Windows Installer**:
  ```bash
  npm run dist
  ```
  The built installer will be generated under the `dist/` directory as `NetOut Setup 1.0.0.exe`.

---

## 🛡️ License

This project is open-source and licensed under the [MIT License](LICENSE).
