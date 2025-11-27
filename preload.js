// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runScript: (script) => ipcRenderer.invoke('run-applescript', script),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options)
});
