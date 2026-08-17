const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

function appIndex(){
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'index.html')
    : path.join(__dirname, '..', 'app', 'index.html');
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(appIndex());
}

ipcMain.handle('dawo:pick-audio', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Vybrat audio soubory',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['mp3','wav','aiff','aif','flac','m4a','ogg'] }]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dawo:pick-nml', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Vybrat Traktor collection.nml',
    properties: ['openFile'],
    filters: [{ name: 'Traktor NML', extensions: ['nml'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dawo:read-text', async (_event, filePath) => fs.readFile(filePath, 'utf8'));
ipcMain.handle('dawo:write-text', async (_event, { filePath, content }) => { await fs.writeFile(filePath, content, 'utf8'); return true; });
ipcMain.handle('dawo:show-in-folder', async (_event, filePath) => { shell.showItemInFolder(filePath); return true; });

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });