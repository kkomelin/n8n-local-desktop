const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (cb) => {
    const handler = (_e, text) => cb(text);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  },
  onLogLine: (cb) => {
    const handler = (_e, text) => cb(text);
    ipcRenderer.on('log-line', handler);
    return () => ipcRenderer.removeListener('log-line', handler);
  },
  onError: (cb) => {
    const handler = (_e, text) => cb(text);
    ipcRenderer.on('error', handler);
    return () => ipcRenderer.removeListener('error', handler);
  },
  retry:        () => ipcRenderer.send('retry'),
  quit:         () => ipcRenderer.send('quit-app'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
