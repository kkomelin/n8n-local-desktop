# n8n Local Desktop

[![Release](https://img.shields.io/github/v/release/kkomelin/n8n-local-desktop)](https://github.com/kkomelin/n8n-local-desktop/releases)
[![Build](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/kkomelin/n8n-local-desktop/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Desktop Electron app that runs [n8n](https://n8n.io/) + [Ollama](https://ollama.com/) locally via Docker.

![Screenshot](assets/screenshot.png)

**[🚀 Download for your OS](https://github.com/kkomelin/n8n-local-desktop/releases)**

> Docker is required — see [official installation docs](https://docs.docker.com/engine/install/) for platform-specific instructions.


## AI Models

On first launch, the `llama3.2:3b` model (~2 GB) is automatically downloaded and configured for use in n8n LLM workflows.

To install additional Ollama models, use **Tools > Models** menu.

Alternatively, **launch the app first**, then run:

```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull <model-name>
```

For example:
```bash
docker exec -it n8n-local-desktop-ollama-1 ollama pull llama3.2:3b
```

Browse available models at [ollama.com/search](https://ollama.com/search).

## Connecting to Host LLM Servers

You can use LLM servers running directly on your machine, such as [LM Studio](https://lmstudio.ai/), [llama.cpp](https://github.com/ggerganov/llama.cpp) server, or a host-installed [Ollama](https://ollama.com/) instance, alongside or instead of the built-in Ollama container.

See [docs/host-llm-servers.md](docs/host-llm-servers.md) for setup instructions.

## Roadmap

- [x] Make it possible to connect with the host machine's LLM servers from n8n workflows, e.g. LM Studio, llama.cpp, Ollama, etc.
- [x] Add an About page with app version info
- [x] Make it possible to install new models via the app menu (Tools > Models)
- [ ] [YOUR IDEA](https://github.com/kkomelin/n8n-local-desktop/issues/new)

---

For development setup, build instructions, and release process, see [docs/development.md](docs/development.md).
