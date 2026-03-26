import './shared'
import { LINKS } from './config'

const params = new URLSearchParams(location.search)

const version = params.get('version')
if (version)
  (document.getElementById('version') as HTMLElement).textContent =
    `v${version}`

const authorLink = document.getElementById('author-link') as HTMLAnchorElement
authorLink.addEventListener('click', (e) => {
  e.preventDefault()
  window.electronAPI?.openExternal(LINKS.author)
})

const homepage = params.get('homepage')
if (homepage) {
  const websiteLink = document.getElementById(
    'website-link'
  ) as HTMLAnchorElement
  websiteLink.addEventListener('click', (e) => {
    e.preventDefault()
    window.electronAPI?.openExternal(homepage)
  })
}

const sourceLink = document.getElementById('source-link') as HTMLAnchorElement
sourceLink.addEventListener('click', (e) => {
  e.preventDefault()
  window.electronAPI?.openExternal(LINKS.source)
})
