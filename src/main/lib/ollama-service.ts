import { spawn } from 'node:child_process'
import { cleanProgressLine } from './progress-cleaner'

const PROJECT_NAME = 'lonelynathan'

export const MODEL_NAME_RE = /^[a-zA-Z0-9:.\-/]+$/

interface InitOptions {
  composePath: string
  dataDir: string
}

interface ExecResult {
  code: number
  stdout: string
}

export interface ModelInfo {
  name: string
  size: string
  modified: string
}

export interface OllamaStatus {
  running: boolean
}

export interface ListModelsResult {
  models?: ModelInfo[]
  error?: string
}

export interface DeleteModelResult {
  success?: true
  error?: string
}

let _composePath: string | null = null
let _dataDir: string | null = null

export function init({ composePath, dataDir }: InitOptions): void {
  _composePath = composePath
  _dataDir = dataDir
}

function _baseArgs(): string[] {
  return [
    'compose',
    '--file',
    _composePath!,
    '--project-name',
    PROJECT_NAME,
    '--project-directory',
    _dataDir!,
    'exec',
    '-T',
    'ollama',
  ]
}

function _execCapture(cmd: string[]): Promise<ExecResult> {
  return new Promise((resolve) => {
    const proc = spawn('docker', [..._baseArgs(), ...cmd])

    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', () => {})

    proc.on('close', (code) => resolve({ code: code ?? -1, stdout }))
    proc.on('error', () => resolve({ code: -1, stdout }))
  })
}

function _execStream(
  cmd: string[],
  onChunk: (line: string) => void,
  signal?: AbortSignal
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('docker', [..._baseArgs(), ...cmd])

    if (signal) {
      signal.addEventListener('abort', () => proc.kill('SIGTERM'), {
        once: true,
      })
    }

    const feed = (d: Buffer) => {
      for (const line of d.toString().split(/[\n\r]+/)) {
        const clean = cleanProgressLine(line)
        if (clean) onChunk(clean)
      }
    }

    proc.stdout.on('data', feed)
    proc.stderr.on('data', feed)

    proc.on('close', (code) => resolve(code ?? -1))
    proc.on('error', () => resolve(-1))
  })
}

export async function checkStatus(): Promise<OllamaStatus> {
  try {
    const { code } = await _execCapture(['ollama', 'list'])
    return { running: code === 0 }
  } catch {
    return { running: false }
  }
}

export async function listModels(): Promise<ListModelsResult> {
  try {
    const { code, stdout } = await _execCapture(['ollama', 'list'])
    if (code !== 0) return { error: 'Ollama is not running' }

    const lines = stdout.trim().split('\n').slice(1)
    const models = lines
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.trim().split(/\s{2,}/)
        return {
          name: parts[0] || '',
          size: parts[2] || '',
          modified: parts[3] || '',
        }
      })
      .filter((m) => m.name)

    return { models }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export function pullModel(
  name: string,
  onChunk: (line: string) => void,
  signal?: AbortSignal
): Promise<number> {
  return _execStream(['ollama', 'pull', name], onChunk, signal)
}

export async function deleteModel(name: string): Promise<DeleteModelResult> {
  try {
    const { code } = await _execCapture(['ollama', 'rm', name])
    if (code !== 0) return { error: `Failed to delete model "${name}"` }
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
