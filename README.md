# n8n Local Desktop (unofficial)

[![Release](https://img.shields.io/github/v/release/kkomelin/n8n-local-desktop)](https://github.com/kkomelin/n8n-local-desktop/releases)
[![Build](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml)

Desktop Electron wrapper that runs [n8n](https://n8n.io/) + [Ollama](https://ollama.com/) locally via Docker.

**[🚀 Download for your OS](https://github.com/kkomelin/n8n-local-desktop/releases)**

> Docker is required — see [official installation docs](https://docs.docker.com/engine/install/) for platform-specific instructions.

## Development

### How it works

A loader screen shows live Docker output while images are pulled and services start.
Once n8n responds on `http://localhost:5678/healthz`, the loader transitions to the main app window.
Closing the window runs `docker compose down` and stops both services.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [Docker](https://docs.docker.com/engine/install/)

### Setup

```bash
pnpm install
```

### Run

```bash
pnpm start
```

The app will:

1. Pull `docker.n8n.io/n8nio/n8n` and `ollama/ollama`
2. Start both services via Docker Compose
3. Open n8n in an Electron window once ready

Data is persisted in the app's user data directory:

| Folder | Contents |
|---|---|
| `n8n-data` | n8n workflows, credentials, config |
| `n8n-files` | Additional files for n8n |
| `n8n-custom` | Custom n8n nodes (auto-loaded on startup) |
| `ollama-data` | Ollama models and config |

### First-run setup

On the first launch, the app automatically:

1. Creates an Ollama credential pre-configured to connect to `http://ollama:11434`
2. Downloads the `gemma3:4b` model for LLM workflows (~3-4 GB download)

The credential and model persist across launches — no manual setup required.

### Installing additional Ollama models

To download more models, run:

```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull <model-name>
```

For example:
```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull llama3.2:3b
```

Browse available models at [ollama.com/library](https://ollama.com/library).

### Build

```bash
pnpm build          # current platform
pnpm build:linux    # AppImage + deb
pnpm build:mac      # dmg
pnpm build:win      # nsis installer
```

Output goes to the `dist/` folder.

### Release

Push a version tag to build all platforms and create a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

You can also trigger a build manually from the Actions tab without creating a release.
