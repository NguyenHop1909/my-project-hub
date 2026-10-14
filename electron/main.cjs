const { app, BrowserWindow, shell, dialog, ipcMain, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#0d1117',
    title: 'My Project Hub',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('health:check', async (_event, targetUrl) => {
  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
  } catch {
    return { ok: false, error: 'URL không hợp lệ' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const startedAt = Date.now();
  try {
    let response = await net.fetch(parsed.href, {
      method: 'HEAD', redirect: 'follow', cache: 'no-store', signal: controller.signal
    });
    if (response.status === 405) {
      response = await net.fetch(parsed.href, {
        method: 'GET', redirect: 'follow', cache: 'no-store', signal: controller.signal
      });
    }
    return {
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      latency: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      latency: Date.now() - startedAt,
      error: error?.name === 'AbortError' ? 'Hết thời gian phản hồi' : 'Không thể kết nối'
    };
  } finally {
    clearTimeout(timeout);
  }
});

function configureAutoUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Đã có bản cập nhật mới',
      message: `My Project Hub ${info.version} đã tải xong.`,
      detail: 'Khởi động lại ứng dụng để cài bản cập nhật ngay.',
      buttons: ['Khởi động lại', 'Để sau'],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error?.message || error);
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
}

app.whenReady().then(() => {
  createWindow();
  configureAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
