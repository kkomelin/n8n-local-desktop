import './shared'

const version = new URLSearchParams(location.search).get('version')
if (version)
  (document.getElementById('version') as HTMLElement).textContent =
    `v${version}`

const statusEl = document.getElementById('status-text') as HTMLElement
const logLineEl = document.getElementById('log-line') as HTMLElement
const loaderEl = document.getElementById('loader') as HTMLElement
const retryWrap = document.getElementById('retry-wrap') as HTMLElement
const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement

let cleanupStatus: (() => void) | undefined
let cleanupLog: (() => void) | undefined
let cleanupError: (() => void) | undefined

function setStatus(text: string): void {
  statusEl.textContent = text
  statusEl.classList.remove('error')
  loaderEl.classList.remove('error')
  retryWrap.classList.remove('visible')
}

function showLog(text: string): void {
  logLineEl.textContent = text
}

function setError(text: string): void {
  statusEl.textContent = text
  statusEl.classList.add('error')
  loaderEl.classList.add('error')
  retryWrap.classList.add('visible')
}

function bindListeners(): void {
  if (!window.electronAPI) return
  cleanupStatus = window.electronAPI.onStatusUpdate(setStatus)
  cleanupLog = window.electronAPI.onLogLine(showLog)
  cleanupError = window.electronAPI.onError(setError)
}

function unbindListeners(): void {
  cleanupStatus?.()
  cleanupLog?.()
  cleanupError?.()
}

bindListeners()

retryBtn.addEventListener('click', () => {
  unbindListeners()
  window.electronAPI?.retry()
  setStatus('retrying…')
  logLineEl.textContent = ''
  retryWrap.classList.remove('visible')
  bindListeners()
})

closeBtn.addEventListener('click', () => window.electronAPI?.quit())
