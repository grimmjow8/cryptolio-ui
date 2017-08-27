const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// recommended global reference to prevent window closing due to garbage collected.
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // load main landing page
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.maximize();

  // open the DevTools.
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

// quit when all windows are closed.
app.on('window-all-closed', function () {
  // OS X common for apps and menu bar to stay active until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // OS X common recreate window when dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// addition main process handling
// require additional modules
