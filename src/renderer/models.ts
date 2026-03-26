import './shared'
import { LINKS } from './config'

interface CuratedModel {
  name: string
  size: string
  desc: string
}

const CURATED_MODELS: CuratedModel[] = [
  { name: 'llama3.2:3b', size: '~2.0 GB', desc: 'Meta, lightweight' },
  { name: 'gemma3:4b', size: '~3.3 GB', desc: 'Google, fast & capable' },
  {
    name: 'gemma3n:e2b',
    size: '~5.6 GB',
    desc: 'Google, efficient multimodal',
  },
  { name: 'phi4-mini', size: '~2.5 GB', desc: 'Microsoft, efficient' },
  { name: 'mistral', size: '~4.4 GB', desc: 'Mistral AI, balanced' },
  { name: 'deepseek-r1:7b', size: '~4.7 GB', desc: 'Strong reasoning' },
  { name: 'qwen2.5:3b', size: '~1.9 GB', desc: 'Alibaba, multilingual' },
  { name: 'codellama:7b', size: '~3.8 GB', desc: 'Meta, code-focused' },
  {
    name: 'nomic-embed-text',
    size: '~274 MB',
    desc: 'Embeddings for vector stores',
  },
]

const MODEL_NAME_RE = /^[a-zA-Z0-9:.\-/]+$/

const normalizeName = (n: string) =>
  n.endsWith(':latest') ? n.slice(0, -7) : n

let installedNames = new Set<string>()
let isPulling = false
let currentPullName: string | null = null

const $ = (id: string) => document.getElementById(id) as HTMLElement

const loadingEl = $('loading-state')
const mainEl = $('main-content')
const bannerEl = $('offline-banner')
const modelListEl = $('model-list')
const emptyEl = $('empty-state')
const inputEl = $('model-input') as HTMLInputElement
const btnInstall = $('btn-install') as HTMLButtonElement
const progressEl = $('progress-wrap')
const fillEl = $('progress-fill') as HTMLElement
const progressTxt = $('progress-text')
const btnCancel = $('btn-cancel') as HTMLButtonElement
const chipsEl = $('chips')
const btnBrowseModels = $('btn-browse-models') as HTMLButtonElement

type AppState = 'loading' | 'offline' | 'ready' | 'pulling'

function applyState(state: AppState): void {
  loadingEl.style.display = state === 'loading' ? 'flex' : 'none'
  mainEl.style.display = state !== 'loading' ? 'block' : 'none'
  bannerEl.classList.toggle('visible', state === 'offline')

  const frozen = state === 'offline' || state === 'pulling'
  inputEl.disabled = frozen
  btnInstall.disabled = frozen || !isValidName(inputEl.value)

  document.querySelectorAll<HTMLButtonElement>('.chip').forEach((c) => {
    if (!c.classList.contains('installed')) c.disabled = frozen
  })
  document.querySelectorAll<HTMLButtonElement>('.btn-delete').forEach((b) => {
    b.disabled = state === 'pulling'
  })
}

function isValidName(v: string): boolean {
  return MODEL_NAME_RE.test(v.trim()) && v.trim().length > 0
}

function renderModels(models: ModelInfo[]): void {
  installedNames = new Set(models.map((m) => normalizeName(m.name)))

  modelListEl
    .querySelectorAll('.model-row, .confirm-row')
    .forEach((el) => el.remove())
  emptyEl.style.display = models.length ? 'none' : ''

  for (const m of models) {
    const row = document.createElement('div')
    row.className = 'model-row'
    row.dataset.name = m.name

    const nameSpan = document.createElement('span')
    nameSpan.className = 'model-name'
    nameSpan.textContent = m.name

    const sizeSpan = document.createElement('span')
    sizeSpan.className = 'model-size'
    sizeSpan.textContent = m.size

    const delBtn = document.createElement('button')
    delBtn.className = 'btn-delete'
    delBtn.title = 'Remove model'
    delBtn.textContent = '✕'
    delBtn.addEventListener('click', () => showConfirm(m.name))

    row.append(nameSpan, sizeSpan, delBtn)
    modelListEl.appendChild(row)
  }

  renderChips()
}

function renderChips(): void {
  chipsEl.innerHTML = ''
  for (const model of CURATED_MODELS) {
    const installed = installedNames.has(model.name)
    const chip = document.createElement('button')
    chip.className = `chip${installed ? ' installed' : ''}`
    chip.disabled = installed || isPulling

    const nameSpan = document.createElement('span')
    nameSpan.className = 'chip-name'
    nameSpan.textContent = model.name

    const metaSpan = document.createElement('span')
    metaSpan.className = 'chip-meta'
    metaSpan.textContent = `${model.size} · ${model.desc}`

    chip.append(nameSpan, metaSpan)

    if (!installed) {
      chip.addEventListener('click', () => {
        inputEl.value = model.name
        startPull(model.name)
      })
    }
    chipsEl.appendChild(chip)
  }
}

function showConfirm(name: string): void {
  modelListEl.querySelectorAll('.confirm-row').forEach((el) => el.remove())

  const row = modelListEl.querySelector(`[data-name="${CSS.escape(name)}"]`)
  if (!row) return

  const confirm = document.createElement('div')
  confirm.className = 'confirm-row'

  const msg = document.createElement('span')
  msg.textContent = `delete ${name}?`

  const yes = document.createElement('button')
  yes.className = 'btn-confirm-yes'
  yes.textContent = 'yes'
  yes.addEventListener('click', () => doDelete(name))

  const no = document.createElement('button')
  no.className = 'btn-confirm-no'
  no.textContent = 'no'
  no.addEventListener('click', () => confirm.remove())

  confirm.append(msg, yes, no)
  row.after(confirm)
}

async function doDelete(name: string): Promise<void> {
  const result = await window.electronAPI!.ollamaDeleteModel(name)
  if (result.error) {
    console.error('Delete failed:', result.error)
    return
  }
  const data = await window.electronAPI!.ollamaListModels()
  if (data.models) renderModels(data.models)
}

async function startPull(name: string): Promise<void> {
  if (!isValidName(name) || isPulling) return

  isPulling = true
  currentPullName = name
  progressEl.classList.add('visible')
  fillEl.style.width = '0%'
  progressTxt.textContent = 'Starting…'
  applyState('pulling')

  await window.electronAPI!.ollamaPullModel(name)
}

function onProgress({ name, line }: PullProgressData): void {
  if (name !== currentPullName) return

  progressTxt.textContent = line

  const m = line.match(/(\d+)%/)
  if (m) fillEl.style.width = `${m[1]}%`
}

async function onPullDone({ success }: PullDoneData): Promise<void> {
  isPulling = false
  currentPullName = null
  progressEl.classList.remove('visible')
  inputEl.value = ''

  const data = await window.electronAPI!.ollamaListModels()
  if (data.models) renderModels(data.models)

  applyState('ready')

  if (!success) progressTxt.textContent = 'Install failed.'
}

async function init(): Promise<void> {
  applyState('loading')

  const status = await window.electronAPI!.ollamaStatus()
  if (!status.running) {
    applyState('offline')
    return
  }

  const data = await window.electronAPI!.ollamaListModels()
  if (data.error) {
    applyState('offline')
    return
  }

  renderModels(data.models ?? [])
  applyState('ready')
}

const cleanupProgress = window.electronAPI!.onOllamaPullProgress(onProgress)
const cleanupDone = window.electronAPI!.onOllamaPullDone(onPullDone)

window.addEventListener('unload', () => {
  cleanupProgress()
  cleanupDone()
})

inputEl.addEventListener('input', () => {
  btnInstall.disabled = isPulling || !isValidName(inputEl.value)
})

inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !btnInstall.disabled) startPull(inputEl.value.trim())
})

btnInstall.addEventListener('click', () => {
  const name = inputEl.value.trim()
  if (isValidName(name)) startPull(name)
})

btnCancel.addEventListener('click', async () => {
  if (currentPullName)
    await window.electronAPI!.ollamaCancelPull(currentPullName)
})

btnBrowseModels.addEventListener('click', () => {
  window.electronAPI!.openExternal(LINKS.modelsBrowser)
})

init()
