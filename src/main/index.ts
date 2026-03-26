import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import type { MenuItemConstructorOptions } from 'electron'
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell } from 'electron'
import { DOCKER_PROJECT_NAME, LINKS } from './config'
import {
  type GpuType,
  detectGpu,
  loadGpuPreference,
  saveGpuPreference,
} from './lib/gpu'
import * as ollamaService from './lib/ollama-service'
import { cleanProgressLine } from './lib/progress-cleaner'

function getAssetPath(...parts: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', ...parts)
    : path.join(__dirname, '../..', 'assets', ...parts)
}

const iconPath =
  process.platform === 'win32'
    ? getAssetPath('windows', 'icon.ico')
    : process.platform === 'linux'
      ? getAssetPath('linux', 'icons', '512x512.png')
      : undefined

const PORT = 5678
const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 180_000
const ALLOWED_ORIGIN = `http://localhost:${PORT}`

let loaderWindow: BrowserWindow | null = null
let modelsWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null
let currentTheme: string | null = null
let themeInterval: ReturnType<typeof setInterval> | null = null
let composeProcess: ReturnType<typeof spawn> | null = null
let composePath: string
let dataDir: string
let gpuType: GpuType = 'cpu'

const activePulls = new Map<string, AbortController>()

const isDev = !app.isPackaged

// ── Theme sync ──

const DETECT_THEME_JS = `(() => {
  const html = document.documentElement
  const body = document.body
  for (const el of [html, body]) {
    if (el.classList.contains('theme-dark') || el.classList.contains('dark')) return 'dark'
    if (el.classList.contains('theme-light') || el.classList.contains('light')) return 'light'
    const attr = el.getAttribute('data-theme')
    if (attr === 'dark') return 'dark'
    if (attr === 'light') return 'light'
  }
  try {
    for (const key of ['N8N_THEME', 'n8n-theme', 'theme']) {
      const v = localStorage.getItem(key)
      if (v === 'dark') return 'dark'
      if (v === 'light') return 'light'
    }
  } catch (_) {}
  const bg = getComputedStyle(body).backgroundColor
  const m = bg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/)
  if (m) return 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] < 128 ? 'dark' : 'light'
  return null
})()`

function themeFilePath(): string {
  return path.join(app.getPath('userData'), '.n8n-theme')
}

function loadPersistedTheme(): string | null {
  try {
    const t = fs.readFileSync(themeFilePath(), 'utf8').trim()
    return t === 'dark' || t === 'light' ? t : null
  } catch {
    return null
  }
}

function pushTheme(theme: string): void {
  try {
    fs.writeFileSync(themeFilePath(), theme)
  } catch {}
  for (const win of [loaderWindow, modelsWindow, aboutWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send('theme-change', theme)
  }
}

function startThemePolling(webContents: Electron.WebContents): void {
  themeInterval = setInterval(async () => {
    try {
      if (webContents.isDestroyed()) {
        if (themeInterval) clearInterval(themeInterval)
        return
      }
      const theme = await webContents.executeJavaScript(DETECT_THEME_JS)
      if (theme && theme !== currentTheme) {
        currentTheme = theme
        pushTheme(theme)
      }
    } catch (_) {}
  }, 1000)
}

// ── IPC helpers ──

function sendStatus(text: string): void {
  if (isDev) console.log(`[status] ${text}`)
  loaderWindow?.webContents.send('status-update', text)
}

function sendLog(text: string): void {
  if (isDev) console.log(text.trimEnd())
  const lines = text.split('\n')
  for (const line of lines) {
    const cleaned = cleanProgressLine(line.trimEnd())
    if (cleaned) loaderWindow?.webContents.send('log-line', cleaned)
  }
}

function sendError(text: string): void {
  if (isDev) console.error(`[error] ${text}`)
  loaderWindow?.webContents.send('error', text)
}

// ── Window path helpers ──

function rendererFile(file: string): string {
  return path.join(__dirname, '../renderer', file)
}

function rendererUrl(file: string, params?: Record<string, string>): string {
  const base = `${process.env['ELECTRON_RENDERER_URL']}/${file}`
  if (!params) return base
  return `${base}?${new URLSearchParams(params)}`
}

// ── Loader window ──

function createLoaderWindow(): void {
  loaderWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#fafafa',
    show: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const version = app.getVersion()
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    loaderWindow.loadURL(rendererUrl('loader.html', { version }))
  } else {
    loaderWindow.loadFile(rendererFile('loader.html'), { query: { version } })
  }

  loaderWindow.once('ready-to-show', () => {
    loaderWindow!.show()
    startServices()
  })
}

// ── Docker / Compose helpers ──

function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

function composeOverridePath(): string {
  return composePath.replace(/\.yaml$/, `.${gpuType}.yaml`)
}

function composeArgs(subcommand: string, extra: string[] = []): string[] {
  return [
    'compose',
    '--file',
    composePath,
    '--file',
    composeOverridePath(),
    '--project-name',
    DOCKER_PROJECT_NAME,
    '--project-directory',
    dataDir,
    subcommand,
    ...extra,
  ]
}

function pullImages(): Promise<void> {
  return new Promise((resolve) => {
    sendStatus('Pulling latest Docker images…')

    const proc = spawn('docker', composeArgs('pull'))

    proc.stdout.on('data', (d: Buffer) => sendLog(d.toString()))
    proc.stderr.on('data', (d: Buffer) => sendLog(d.toString()))

    proc.on('close', (code) => {
      if (code !== 0) {
        sendLog(
          'Warning: image pull failed — will try starting with cached images.'
        )
      }
      resolve()
    })

    proc.on('error', (err) => {
      sendLog(`Warning: ${err.message}`)
      resolve()
    })
  })
}

function startCompose(): Promise<void> {
  return new Promise((resolve, reject) => {
    sendStatus('Starting services…')

    composeProcess = spawn('docker', composeArgs('up'))

    let started = false

    composeProcess.stdout?.on('data', (d: Buffer) => {
      sendLog(d.toString())
      if (!started) {
        started = true
        resolve()
      }
    })

    composeProcess.stderr?.on('data', (d: Buffer) => {
      sendLog(d.toString())
      if (!started) {
        started = true
        resolve()
      }
    })

    composeProcess.on('error', (err) => {
      if (!started) reject(err)
    })

    composeProcess.on('close', (code) => {
      if (!started) {
        reject(
          new Error(
            `docker compose up exited (code ${code}) before producing output`
          )
        )
      }
      composeProcess = null
    })

    setTimeout(() => {
      if (!started) {
        started = true
        resolve()
      }
    }, 5000)
  })
}

function waitForReady(): Promise<void> {
  sendStatus('Waiting for n8n to be ready…')
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > POLL_TIMEOUT) {
        return reject(new Error('Timed out waiting for n8n to start'))
      }

      const req = http.get(ALLOWED_ORIGIN, (res) => {
        if (
          res.statusCode === 200 ||
          (res.statusCode! >= 301 && res.statusCode! <= 308)
        ) {
          sendLog(`n8n is ready (HTTP ${res.statusCode})`)
          resolve()
        } else {
          setTimeout(check, POLL_INTERVAL)
        }
        res.resume()
      })

      req.on('error', () => setTimeout(check, POLL_INTERVAL))
      req.setTimeout(3000, () => {
        req.destroy()
        setTimeout(check, POLL_INTERVAL)
      })
    }

    check()
  })
}

function openApp(): void {
  sendStatus('Launching n8n…')

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ALLOWED_ORIGIN)) event.preventDefault()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ALLOWED_ORIGIN)) return { action: 'allow' }
    return { action: 'deny' }
  })

  mainWindow.loadURL(ALLOWED_ORIGIN)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    loaderWindow?.close()
    loaderWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (themeInterval) clearInterval(themeInterval)
    startThemePolling(mainWindow.webContents)
  })

  mainWindow.on('closed', () => {
    if (themeInterval) clearInterval(themeInterval)
    stopServices()
    app.quit()
  })
}

function stopServices(): void {
  composeProcess = null
  try {
    execSync(`docker compose --project-name ${DOCKER_PROJECT_NAME} down`, {
      stdio: 'ignore',
      timeout: 30_000,
    })
  } catch {
    // containers may already be gone
  }
}

// ── GPU preference ──

function resolveGpuPreference(): Promise<GpuType> {
  const saved = loadGpuPreference()
  if (saved) return Promise.resolve(saved)

  const detected = detectGpu()
  if (detected === 'cpu') {
    saveGpuPreference('cpu')
    return Promise.resolve('cpu')
  }

  return new Promise((resolve) => {
    loaderWindow?.webContents.send('gpu:prompt', detected)
    ipcMain.once('gpu:choice', (_e, choice: GpuType) => {
      saveGpuPreference(choice)
      resolve(choice)
    })
  })
}

// ── Main flow ──

function containerExec(service: string, cmd: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('docker', [
      'compose',
      '--file',
      composePath,
      '--project-name',
      DOCKER_PROJECT_NAME,
      '--project-directory',
      dataDir,
      'exec',
      '-T',
      service,
      ...cmd,
    ])

    proc.stdout.on('data', (d: Buffer) => sendLog(d.toString()))
    proc.stderr.on('data', (d: Buffer) => sendLog(d.toString()))

    proc.on('close', (code) => {
      sendLog(`[exec] exited ${code}`)
      resolve(code ?? -1)
    })

    proc.on('error', (err) => {
      sendLog(`[exec] error: ${err.message}`)
      resolve(-1)
    })
  })
}

async function setupOllamaCredential(): Promise<void> {
  const markerFile = path.join(dataDir, '.ollama-credentials-imported')
  if (fs.existsSync(markerFile)) {
    sendLog('[setup] Ollama credentials already imported, skipping.')
    return
  }

  sendStatus('Configuring Ollama connection…')

  const credentialsSrc = app.isPackaged
    ? path.join(process.resourcesPath, 'ollama-credentials.json')
    : path.join(__dirname, '../../ollama-credentials.json')

  const credentialsDest = path.join(
    dataDir,
    'n8n-files',
    'ollama-credentials.json'
  )

  try {
    fs.copyFileSync(credentialsSrc, credentialsDest)
    sendLog(`[setup] copied to ${credentialsDest}`)
  } catch (err) {
    sendLog(`[setup] copy failed: ${(err as Error).message}`)
    return
  }

  sendLog('[setup] checking file inside container…')
  await containerExec('n8n', [
    'sh',
    '-c',
    'ls -la /files/ollama-credentials.json && cat /files/ollama-credentials.json',
  ])

  await new Promise((r) => setTimeout(r, 3000))
  sendLog('[setup] importing credentials…')
  const exitCode = await containerExec('n8n', [
    'n8n',
    'import:credentials',
    '--input=/files/ollama-credentials.json',
  ])

  try {
    fs.unlinkSync(credentialsDest)
  } catch {}

  if (exitCode === 0) {
    fs.writeFileSync(markerFile, new Date().toISOString())
    sendLog('[setup] Ollama credentials imported successfully.')
  } else {
    sendLog(
      `[setup] WARNING: credential import exited with code ${exitCode} — Ollama connection may not be configured.`
    )
  }
}

async function waitForOllama(): Promise<void> {
  sendStatus('Waiting for Ollama to be ready…')
  const start = Date.now()
  const timeout = 60_000

  while (Date.now() - start < timeout) {
    const code = await containerExec('ollama', ['ollama', 'list'])
    if (code === 0) return
    await new Promise((r) => setTimeout(r, 2000))
  }

  throw new Error('Timed out waiting for Ollama')
}

async function pullOllamaModel(model: string): Promise<void> {
  sendStatus(`Checking for ${model} model…`)

  const checkCode = await containerExec('ollama', ['ollama', 'show', model])
  if (checkCode === 0) {
    sendLog(`[setup] ${model} already present, skipping pull.`)
    return
  }

  sendStatus(`Downloading ${model} model — this may take several minutes…`)
  const code = await containerExec('ollama', ['ollama', 'pull', model])

  if (code === 0) {
    sendLog(`[setup] ${model} downloaded successfully.`)
  } else {
    sendLog(
      `[setup] WARNING: failed to pull ${model} (exit ${code}) — you can pull it manually later.`
    )
  }
}

async function startServices(): Promise<void> {
  try {
    if (!dockerAvailable()) {
      sendError(
        'Docker is not installed or not running. Please install Docker and start it.'
      )
      return
    }

    gpuType = await resolveGpuPreference()
    sendLog(`[setup] GPU mode: ${gpuType}`)

    for (const dir of ['n8n-data', 'n8n-files', 'n8n-custom', 'ollama-data']) {
      fs.mkdirSync(path.join(dataDir, dir), { recursive: true })
    }

    sendLog('Checking for image updates…')
    await pullImages()

    await startCompose()
    await waitForReady()
    await setupOllamaCredential()
    await waitForOllama()
    await pullOllamaModel('llama3.2:3b')
    openApp()
  } catch (err) {
    sendLog(`Error: ${(err as Error).message}`)
    sendError(`Failed to start: ${(err as Error).message}`)
  }
}

// ── About window ──

function createAboutWindow(): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus()
    return
  }

  const win = new BrowserWindow({
    width: 360,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'About',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  aboutWindow = win
  win.on('closed', () => {
    aboutWindow = null
  })
  win.setMenu(null)

  const query = { version: app.getVersion(), homepage: LINKS.homepage }
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(rendererUrl('about.html', query))
  } else {
    win.loadFile(rendererFile('about.html'), { query })
  }
}

// ── Models window ──

function createModelsWindow(): void {
  if (modelsWindow && !modelsWindow.isDestroyed()) {
    modelsWindow.focus()
    return
  }

  modelsWindow = new BrowserWindow({
    width: 680,
    height: 580,
    minWidth: 560,
    minHeight: 480,
    resizable: true,
    title: 'Models',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  modelsWindow.setMenu(null)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    modelsWindow.loadURL(rendererUrl('models.html'))
  } else {
    modelsWindow.loadFile(rendererFile('models.html'))
  }

  modelsWindow.on('closed', () => {
    for (const [, ac] of activePulls) ac.abort()
    activePulls.clear()
    modelsWindow = null
  })
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' as const },
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    {
      label: 'Tools',
      submenu: [{ label: 'Models', click: createModelsWindow }],
    },
    { role: 'windowMenu' as const },
    {
      role: 'help' as const,
      submenu: [{ label: 'About', click: createAboutWindow }],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── App lifecycle ──

app.whenReady().then(() => {
  composePath = app.isPackaged
    ? path.join(process.resourcesPath, 'compose.yaml')
    : path.join(__dirname, '../../compose.yaml')

  dataDir = app.getPath('userData')

  ollamaService.init({ composePath, dataDir })

  currentTheme = loadPersistedTheme()

  buildMenu()
  createLoaderWindow()
})

app.on('window-all-closed', () => {
  stopServices()
  app.quit()
})

app.on('before-quit', stopServices)

ipcMain.on('retry', () => {
  stopServices()
  startServices()
})

ipcMain.on('quit-app', () => {
  stopServices()
  app.quit()
})

ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url)
})

// ── Ollama model management ──

ipcMain.handle('theme:get', () => currentTheme)

ipcMain.handle('ollama:status', async () => ollamaService.checkStatus())

ipcMain.handle('ollama:list', async () => ollamaService.listModels())

ipcMain.handle('ollama:pull', async (event, name: string) => {
  if (!ollamaService.MODEL_NAME_RE.test(name))
    return { error: 'Invalid model name' }

  const ac = new AbortController()
  activePulls.set(name, ac)

  try {
    await ollamaService.pullModel(
      name,
      (line) => event.sender.send('ollama:pull-progress', { name, line }),
      ac.signal
    )
    event.sender.send('ollama:pull-done', { name, success: true })
    return { success: true }
  } catch (err) {
    event.sender.send('ollama:pull-done', {
      name,
      success: false,
      error: (err as Error).message,
    })
    return { success: false }
  } finally {
    activePulls.delete(name)
  }
})

ipcMain.handle('ollama:cancel', async (_event, name: string) => {
  const ac = activePulls.get(name)
  if (ac) {
    ac.abort()
    activePulls.delete(name)
  }
  return { success: true }
})

ipcMain.handle('ollama:delete', async (_event, name: string) => {
  if (!ollamaService.MODEL_NAME_RE.test(name))
    return { error: 'Invalid model name' }
  return ollamaService.deleteModel(name)
})
