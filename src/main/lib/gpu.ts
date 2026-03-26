import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export type GpuType = 'cpu' | 'amd' | 'nvidia'

export function detectGpu(): GpuType {
  try {
    execSync('nvidia-smi', { stdio: 'ignore', timeout: 5000 })
    return 'nvidia'
  } catch {}

  if (process.platform === 'linux' && fs.existsSync('/dev/kfd')) {
    return 'amd'
  }

  try {
    execSync('rocm-smi', { stdio: 'ignore', timeout: 5000 })
    return 'amd'
  } catch {}

  return 'cpu'
}

function preferencePath(): string {
  return path.join(app.getPath('userData'), '.gpu-preference')
}

export function loadGpuPreference(): GpuType | null {
  try {
    const val = fs.readFileSync(preferencePath(), 'utf8').trim()
    if (val === 'nvidia' || val === 'amd' || val === 'cpu') return val
    return null
  } catch {
    return null
  }
}

export function saveGpuPreference(gpu: GpuType): void {
  fs.writeFileSync(preferencePath(), gpu)
}
