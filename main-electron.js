const { app, BrowserWindow, Menu, dialog, ipcMain, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// 禁用 GPU 硬件加速缓存，避免沙箱权限问题
app.disableHardwareAcceleration();

let mainWindow = null;

function getKeyStorePath() {
  return path.join(app.getPath('userData'), 'encrypted_keys.json');
}

function saveKeyStore(data) {
  try {
    fs.writeFileSync(getKeyStorePath(), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('保存密钥存储失败:', err);
    return false;
  }
}

function loadKeyStore() {
  try {
    if (fs.existsSync(getKeyStorePath())) {
      const content = fs.readFileSync(getKeyStorePath(), 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('加载密钥存储失败:', err);
  }
  return {};
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AI写作工具',
    icon: path.join(__dirname, 'assets', 'icons', 'dl-builtin-trae', 'logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载入口页面
  mainWindow.loadFile('index.html');

  // 去掉默认菜单栏
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// ========== 自动更新 ==========
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // 检查到新版本
  autoUpdater.on('update-available', function(info) {
    if (!mainWindow) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: '检测到新版本 v' + info.version,
      detail: '是否立即下载更新？',
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0
    }).then(function(result) {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 下载进度
  autoUpdater.on('download-progress', function(progress) {
    if (mainWindow) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  // 下载完成
  autoUpdater.on('update-downloaded', function() {
    if (!mainWindow) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成，是否立即安装并重启？',
      buttons: ['立即安装', '稍后'],
      defaultId: 0
    }).then(function(result) {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 检查更新出错
  autoUpdater.on('error', function(err) {
    console.log('更新检查失败:', err);
  });

  // 没有新版本
  autoUpdater.on('update-not-available', function() {
    console.log('当前版本已是最新');
  });

  // 启动后延迟3秒检查更新
  setTimeout(function() {
    autoUpdater.checkForUpdates();
  }, 3000);
}

// IPC：手动检查更新
ipcMain.on('check-for-updates', function() {
  autoUpdater.checkForUpdates();
});

// IPC：加密存储API密钥
ipcMain.handle('encrypt-and-save-key', function(event, keyName, keyValue) {
  try {
    const keyStore = loadKeyStore();
    if (!keyValue) {
      delete keyStore[keyName];
      saveKeyStore(keyStore);
      return { success: true };
    }
    const encrypted = safeStorage.encryptString(keyValue);
    keyStore[keyName] = encrypted.toString('base64');
    saveKeyStore(keyStore);
    return { success: true };
  } catch (err) {
    console.error('加密存储失败:', err);
    return { success: false, error: '加密存储失败' };
  }
});

// IPC：解密读取API密钥
ipcMain.handle('decrypt-key', function(event, keyName) {
  try {
    const keyStore = loadKeyStore();
    const encrypted = keyStore[keyName];
    if (!encrypted) return { success: true, value: '' };
    const buffer = Buffer.from(encrypted, 'base64');
    const decrypted = safeStorage.decryptString(buffer);
    return { success: true, value: decrypted };
  } catch (err) {
    console.error('解密失败:', err);
    return { success: false, error: '解密失败', value: '' };
  }
});

app.whenReady().then(function() {
  createWindow();
  setupAutoUpdater();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
