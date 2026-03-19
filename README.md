# n8n Local Desktop

[![Release](https://img.shields.io/github/v/release/kkomelin/n8n-local-desktop)](https://github.com/kkomelin/n8n-local-desktop/releases)
[![Build](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Desktop Electron app that runs [n8n](https://n8n.io/) + [Ollama](https://ollama.com/) locally via Docker.

![Screenshot](assets/screenshot.png)

**[🚀 Download for your OS](https://github.com/kkomelin/n8n-local-desktop/releases)**

> Docker is required — see [official installation docs](https://docs.docker.com/engine/install/) for platform-specific instructions.


## AI Models

On first launch, the `gemma3:4b` model (~3-4 GB) is automatically downloaded and configured for use in n8n LLM workflows.

To install additional Ollama models, launch the app first, then run:

```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull <model-name>
```

For example:
```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull llama3.2:3b
```

Browse available models at [ollama.com/library](https://ollama.com/library).

---

For development setup, build instructions, and release process, see [docs/development.md](docs/development.md).
