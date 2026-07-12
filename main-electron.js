const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// 禁用 GPU 硬件加速缓存，避免沙箱权限问题
app.disableHardwareAcceleration();

let mainWindow = null;

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
