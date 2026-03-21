'use strict'

const { spawn } = require('child_process')
const { cleanProgressLine } = require('./progress-cleaner')

const PROJECT_NAME = 'n8n-ollama-desktop'

const MODEL_NAME_RE = /^[a-zA-Z0-9:.\-/]+$/

let _composePath = null
let _dataDir = null

function init({ composePath, dataDir }) {
  _composePath = composePath
  _dataDir = dataDir
}

// ── Private exec helpers ──

function _baseArgs() {
  return [
    'compose',
    '--file',
    _composePath,
    '--project-name',
    PROJECT_NAME,
    '--project-directory',
    _dataDir,
    'exec',
    '-T',
    'ollama',
  ]
}

function _execCapture(cmd) {
  return new Promise((resolve) => {
    const proc = spawn('docker', [..._baseArgs(), ...cmd])

    let stdout = ''
    proc.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', () => {})

    proc.on('close', (code) => resolve({ code, stdout }))
    proc.on('error', () => resolve({ code: -1, stdout }))
  })
}

function _execStream(cmd, onChunk, signal) {
  return new Promise((resolve) => {
    const proc = spawn('docker', [..._baseArgs(), ...cmd])

    if (signal) {
      signal.addEventListener('abort', () => proc.kill('SIGTERM'), {
        once: true,
      })
    }

    const feed = (d) => {
      for (const line of d.toString().split(/[\n\r]+/)) {
        const clean = cleanProgressLine(line)
        if (clean) onChunk(clean)
      }
    }

    proc.stdout.on('data', feed)
    proc.stderr.on('data', feed)

    proc.on('close', (code) => resolve(code))
    proc.on('error', () => resolve(-1))
  })
}

// ── Public API ──

async function checkStatus() {
  try {
    const { code } = await _execCapture(['ollama', 'list'])
    return { running: code === 0 }
  } catch {
    return { running: false }
  }
}

async function listModels() {
  try {
    const { code, stdout } = await _execCapture(['ollama', 'list'])
    if (code !== 0) return { error: 'Ollama is not running' }

    // Output: NAME  ID  SIZE  MODIFIED (header + rows, columns separated by 2+ spaces)
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
    return { error: err.message }
  }
}

function pullModel(name, onChunk, signal) {
  return _execStream(['ollama', 'pull', name], onChunk, signal)
}

async function deleteModel(name) {
  try {
    const { code } = await _execCapture(['ollama', 'rm', name])
    if (code !== 0) return { error: `Failed to delete model "${name}"` }
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

module.exports = {
  init,
  checkStatus,
  listModels,
  pullModel,
  deleteModel,
  MODEL_NAME_RE,
}
