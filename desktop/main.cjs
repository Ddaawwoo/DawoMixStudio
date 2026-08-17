const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

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
ipcMain.handle('dawo:read-binary', async (_event, filePath) => new Uint8Array(await fs.readFile(filePath)));
ipcMain.handle('dawo:write-text', async (_event, { filePath, content }) => { await fs.writeFile(filePath, content, 'utf8'); return true; });
ipcMain.handle('dawo:show-in-folder', async (_event, filePath) => { shell.showItemInFolder(filePath); return true; });

function megaCandidates(command){
  const out=[];
  if(process.platform==='win32' && process.env.LOCALAPPDATA){
    const base=path.join(process.env.LOCALAPPDATA,'MEGAcmd');
    out.push(path.join(base,`${command}.bat`),path.join(base,`${command}.exe`));
  }
  out.push(command);
  return out;
}
async function runMega(command,args=[]){
  let last;
  for(const exe of megaCandidates(command)){
    try{
      const result=await execFileAsync(exe,args,{windowsHide:true,maxBuffer:16*1024*1024,shell:process.platform==='win32'&&exe.endsWith('.bat')});
      return {ok:true,stdout:String(result.stdout||'').trim(),stderr:String(result.stderr||'').trim()};
    }catch(error){last=error;if(error?.code!=='ENOENT' && !/not recognized|not found/i.test(String(error?.message||'')))throw error;}
  }
  const e=new Error('MEGAcmd není nainstalované nebo není v PATH.');e.code='MEGACMD_NOT_FOUND';e.cause=last;throw e;
}
async function listFilesRecursive(root){
  const out=[];
  async function walk(p){
    const entries=await fs.readdir(p,{withFileTypes:true});
    for(const e of entries){const full=path.join(p,e.name);if(e.isDirectory())await walk(full);else out.push(full)}
  }
  if(fssync.existsSync(root))await walk(root);
  return out;
}
const audioExt=/\.(mp3|wav|aiff?|flac|m4a|ogg)$/i;

ipcMain.handle('dawo:mega-status', async () => {
  try{const r=await runMega('mega-whoami');return {installed:true,loggedIn:true,user:r.stdout||'MEGA účet'};}
  catch(error){if(error.code==='MEGACMD_NOT_FOUND')return {installed:false,loggedIn:false,error:error.message};return {installed:true,loggedIn:false,error:String(error.stderr||error.message||'Nepřihlášeno')};}
});
ipcMain.handle('dawo:mega-login', async (_event,{email,password,authCode}) => {
  const args=[];if(authCode)args.push(`--auth-code=${authCode}`);args.push(String(email||''),String(password||''));
  const r=await runMega('mega-login',args);return {ok:true,message:r.stdout||'Přihlášeno'};
});
ipcMain.handle('dawo:mega-logout', async () => {const r=await runMega('mega-logout');return {ok:true,message:r.stdout||'Odhlášeno'};});
ipcMain.handle('dawo:mega-list-audio', async () => {
  const patterns=['*.mp3','*.wav','*.aiff','*.aif','*.flac','*.m4a','*.ogg'];
  const set=new Set();
  for(const pattern of patterns){try{const r=await runMega('mega-find',['/','--pattern='+pattern]);r.stdout.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(x=>set.add(x));}catch(error){if(error.code==='MEGACMD_NOT_FOUND')throw error;}}
  return [...set].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
});
ipcMain.handle('dawo:mega-download', async (_event,remotePath) => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'DawoMixStudio-MEGA-'));
  await runMega('mega-get',[String(remotePath),dir]);
  const files=(await listFilesRecursive(dir)).filter(p=>audioExt.test(p));
  return {dir,files};
});
ipcMain.handle('dawo:mega-cleanup', async (_event,dir) => {if(dir&&String(dir).includes('DawoMixStudio-MEGA-'))await fs.rm(dir,{recursive:true,force:true});return true;});
ipcMain.handle('dawo:mega-open-login', async () => {await shell.openExternal('https://mega.nz/login');return true;});
ipcMain.handle('dawo:mega-open-cmd-download', async () => {await shell.openExternal('https://mega.nz/cmd');return true;});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });