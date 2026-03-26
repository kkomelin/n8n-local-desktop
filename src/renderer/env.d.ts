interface PullProgressData {
  name: string
  line: string
}

interface PullDoneData {
  name: string
  success: boolean
  error?: string
}

interface ModelInfo {
  name: string
  size: string
  modified: string
}

interface OllamaStatus {
  running: boolean
}

interface ListModelsResult {
  models?: ModelInfo[]
  error?: string
}

interface DeleteModelResult {
  success?: true
  error?: string
}

interface ElectronAPI {
  onStatusUpdate: (cb: (text: string) => void) => () => void
  onLogLine: (cb: (text: string) => void) => () => void
  onError: (cb: (text: string) => void) => () => void
  getTheme: () => Promise<string | null>
  onThemeChange: (cb: (theme: string) => void) => () => void
  retry: () => void
  quit: () => void
  openExternal: (url: string) => void
  ollamaStatus: () => Promise<OllamaStatus>
  ollamaListModels: () => Promise<ListModelsResult>
  ollamaPullModel: (name: string) => Promise<{ success: boolean }>
  ollamaCancelPull: (name: string) => Promise<{ success: boolean }>
  ollamaDeleteModel: (name: string) => Promise<DeleteModelResult>
  onOllamaPullProgress: (cb: (data: PullProgressData) => void) => () => void
  onOllamaPullDone: (cb: (data: PullDoneData) => void) => () => void
}

declare interface Window {
  electronAPI?: ElectronAPI
}
