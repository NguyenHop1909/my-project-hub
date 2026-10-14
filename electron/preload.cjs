const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hubAPI', {
  checkHealth: (url) => ipcRenderer.invoke('health:check', url),
  runtime: 'desktop'
});
