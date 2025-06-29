import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join, dirname } from 'path'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile, access, writeFile, mkdir, stat, writeFileSync, readFileSync, createWriteStream, existsSync, mkdirSync } from 'fs'
import { readFile as readFileAsync, access as accessAsync, writeFile as writeFileAsync, mkdir as mkdirAsync, stat as statAsync } from 'fs/promises'
import { homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { isDev } from './utils.js'
import { createReadStream } from 'fs'
import subprocess, { spawn } from 'child_process'
import Rcon from 'rcon-srcds';


let cs2Process = null
let cs2Logs = []
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, error) => console.error(`[ERROR] ${msg}`, error),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
}

const serverLogStreams = new Map()


const serverProcesses = new Map()
async function loadServerConfig(serverJsonPath, serverName) {
  try {
    const serverData = await readFileAsync(serverJsonPath, 'utf-8')
    const servers = JSON.parse(serverData)
    
    if (!Array.isArray(servers)) {
      throw new Error('服务器配置格式无效')
    }

    const serverIndex = servers.findIndex(s => s.name === serverName)
    if (serverIndex === -1) {
      throw new Error(`服务器 ${serverName} 不存在`)
    }

    return { servers, serverIndex }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('服务器配置文件不存在')
    }
    throw error
  }
}

function createLogStream(serverName) {
  try {
    const configPath = join(homedir(), '.cssm', 'config.json')
    let globalPath = join(homedir(), '.cssm')
    

    try {
      const configData = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configData)
      if (config.global && config.global.path) {
        globalPath = config.global.path
      }
    } catch (error) {
      console.log('使用默认路径，配置文件读取失败:', error.message)
    }
    
    const logsDir = join(globalPath, 'logs', serverName)
    const logFile = join(logsDir, 'console.log')
    

    if (!existsSync(logsDir)) {
      try {

          mkdirSync(logsDir, { recursive: true })
          console.log(`[LOG] 创建日志目录: ${logsDir}`)
        } catch (error) {
          console.error(`创建日志目录失败: ${error.message}`)
          return null
        }
    }
    

    const stream = createWriteStream(logFile, { flags: 'w' })
    serverLogStreams.set(serverName, stream)
    

    const startMessage = `服务器 ${serverName} 启动 - ${new Date().toISOString()}`
    stream.write(`[${new Date().toISOString()}] [START] ${startMessage}\n`)
    
    console.log(`[LOG] 为服务器 ${serverName} 创建日志文件: ${logFile}`)
    return stream
  } catch (error) {
    console.error(`创建日志流失败 [${serverName}]:`, error)
    return null
  }
}


function closeLogStream(serverName) {
  const stream = serverLogStreams.get(serverName)
  if (stream) {
    stream.end()
    serverLogStreams.delete(serverName)
    console.log(`[LOG] 关闭服务器 ${serverName} 的日志文件`)
  }
}


function writeLogToFile(serverName, logLine) {
  const stream = serverLogStreams.get(serverName)
  if (stream) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${logLine}\n`
    stream.write(logEntry)
  }
}


const appendLog = (line) => {
  cs2Logs.push(line)
  if (cs2Logs.length > 1000) {
    cs2Logs.shift()
  }
}

ipcMain.handle('start-cs2-server', async (_event, launchArgs = []) => {
  try {
    const configPath = join(homedir(), '.cssm', 'config.json')
    const configText = await readFileAsync(configPath, 'utf-8')
    const config = JSON.parse(configText)

    const cs2Path = config?.game?.cs2?.path
    if (!cs2Path) {
      throw new Error('cs2.exe path not found in config.json')
    }


    cs2Logs = []


    cs2Process = spawn(cs2Path, launchArgs, {
      cwd: dirname(cs2Path),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: false
    })



    return { success: true }
  } catch (error) {
    console.error('Error starting cs2 server:', error)
    return { success: false, message: error.message }
  }
})


const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
ipcMain.handle('get-cs2-log', () => {
  return cs2Logs
})


ipcMain.handle('get-server-console-log', async (_event, serverName) => {
  try {
    const configPath = join(homedir(), '.cssm', 'config.json')
    let globalPath = join(homedir(), '.cssm')
    

    try {
      const configData = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configData)
      if (config.global && config.global.path) {
        globalPath = config.global.path
      }
    } catch (error) {
      console.log('使用默认路径，配置文件读取失败:', error.message)
    }
    
    const logFile = join(globalPath, 'logs', serverName, 'console.log')
    

    if (!existsSync(logFile)) {
      return []
    }
    

    const logContent = readFileSync(logFile, 'utf-8')
    const lines = logContent.split('\n').filter(line => line.trim())
    

    const logs = lines.map((line, index) => {
      const timestampMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\] (.+)$/)
      if (timestampMatch) {
        return {
          id: index,
          timestamp: timestampMatch[1],
          content: timestampMatch[2]
        }
      } else {
        return {
          id: index,
          timestamp: new Date().toISOString(),
          content: line
        }
      }
    })
    

    return logs.slice(-1000)
  } catch (error) {
    console.error(`读取服务器日志失败 [${serverName}]:`, error)
    return []
  }
 })
 


 ipcMain.handle('send-server-command', async (_event, serverName, command) => {
  let rcon = null;
  try {

    const paths = { serverJson: join(homedir(), '.cssm', 'server.json') };
    const { servers, serverIndex } = await loadServerConfig(paths.serverJson, serverName);
    const server = servers[serverIndex];

    if (server.status !== 'running') {
      throw new Error(`服务器 ${serverName} 未运行`);
    }


    const rconPort = server.rcon_port ? parseInt(server.rcon_port) : (parseInt(server.port));
    const rconAddress = server.bind_ip === '0.0.0.0' ? '127.0.0.1' : (server.bind_ip || '127.0.0.1');
    console.log(`[RCON] 尝试连接到 ${rconAddress}:${rconPort} 密码: ${server.rcon_password || '123456'}`);
    rcon = new Rcon({
      host: rconAddress,
      port: rconPort,
      password: server.rcon_password || '123456'
    });


    console.log(`[RCON] 开始连接...`);
    await rcon.authenticate(server.rcon_password || '123456');
    console.log(`[RCON] 连接成功，发送命令: ${command}`);
    const response = await rcon.execute(command);
    console.log(`[RCON] 命令执行完成，响应:`, response);


    writeLogToFile(serverName, `[RCON] 命令: ${command}`);
    if (response) {
      writeLogToFile(serverName, `[RCON 响应] ${response}`);
    }

    return { success: true, response };
  } catch (error) {
    console.error(`[RCON] 错误详情:`, error);
    writeLogToFile(serverName, `[RCON 错误] ${error.message}`);
    return { success: false, message: error.message };
  } finally {

    if (rcon) {
      console.log(`[RCON] 连接处理完成`);
    }
  }
});


 const createWindow = () => {

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, isDev ? 'preload/index.js' : '../dist-electron/preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })


  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }


  if (isDev) {
    mainWindow.webContents.openDevTools()
  }


  ipcMain.handle('window-minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    return mainWindow.isMaximized()
  })

  ipcMain.handle('window-close', () => {
    mainWindow.close()
  })

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized()
  })
}


const checkProcessStatus = async (pid) => {
  if (pid === -1) {
    return { isOnline: false, shouldUpdatePid: false }
  }

  try {

    const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`)
    const lines = stdout.split('\n')

    if (lines.length < 2) {
      return { isOnline: false, shouldUpdatePid: true }
    }


    const processLine = lines[1]
    const processName = processLine.split(',')[0].replace(/"/g, '')

    if (processName.toLowerCase() === 'cs2.exe') {
      return { isOnline: true, shouldUpdatePid: false }
    } else {
      return { isOnline: false, shouldUpdatePid: true }
    }
  } catch (error) {

    return { isOnline: false, shouldUpdatePid: true }
  }
}


ipcMain.handle('save-server', async (_event, serverData) => {
  const cssmDir = join(homedir(), '.cssm');
  const serverJsonPath = join(cssmDir, 'server.json');

  try {
    await mkdirAsync(cssmDir, { recursive: true });

    let servers = [];
    try {
      const data = await readFileAsync(serverJsonPath, 'utf-8');
      servers = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('server.json not found, creating a new one.');
      }

    }

    if (!Array.isArray(servers)) {
      logger.warn('server.json data is not an array, initializing a new one.');
      servers = [];
    }

    const serverIndex = servers.findIndex(s => s.name === serverData.name);

    if (serverIndex !== -1) {
  
      servers[serverIndex] = { ...servers[serverIndex], ...serverData };
      logger.info(`服务器配置已更新: ${serverData.name}`);
    } else {
  
      servers.push(serverData);
      logger.info(`新服务器已添加: ${serverData.name}`);
    }

    await writeFileAsync(serverJsonPath, JSON.stringify(servers, null, 2), 'utf-8');
    logger.info(`服务器配置已成功保存到: ${serverJsonPath}`);

    return { success: true, message: '服务器配置已保存' };

  } catch (error) {
    logger.error('保存服务器配置失败', { 
      message: error.message, 
      stack: error.stack, 
      path: serverJsonPath 
    });
    return { success: false, message: `保存失败: ${error.message}` };
  }
});


ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择服务器存放目录'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]

      
      try {
        const stats = await stat(selectedPath)
      
      
        return {
          path: selectedPath,
          freeSpace: 99999999999999999999
        }
      } catch (error) {
        return {
          path: selectedPath,
          freeSpace: 0
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error selecting directory:', error)
    return null
  }
})


ipcMain.handle('select-file', async (_event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: options.properties || ['openFile'],
      filters: options.filters || [],
      title: options.title || '选择文件'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return {
        path: result.filePaths[0]
      }
    }

    return null
  } catch (error) {
    console.error('Error selecting file:', error)
    return null
  }
})


ipcMain.handle('check-file-exists', async (_event, filePath) => {
  try {
    await access(filePath)
    return { exists: true }
  } catch (error) {
    return { exists: false }
  }
})


ipcMain.handle('save-config', async (_event, config) => {
  try {
    const cssmDir = join(homedir(), '.cssm')
    const configPath = join(cssmDir, 'config.json')

  
    try {
      await mkdirAsync(cssmDir, { recursive: true })
    } catch (error) {
  
    }

    await writeFileAsync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('Error saving config:', error)
    return { success: false, message: error.message }
  }
})


ipcMain.handle('load-config', async () => {
  try {
    const configPath = join(homedir(), '.cssm', 'config.json')
    const data = await readFileAsync(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading config:', error)
    return null
  }
})


ipcMain.handle('check-cs2-path', async () => {
  try {
    const configPath = join(homedir(), '.cssm', 'config.json')
    const configText = await readFileAsync(configPath, 'utf-8')
    const config = JSON.parse(configText)

    const cs2Path = config?.game?.cs2?.path
    if (!cs2Path) {
      return { exists: false, message: 'CS2路径未配置' }
    }

    try {
      await access(cs2Path)
      return { exists: true }
    } catch (error) {
      return { exists: false, message: 'CS2文件不存在' }
    }
  } catch (error) {
    return { exists: false, message: '配置文件不存在' }
  }
})


ipcMain.handle('get-server-list', async () => {
  try {
    const serverJsonPath = join(homedir(), '.cssm', 'server.json')
    console.log(`[DEBUG] 读取server.json路径: ${serverJsonPath}`)

    try {
      await accessAsync(serverJsonPath)
      console.log('true')
    } catch {
  
      console.log('false')
      return []
    }

    const data = await readFileAsync(serverJsonPath, 'utf-8')
    const servers = JSON.parse(data)

  
    const statusChecks = servers.map(async (server, index) => {
      const { isOnline, shouldUpdatePid } = await checkProcessStatus(server.pid)

  
      const updatedServer = {
        ...server,
        status: isOnline ? 'running' : 'offline'
      }

  
      if (shouldUpdatePid) {
        updatedServer.pid = -1
      }

      return { server: updatedServer, index, needsUpdate: shouldUpdatePid }
    })

    const results = await Promise.all(statusChecks)
    const updatedServers = results.map(result => result.server)

  
    const needsFileUpdate = results.some(result => result.needsUpdate)

    if (needsFileUpdate) {
  
      try {
        await writeFileAsync(serverJsonPath, JSON.stringify(updatedServers, null, 2), 'utf-8')
      } catch (error) {
        console.error('Error updating server.json:', error)
      }
    }

    return updatedServers
  } catch (error) {
    console.error('Error reading server list:', error)
    return []
  }
})





process.on('uncaughtException', (err, origin) => {
  
  if (err.code === 'ECONNRESET') {
    console.warn(`[Main] 忽略 ECONNRESET 错误: ${err.message}`);
    return;
  }


  console.error(`[Main] 捕获到未处理的异常: ${err.message}`, {
    error: err,
    origin: origin,
  });


  if (!isDev) {
    dialog.showErrorBox(
      '应用程序发生严重错误',
      `发生了一个未处理的错误，请联系技术支持并提供以下信息: \n\n${err.stack}`
    );
  }
});

app.whenReady().then(() => {
  createWindow()

  
  ipcMain.handle('start-server', async (_event, serverName) => {


    try {
    
      if (!serverName || typeof serverName !== 'string') {
        throw new Error('服务器名称无效')
      }

      const paths = {
        userHome: homedir(),
        serverJson: join(homedir(), '.cssm', 'server.json'),
        config: join(homedir(), '.cssm', 'config.json')
      }

      logger.debug('初始化路径', paths)

    
      const { servers, serverIndex } = await loadServerConfig(paths.serverJson, serverName)
      const server = servers[serverIndex]

    
      if (server.status === 'running' && server.pid !== -1) {
        const { isOnline } = await checkProcessStatus(server.pid)
        if (isOnline) {
          throw new Error(`服务器 ${serverName} 已在运行中`)
        }
      }

    
      const cs2Path = await loadCS2Config(paths.config)
      
    
      await handlePluginManagement(serverName, cs2Path, paths)

    
      const launchArgs = buildLaunchArgs(server)

      logger.info(`启动服务器: ${serverName}`, { path: cs2Path, args: launchArgs })

    
      const serverProcess = spawn(cs2Path, launchArgs, {
        cwd: server.path || paths.userHome,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true
      })

    
      if (!serverProcess.pid) {
        throw new Error('服务器进程启动失败')
      }

    
      await updateServerStatus(paths.serverJson, servers, serverIndex, {
        status: 'running',
        pid: serverProcess.pid,
        startTime: new Date().toISOString()
      })

    
      setupProcessListeners(serverProcess, serverName, paths.serverJson, logger)

      logger.info(`服务器 ${serverName} 启动成功`, { pid: serverProcess.pid })
      return { success: true, pid: serverProcess.pid, serverName }

    } catch (error) {
      logger.error(`启动服务器 ${serverName} 失败`, error)
      return { success: false, message: error.message }
    }
  })



  
  async function loadCS2Config(configPath) {
    try {
      const configData = await readFileAsync(configPath, 'utf-8')
      const config = JSON.parse(configData)
      const cs2Path = config?.game?.cs2?.path

      if (!cs2Path || cs2Path.trim() === '') {
        throw new Error('请前往设置修改CS2.exe文件路径')
      }

    
      try {
        await accessAsync(cs2Path)
      } catch {
        throw new Error('请前往设置修改CS2.exe文件路径')
      }

      return cs2Path
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('请前往设置修改CS2.exe文件路径')
      }
      throw error
    }
  }

  
  function buildLaunchArgs(server) {
    const baseArgs = [
      '-dedicated',
      '+rcon_password', server.rcon_password || '123456',
      '+sv_rcon_whitelist_address', '127.0.0.1',
      '+map', server.current_map || 'de_dust2',
      '-maxplayers', server.maxplayers?.toString() || '64',
      '-port', server.port?.toString() || '27015',
      '-ip', server.bind_ip || '0.0.0.0'
    ]

  
    if (server.vac !== undefined) {
      baseArgs.push('+sv_secure', server.vac ? '1' : '0')
  
      if (!server.vac) {
        baseArgs.push('-insecure')
      }
    } else {
  
      baseArgs.push('+sv_secure', '0')
      baseArgs.push('-insecure')
    }

  
    const gameAlias = server.game_alias || 'competitive'
    baseArgs.push('+game_alias', gameAlias)

  
    const gameModeMap = {
      'competitive': { game_mode: '1', game_type: '0' },
      'wingman': { game_mode: '2', game_type: '0' },
      'casual': { game_mode: '0', game_type: '0' },
      'deathmatch': { game_mode: '2', game_type: '1' },
      'custom': { game_mode: '0', game_type: '3' }
    }

    const modeConfig = gameModeMap[gameAlias] || gameModeMap['competitive']
    baseArgs.push('+game_mode', modeConfig.game_mode)
    baseArgs.push('+game_type', modeConfig.game_type)

    return baseArgs
  }

  
  async function updateServerStatus(serverJsonPath, servers, serverIndex, updates) {
    try {
    
      Object.assign(servers[serverIndex], updates)

    
      const jsonContent = JSON.stringify(servers, null, 2)
      writeFileSync(serverJsonPath, jsonContent, 'utf-8')

    
      await new Promise(resolve => setTimeout(resolve, 100))
      const verifyData = readFileSync(serverJsonPath, 'utf-8')
      const verifyServers = JSON.parse(verifyData)
      
      if (verifyServers[serverIndex].pid !== updates.pid) {
        throw new Error('文件写入验证失败')
      }
    } catch (error) {
      throw new Error(`更新服务器状态失败: ${error.message}`)
    }
  }

  
  async function handleMetamodInstallation(globalPath, cs2Path) {
    try {
      const tempPath = join(globalPath, 'temp')
      const metamodZipPath = join(tempPath, 'metamod.zip')
      const cs2Dir = dirname(cs2Path)
      const cs2AddonsPath = join(cs2Dir, '..', '..', 'csgo', 'addons')
      
      logger.info('开始处理Metamod安装')
      
    
      if (!existsSync(tempPath)) {
        await mkdirAsync(tempPath, { recursive: true })
        logger.info(`已创建temp目录: ${tempPath}`)
      }
      
    
      if (!existsSync(cs2AddonsPath)) {
        await mkdirAsync(cs2AddonsPath, { recursive: true })
        logger.info(`已创建addons目录: ${cs2AddonsPath}`)
      }
      
    
      if (!existsSync(metamodZipPath)) {
        logger.info('Metamod文件不存在，开始下载')
        await downloadMetamod(metamodZipPath)
      } else {
        logger.info('Metamod文件已存在，跳过下载')
      }
      
    
      await extractMetamod(metamodZipPath, cs2AddonsPath)
      
      logger.info('Metamod安装完成')
      
    } catch (error) {
      logger.error('Metamod安装失败', error)
      throw new Error(`Metamod安装失败: ${error.message}`)
    }
  }
  
  
  async function downloadMetamod(targetPath) {
    const https = await import('https')
    const fs = await import('fs')
    

    const downloadUrl = 'https://github.com/alliedmodders/metamod-source/releases/download/1.12.0-dev/mmsource-1.12.0-git1148-windows.zip'
    
    return new Promise((resolve, reject) => {
      const file = fs.default.createWriteStream(targetPath)
      let downloadedBytes = 0
      let totalBytes = 0
      
      logger.info(`开始下载Metamod到: ${targetPath}`)
      
  
      if (global.mainWindow) {
        global.mainWindow.webContents.send('download-progress', {
          type: 'download-start',
          message: '开始下载Metamod插件...'
        })
      }
      
      https.default.get(downloadUrl, (response) => {
        if (response.statusCode === 200) {
          totalBytes = parseInt(response.headers['content-length'] || '0')
          
          response.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
            
      
            if (global.mainWindow) {
              global.mainWindow.webContents.send('download-progress', {
                type: 'download-progress',
                percent: progress,
                downloaded: downloadedBytes,
                total: totalBytes,
                message: `下载中... ${progress}%`
              })
            }
          })
          
          response.pipe(file)
          
          file.on('finish', () => {
            file.close()
            logger.info('Metamod下载完成')
            
      
            if (global.mainWindow) {
              global.mainWindow.webContents.send('download-progress', {
                type: 'download-complete',
                message: 'Metamod下载完成'
              })
            }
            
            resolve()
          })
          
          file.on('error', (err) => {
            fs.default.unlink(targetPath, () => {})
            
    
            if (global.mainWindow) {
              global.mainWindow.webContents.send('download-progress', {
                type: 'download-error',
                message: `下载失败: ${err.message}`
              })
            }
            
            reject(new Error(`文件写入失败: ${err.message}`))
          })
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // 处理重定向
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            logger.info(`重定向到: ${redirectUrl}`)
            https.default.get(redirectUrl, (redirectResponse) => {
              if (redirectResponse.statusCode === 200) {
                totalBytes = parseInt(redirectResponse.headers['content-length'] || '0')
                
                redirectResponse.on('data', (chunk) => {
                  downloadedBytes += chunk.length
                  const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
                  
                  if (global.mainWindow) {
                    global.mainWindow.webContents.send('download-progress', {
                      type: 'download-progress',
                      percent: progress,
                      downloaded: downloadedBytes,
                      total: totalBytes,
                      message: `下载中... ${progress}%`
                    })
                  }
                })
                
                redirectResponse.pipe(file)
              } else {
                reject(new Error(`重定向失败，HTTP状态码: ${redirectResponse.statusCode}`))
              }
            }).on('error', (err) => {
              reject(new Error(`重定向请求失败: ${err.message}`))
            })
          } else {
            reject(new Error('重定向URL为空'))
          }
        } else {
          // 发送下载错误通知
          if (global.mainWindow) {
            global.mainWindow.webContents.send('download-progress', {
              type: 'download-error',
              message: `下载失败，HTTP状态码: ${response.statusCode}`
            })
          }
          
          reject(new Error(`下载失败，HTTP状态码: ${response.statusCode}`))
        }
      }).on('error', (err) => {
        // 发送下载错误通知
        if (global.mainWindow) {
          global.mainWindow.webContents.send('download-progress', {
            type: 'download-error',
            message: `下载请求失败: ${err.message}`
          })
        }
        
        reject(new Error(`下载请求失败: ${err.message}`))
      })
    })
  }
  
  async function extractMetamod(zipPath, targetPath) {
    const fs = await import('fs')
    
    try {
      logger.info(`开始解压Metamod: ${zipPath} -> ${targetPath}`)
      
      // 检查zip文件是否存在和大小
      if (!fs.existsSync(zipPath)) {
        throw new Error('zip文件不存在')
      }
      
      const stats = fs.statSync(zipPath)
      if (stats.size < 1000) { // 文件太小，可能下载不完整
        throw new Error('zip文件大小异常，可能下载不完整')
      }
      
      // 发送解压开始通知
      if (global.mainWindow) {
        global.mainWindow.webContents.send('download-progress', {
          type: 'extract-start',
          message: '正在解压Metamod插件...'
        })
      }
      
      const AdmZip = (await import('adm-zip')).default
      const zip = new AdmZip(zipPath)
      
      // 验证zip文件
      const entries = zip.getEntries()
      if (entries.length === 0) {
        throw new Error('zip文件为空或损坏')
      }
      
      // 解压到目标目录
      zip.extractAllTo(targetPath, true)
      
      // 验证解压结果
      const extractedFiles = fs.readdirSync(targetPath, { recursive: true })
      if (extractedFiles.length === 0) {
        throw new Error('解压后没有找到文件')
      }
      
      logger.info('Metamod解压完成')
      
      // 发送解压完成通知
      if (global.mainWindow) {
        global.mainWindow.webContents.send('download-progress', {
          type: 'extract-complete',
          message: 'Metamod解压完成'
        })
      }
      
    } catch (error) {
      logger.error('解压失败', error)
      
      // 发送解压错误通知
      if (global.mainWindow) {
        global.mainWindow.webContents.send('download-progress', {
          type: 'extract-error',
          message: `解压失败: ${error.message}`
        })
      }
      
      // 如果解压失败，删除可能损坏的zip文件，下次重新下载
      try {
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath)
          logger.info('已删除损坏的zip文件，下次将重新下载')
        }
      } catch (deleteError) {
        logger.error('删除损坏zip文件失败', deleteError)
      }
      
      throw new Error(`解压失败: ${error.message}`)
    }
  }

  async function handlePluginManagement(serverName, cs2Path, paths) {
    try {
      const configPath = join(homedir(), '.cssm', 'config.json')
      let globalPath = join(homedir(), '.cssm')
      
      // 尝试读取全局配置路径
      try {
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.global && config.global.path) {
          globalPath = config.global.path
        }
      } catch (error) {
        console.log('使用默认路径，配置文件读取失败:', error.message)
      }
      
      const serverPluginsPath = join(globalPath, 'server', serverName, 'plugins', 'addons')
      const cs2Dir = dirname(cs2Path)
      const cs2PluginsPath = join(cs2Dir, '..', '..', 'csgo', 'addons', 'counterstrikesharp', 'plugins')
      
      logger.info(`开始处理服务器 ${serverName} 的插件管理`)
      logger.info(`CS2插件目录: ${cs2PluginsPath}`)
      
      // 检查服务器插件目录是否存在
      if (!existsSync(serverPluginsPath)) {
        logger.info(`服务器 ${serverName} 没有插件目录，删除CS2插件目录所有文件`)
        // 删除CS2插件目录所有文件
        const { rm } = await import('fs/promises')
        if (existsSync(cs2PluginsPath)) {
          await rm(cs2PluginsPath, { recursive: true, force: true })
          logger.info(`已删除CS2插件目录: ${cs2PluginsPath}`)
        }
        return
      }
      
      // 读取服务器插件目录
      const { readdir, rm, mkdir: mkdirAsync, cp } = await import('fs/promises')
      const items = await readdir(serverPluginsPath, { withFileTypes: true })
      const enabledPlugins = items.filter(item => item.isDirectory() && !item.name.endsWith('.off'))
      
      if (enabledPlugins.length === 0) {
        logger.info(`服务器 ${serverName} 没有启用的插件，删除CS2插件目录所有文件`)
        // 删除CS2插件目录所有文件
        if (existsSync(cs2PluginsPath)) {
          await rm(cs2PluginsPath, { recursive: true, force: true })
          logger.info(`已删除CS2插件目录: ${cs2PluginsPath}`)
        }
        return
      }
      
      logger.info(`找到 ${enabledPlugins.length} 个启用的插件，开始复制到CS2目录`)
      
      // 清空CS2插件目录
      if (existsSync(cs2PluginsPath)) {
        await rm(cs2PluginsPath, { recursive: true, force: true })
      }
      
      // 创建CS2插件目录
      await mkdirAsync(cs2PluginsPath, { recursive: true })
      
      // 复制启用的插件到CS2目录
      for (const plugin of enabledPlugins) {
        const sourcePath = join(serverPluginsPath, plugin.name)
        const targetPath = join(cs2PluginsPath, plugin.name)
        
        logger.info(`复制插件: ${plugin.name}`)
        await cp(sourcePath, targetPath, { recursive: true })
      }
      
      logger.info(`插件复制完成`)
      
    } catch (error) {
      logger.error(`插件管理失败`, error)
      throw error
    }
  }

  // 辅助函数：设置进程监听器
  function setupProcessListeners(serverProcess, serverName, serverJsonPath, logger) {
    // 存储进程引用
    serverProcesses.set(serverName, serverProcess)
    // 存储启动模式元数据（默认为隐藏模式）
    serverProcesses.set(serverName + '_meta', { mode: 'hidden' })
    
    // 创建日志文件写入流
    createLogStream(serverName)
    
    // 标准输出处理
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      const lines = output.split('\n').filter(line => {
        const trimmed = line.trim()
        return trimmed && 
               !trimmed.includes('CTextConsoleWin::GetLine') &&
               !trimmed.includes('!GetNumberOfConsoleInputEvents')
      })
      
      if (lines.length > 0) {
        const logContent = lines.join('\n')
        logger.debug(`[${serverName}] STDOUT`, logContent)
        // 写入到日志文件
        writeLogToFile(serverName, `[STDOUT] ${logContent}`)
      }
    })

    // 错误输出处理
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString().trim()
      if (output) {
        logger.error(`[${serverName}] STDERR`, output)
        // 写入到日志文件
        writeLogToFile(serverName, `[STDERR] ${output}`)
      }
    })

    // 进程退出处理
    serverProcess.on('exit', async (code, signal) => {
      const exitMessage = `进程退出 - Code: ${code}, Signal: ${signal}`
      logger.info(`[${serverName}] ${exitMessage}`)
      
      // 写入退出信息到日志文件
      writeLogToFile(serverName, `[EXIT] ${exitMessage}`)
      
      try {
        const serverData = await readFileAsync(serverJsonPath, 'utf-8')
        const servers = JSON.parse(serverData)
        const serverIndex = servers.findIndex(s => s.name === serverName)
        
        if (serverIndex !== -1) {
          servers[serverIndex].status = 'offline'
          servers[serverIndex].pid = -1
          servers[serverIndex].stopTime = new Date().toISOString()
          
          await writeFileAsync(serverJsonPath, JSON.stringify(servers, null, 2), 'utf-8')
          logger.info(`[${serverName}] 状态已更新为离线`)
        }
      } catch (error) {
        logger.error(`[${serverName}] 更新离线状态失败`, error)
      }
      
      // 关闭日志文件流
      closeLogStream(serverName)
      
      // 清理进程引用和元数据
      serverProcesses.delete(serverName)
      serverProcesses.delete(serverName + '_meta')
    })

    // 进程错误处理
    serverProcess.on('error', (error) => {
      logger.error(`[${serverName}] 进程错误`, error)
      // 写入错误信息到日志文件
      writeLogToFile(serverName, `[ERROR] 进程错误: ${error.message}`)
    })
  }

  // 停止服务器
  ipcMain.handle('stop-server', async (_event, serverName) => {
    try {
      // 验证输入参数
      if (!serverName || typeof serverName !== 'string') {
        throw new Error('服务器名称无效')
      }

      const paths = {
        serverJson: join(homedir(), '.cssm', 'server.json')
      }

      // 读取服务器配置
      const { servers, serverIndex } = await loadServerConfig(paths.serverJson, serverName)
      const server = servers[serverIndex]

      // 检查服务器状态
      if (server.status !== 'running') {
        throw new Error(`服务器 ${serverName} 未在运行中`)
      }

      // 停止服务器进程
      const serverProcess = serverProcesses.get(serverName)
      if (serverProcess && !serverProcess.killed) {
        logger.info(`正在停止服务器进程: ${serverName} (PID: ${serverProcess.pid})`)
        
        // 发送终止信号
        serverProcess.kill('SIGTERM')
        
        // 等待进程结束，最多等待5秒
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!serverProcess.killed) {
              logger.info(`强制终止服务器进程: ${serverName}`)
              serverProcess.kill('SIGKILL')
            }
            resolve()
          }, 5000)
          
          serverProcess.on('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        })
        
        serverProcesses.delete(serverName)
      }

      // 关闭日志流
      closeLogStream(serverName)

      // 删除CS2插件目录
      try {
        // 从全局配置读取cs2Path
        const configPath = join(homedir(), '.cssm', 'config.json')
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        const cs2Path = config?.game?.cs2?.path
        
        if (cs2Path) {
          const cs2Dir = dirname(cs2Path)
          const cs2PluginsPath = join(cs2Dir, '..', '..', 'csgo', 'addons', 'counterstrikesharp', 'plugins')
          
          if (existsSync(cs2PluginsPath)) {
            const { rm } = await import('fs/promises')
            await rm(cs2PluginsPath, { recursive: true, force: true })
            logger.info(`已删除CS2插件目录: ${cs2PluginsPath}`)
          }
        } else {
          logger.info('CS2路径未配置，跳过插件目录删除')
        }
      } catch (error) {
        logger.error('删除CS2插件目录失败', error)
      }

    // 更新服务器状态
    const updates = {
      status: 'offline',
      pid: -1,
      lastStopped: new Date().toISOString()
    }

    await updateServerStatus(paths.serverJson, servers, serverIndex, updates)

    logger.info(`服务器 ${serverName} 已成功停止`)
    return { success: true, message: `服务器 ${serverName} 已停止` }

  } catch (error) {
    logger.error(`停止服务器 ${serverName} 失败`, error)
    return { success: false, message: error.message }
  }
})

  // 删除服务器
  ipcMain.handle('delete-server', async (_event, serverName) => {
    try {
      const serverJsonPath = join(homedir(), '.cssm', 'server.json')
      
      // 读取服务器配置
      const serverData = await readFileAsync(serverJsonPath, 'utf-8')
      const servers = JSON.parse(serverData)
      
      if (!Array.isArray(servers)) {
        throw new Error('服务器配置格式无效')
      }
      
      const serverIndex = servers.findIndex(s => s.name === serverName)
      if (serverIndex === -1) {
        throw new Error(`服务器 ${serverName} 不存在`)
      }
      
      const server = servers[serverIndex]
      
      // 如果服务器正在运行，先停止它
      if (server.status === 'running' && server.pid !== -1) {
        try {
          process.kill(server.pid, 'SIGTERM')
          // 等待进程终止
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              try {
                process.kill(server.pid, 'SIGKILL')
              } catch (killError) {
                console.log('Process may have already terminated:', killError.message)
              }
              resolve()
            }, 3000)
            
            const checkInterval = setInterval(() => {
              try {
                process.kill(server.pid, 0)
              } catch {
                clearTimeout(timeout)
                clearInterval(checkInterval)
                resolve()
              }
            }, 100)
          })
        } catch (error) {
          console.log('Process may have already terminated:', error.message)
        }
        
        // 清理进程引用和日志流
        closeLogStream(serverName)
        serverProcesses.delete(serverName)
        serverProcesses.delete(serverName + '_meta')
      }
      
      // 从数组中删除服务器
      servers.splice(serverIndex, 1)
      
      // 保存更新后的配置
      await writeFileAsync(serverJsonPath, JSON.stringify(servers, null, 2), 'utf-8')
      
      logger.info(`服务器 ${serverName} 已删除`)
      return { success: true, message: '服务器删除成功' }
      
    } catch (error) {
      logger.error('删除服务器失败', error)
      throw error
    }
  })

  // 插件管理 APIs
  ipcMain.handle('get-server-plugins', async (_event, serverName) => {
    try {
      const configPath = join(homedir(), '.cssm', 'config.json')
      let globalPath = join(homedir(), '.cssm')
      
      // 尝试读取全局配置路径
      try {
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.global && config.global.path) {
          globalPath = config.global.path
        }
      } catch (error) {
        console.log('使用默认路径，配置文件读取失败:', error.message)
      }
      
      const pluginsPath = join(globalPath, 'server', serverName, 'plugins', 'addons')
      
      // 检查插件目录是否存在，不存在则创建
      if (!existsSync(pluginsPath)) {
        try {
          await mkdirAsync(pluginsPath, { recursive: true })
          logger.info(`已创建服务器 ${serverName} 的插件目录: ${pluginsPath}`)
        } catch (error) {
          logger.error(`创建插件目录失败: ${error.message}`)
          return []
        }
        return []
      }
      
      const { readdir } = await import('fs/promises')
      const items = await readdir(pluginsPath, { withFileTypes: true })
      
      const plugins = items
        .filter(item => item.isDirectory())
        .map(item => {
          const name = item.name
          const enabled = !name.endsWith('.off')
          const displayName = enabled ? name : name.replace(/\.off$/, '')
          
          return {
            name: displayName,
            enabled: enabled,
            originalName: name
          }
        })
      
      return plugins
    } catch (error) {
      console.error('获取插件列表失败:', error)
      return []
    }
  })
  
  ipcMain.handle('toggle-server-plugin', async (_event, serverName, pluginName, enable) => {
    try {
      const configPath = join(homedir(), '.cssm', 'config.json')
      let globalPath = join(homedir(), '.cssm')
      
      // 尝试读取全局配置路径
      try {
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.global && config.global.path) {
          globalPath = config.global.path
        }
      } catch (error) {
        console.log('使用默认路径，配置文件读取失败:', error.message)
      }
      
      const pluginsPath = join(globalPath, 'server', serverName, 'plugins', 'addons')
      const currentPath = enable ? join(pluginsPath, pluginName + '.off') : join(pluginsPath, pluginName)
      const targetPath = enable ? join(pluginsPath, pluginName) : join(pluginsPath, pluginName + '.off')
      
      // 检查源路径是否存在
      if (!existsSync(currentPath)) {
        throw new Error(`插件 ${pluginName} 不存在`)
      }
      
      // 重命名文件夹
      const { rename } = await import('fs/promises')
      await rename(currentPath, targetPath)
      
      return { success: true }
    } catch (error) {
      console.error('切换插件状态失败:', error)
      return { success: false, message: error.message }
    }
  })
  
  ipcMain.handle('delete-server-plugin', async (_event, serverName, pluginName) => {
    try {
      const configPath = join(homedir(), '.cssm', 'config.json')
      let globalPath = join(homedir(), '.cssm')
      
      // 尝试读取全局配置路径
      try {
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.global && config.global.path) {
          globalPath = config.global.path
        }
      } catch (error) {
        console.log('使用默认路径，配置文件读取失败:', error.message)
      }
      
      const pluginsPath = join(globalPath, 'server', serverName, 'plugins', 'addons')
      
      // 查找插件文件夹（可能是启用状态或禁用状态）
      const enabledPath = join(pluginsPath, pluginName)
      const disabledPath = join(pluginsPath, pluginName + '.off')
      
      let targetPath = null
      if (existsSync(enabledPath)) {
        targetPath = enabledPath
      } else if (existsSync(disabledPath)) {
        targetPath = disabledPath
      } else {
        throw new Error(`插件 ${pluginName} 不存在`)
      }
      
      // 删除文件夹
      const { rm } = await import('fs/promises')
      await rm(targetPath, { recursive: true, force: true })
      
      return { success: true }
    } catch (error) {
      console.error('删除插件失败:', error)
      return { success: false, message: error.message }
    }
  })

  // 打开插件目录
  ipcMain.handle('open-plugin-folder', async (_event, serverName) => {
    try {
      const configPath = join(homedir(), '.cssm', 'config.json')
      let globalPath = join(homedir(), '.cssm')
      
      // 尝试读取全局配置路径
      try {
        const configData = readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.global && config.global.path) {
          globalPath = config.global.path
        }
      } catch (error) {
        console.log('使用默认路径，配置文件读取失败:', error.message)
      }
      
      const pluginsPath = join(globalPath, 'server', serverName, 'plugins', 'addons')
      
      // 确保目录存在
      if (!existsSync(pluginsPath)) {
        await mkdirAsync(pluginsPath, { recursive: true })
      }
      
      // 打开目录
       await shell.openPath(pluginsPath)
      
      return { success: true, message: '插件目录已打开' }
    } catch (error) {
      console.error('打开插件目录失败:', error)
      return { success: false, message: error.message }
    }
  })

// 打开外部链接
ipcMain.handle('open-external', async (_event, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('打开外部链接失败:', error)
    return { success: false, message: error.message }
  }
})

// System APIs
  ipcMain.handle('get-user-data-path', () => {
    return homedir()
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

