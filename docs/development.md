# Development

## How it works

A loader screen shows live Docker output while images are pulled and services start.
Once n8n responds on `http://localhost:5678`, the loader transitions to the main app window.
Closing the window runs `docker compose down` and stops both services.

## Prerequisites

- [Node.js](https://nodejs.org/) (v24+)
- [pnpm](https://pnpm.io/)
- [Docker](https://docs.docker.com/engine/install/)

## Setup

```bash
pnpm install
```

## Run

```bash
pnpm start
```

The app will:

1. Pull `docker.n8n.io/n8nio/n8n` and `ollama/ollama`
2. Start both services via Docker Compose
3. [first launch] Create an Ollama credential pre-configured to connect to `http://ollama:11434`
4. [first launch] Download the `llama3.2:3b` model for LLM workflows (~2 GB download)
3. Open n8n in an Electron window once ready

Data is persisted in the app's user data directory:

| Folder | Contents |
|---|---|
| `n8n-data` | n8n workflows, credentials, config |
| `n8n-files` | Additional files for n8n |
| `n8n-custom` | Custom n8n nodes (auto-loaded on startup) |
| `ollama-data` | Ollama models and config |

## Build

```bash
pnpm build          # current platform
pnpm build:linux    # AppImage + deb
pnpm build:mac      # dmg
pnpm build:win      # nsis installer
```

Output goes to the `dist/` folder.

## Release

Push a version tag to build all platforms and create a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

You can also trigger a build manually from the Actions tab without creating a release.
