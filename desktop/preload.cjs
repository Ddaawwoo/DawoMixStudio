const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DawoDesktop', {
  isDesktop: true,
  pickAudioFiles: () => ipcRenderer.invoke('dawo:pick-audio'),
  pickTraktorNml: () => ipcRenderer.invoke('dawo:pick-nml'),
  readTextFile: (filePath) => ipcRenderer.invoke('dawo:read-text', filePath),
  readBinaryFile: (filePath) => ipcRenderer.invoke('dawo:read-binary', filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('dawo:write-text', { filePath, content }),
  showInFolder: (filePath) => ipcRenderer.invoke('dawo:show-in-folder', filePath),
  megaStatus: () => ipcRenderer.invoke('dawo:mega-status'),
  megaLogin: (email,password,authCode='') => ipcRenderer.invoke('dawo:mega-login', { email,password,authCode }),
  megaLogout: () => ipcRenderer.invoke('dawo:mega-logout'),
  megaListAudio: () => ipcRenderer.invoke('dawo:mega-list-audio'),
  megaDownload: (remotePath) => ipcRenderer.invoke('dawo:mega-download', remotePath),
  megaCleanup: (dir) => ipcRenderer.invoke('dawo:mega-cleanup', dir),
  megaOpenLogin: () => ipcRenderer.invoke('dawo:mega-open-login'),
  megaOpenCmdDownload: () => ipcRenderer.invoke('dawo:mega-open-cmd-download')
});