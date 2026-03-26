import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (cb: (text: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on('status-update', handler)
    return () => ipcRenderer.removeListener('status-update', handler)
  },
  onLogLine: (cb: (text: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on('log-line', handler)
    return () => ipcRenderer.removeListener('log-line', handler)
  },
  onError: (cb: (text: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on('error', handler)
    return () => ipcRenderer.removeListener('error', handler)
  },
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChange: (cb: (theme: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, theme: string) => cb(theme)
    ipcRenderer.on('theme-change', handler)
    return () => ipcRenderer.removeListener('theme-change', handler)
  },
  onGpuPrompt: (cb: (gpu: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, gpu: string) => cb(gpu)
    ipcRenderer.on('gpu:prompt', handler)
    return () => ipcRenderer.removeListener('gpu:prompt', handler)
  },
  sendGpuChoice: (choice: string) => ipcRenderer.send('gpu:choice', choice),
  retry: () => ipcRenderer.send('retry'),
  quit: () => ipcRenderer.send('quit-app'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
  ollamaListModels: () => ipcRenderer.invoke('ollama:list'),
  ollamaPullModel: (name: string) => ipcRenderer.invoke('ollama:pull', name),
  ollamaCancelPull: (name: string) => ipcRenderer.invoke('ollama:cancel', name),
  ollamaDeleteModel: (name: string) =>
    ipcRenderer.invoke('ollama:delete', name),
  onOllamaPullProgress: (
    cb: (data: { name: string; line: string }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { name: string; line: string }
    ) => cb(data)
    ipcRenderer.on('ollama:pull-progress', handler)
    return () => ipcRenderer.removeListener('ollama:pull-progress', handler)
  },
  onOllamaPullDone: (
    cb: (data: { name: string; success: boolean; error?: string }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { name: string; success: boolean; error?: string }
    ) => cb(data)
    ipcRenderer.on('ollama:pull-done', handler)
    return () => ipcRenderer.removeListener('ollama:pull-done', handler)
  },
})
