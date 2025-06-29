const { contextBridge, ipcRenderer } = require('electron')


const api = {

  openExternal: (url) => ipcRenderer.invoke('open-external', url),


  getServerList: () => ipcRenderer.invoke('get-server-list'),
  saveServer: (serverData) => ipcRenderer.invoke('save-server', serverData),
  startServer: (serverName) => ipcRenderer.invoke('start-server', serverName),
  stopServer: (serverName) => ipcRenderer.invoke('stop-server', serverName),
  deleteServer: (serverName) => ipcRenderer.invoke('delete-server', serverName),


  getServerPlugins: (serverName) => ipcRenderer.invoke('get-server-plugins', serverName),
  toggleServerPlugin: (serverName, pluginName, enable) => ipcRenderer.invoke('toggle-server-plugin', serverName, pluginName, enable),
  deleteServerPlugin: (serverName, pluginName) => ipcRenderer.invoke('delete-server-plugin', serverName, pluginName),
  openPluginFolder: (serverName) => ipcRenderer.invoke('open-plugin-folder', serverName),


  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),


  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  checkCS2Path: () => ipcRenderer.invoke('check-cs2-path'),


  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),


  getCS2Log: () => ipcRenderer.invoke('get-cs2-log'),
  getServerConsoleLog: (serverName) => ipcRenderer.invoke('get-server-console-log', serverName),


  sendServerCommand: (serverName, command) => ipcRenderer.invoke('send-server-command', serverName, command),
  sendCS2Command: (command) => ipcRenderer.invoke('send-cs2-command', command),


  startCS2Server: (args = []) => ipcRenderer.invoke('start-cs2-server', args),


  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),


  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', callback);
  },
  removeDownloadProgressListener: (callback) => {
    ipcRenderer.removeListener('download-progress', callback);
  }
}


if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error('[Preload] contextBridge expose failed:', error)
  }
} else {

  window.electronAPI = api
}
