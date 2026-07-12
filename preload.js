const { ipcRenderer, contextBridge } = require('electron');

// 暴露检查更新接口到渲染进程
contextBridge.exposeInMainWorld('autoUpdate', {
  checkForUpdates: function() {
    ipcRenderer.send('check-for-updates');
  }
});
