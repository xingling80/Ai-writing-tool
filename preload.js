const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('autoUpdate', {
  checkForUpdates: function() {
    ipcRenderer.send('check-for-updates');
  }
});

contextBridge.exposeInMainWorld('secureStorage', {
  encryptAndSaveKey: function(keyName, keyValue) {
    return ipcRenderer.invoke('encrypt-and-save-key', keyName, keyValue);
  },
  decryptKey: function(keyName) {
    return ipcRenderer.invoke('decrypt-key', keyName);
  }
});
