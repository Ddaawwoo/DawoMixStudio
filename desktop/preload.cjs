const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DawoDesktop', {
  isDesktop: true,
  pickAudioFiles: () => ipcRenderer.invoke('dawo:pick-audio'),
  pickTraktorNml: () => ipcRenderer.invoke('dawo:pick-nml'),
  readTextFile: (filePath) => ipcRenderer.invoke('dawo:read-text', filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('dawo:write-text', { filePath, content }),
  showInFolder: (filePath) => ipcRenderer.invoke('dawo:show-in-folder', filePath)
});