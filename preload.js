const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (cb) => {
    const handler = (_e, text) => cb(text)
    ipcRenderer.on('status-update', handler)
    return () => ipcRenderer.removeListener('status-update', handler)
  },
  onLogLine: (cb) => {
    const handler = (_e, text) => cb(text)
    ipcRenderer.on('log-line', handler)
    return () => ipcRenderer.removeListener('log-line', handler)
  },
  onError: (cb) => {
    const handler = (_e, text) => cb(text)
    ipcRenderer.on('error', handler)
    return () => ipcRenderer.removeListener('error', handler)
  },
  retry: () => ipcRenderer.send('retry'),
  quit: () => ipcRenderer.send('quit-app'),
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Ollama model management
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
  ollamaListModels: () => ipcRenderer.invoke('ollama:list'),
  ollamaPullModel: (name) => ipcRenderer.invoke('ollama:pull', name),
  ollamaCancelPull: (name) => ipcRenderer.invoke('ollama:cancel', name),
  ollamaDeleteModel: (name) => ipcRenderer.invoke('ollama:delete', name),
  onOllamaPullProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('ollama:pull-progress', handler)
    return () => ipcRenderer.removeListener('ollama:pull-progress', handler)
  },
  onOllamaPullDone: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('ollama:pull-done', handler)
    return () => ipcRenderer.removeListener('ollama:pull-done', handler)
  },
})
