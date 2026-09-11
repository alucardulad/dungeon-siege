/**
 * Electron 桌面壳：加载 `npm run build` 生成的 dist/index.html。
 *
 * 这个文件故意使用 CommonJS（.cjs），避免与项目根目录的
 * `"type": "module"` 冲突。运行时不需要 Node 开发环境，
 * 用户拿到的安装包自带 Chromium。
 */

const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: '地牢围攻',
    backgroundColor: '#0d1017',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // 游戏本身不打开外部页面；只允许邮箱/网址跳转到系统默认应用。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents?.getURL()
    if (currentUrl && url !== currentUrl) {
      event.preventDefault()
      if (/^(https?:|mailto:)/i.test(url)) {
        shell.openExternal(url)
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
