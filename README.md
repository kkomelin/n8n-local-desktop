<p align="center">
  <img width="150" height="150" alt="LonelyNathan" src="assets/icon.png" />
</p>

<p align="center">
LonelyNathan — Desktop app that runs <a href="https://n8n.io/">n8n</a> + <a href="https://ollama.com/">Ollama</a> locally via Docker.
</p>

<p align="center">
  <a href="https://github.com/kkomelin/n8n-ollama-desktop/releases"><img src="https://img.shields.io/github/v/release/kkomelin/n8n-ollama-desktop" alt="Release"></a>
  <a href="https://github.com/kkomelin/n8n-ollama-desktop/actions/workflows/build.yml"><img src="https://img.shields.io/badge/Build-Passing-brightgreen" alt="Build"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-blue.svg" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/kkomelin/n8n-ollama-desktop/releases"><img src="assets/screenshot.png" alt="Screenshot" /></a>
</p>

<p align="center">
  <a href="https://github.com/kkomelin/n8n-ollama-desktop/releases"><strong>Download for your OS 🚀</strong></a>
</p>

> Docker is required - see [official installation docs](https://docs.docker.com/engine/install/) for platform-specific instructions.


## Why Use This?

- **No cloud, no subscriptions** - run n8n and local AI models entirely on your machine, free of charge
- **Privacy by default** - your workflows and data never leave your computer
- **One-click setup** - no manual Docker commands, no config files to edit; just [download](https://github.com/kkomelin/n8n-ollama-desktop/releases) and run
- **Local LLMs included** - ships with Ollama pre-configured, so AI-powered workflows work out of the box
- **Use your own models** - pull any model from Ollama's library or connect to LM Studio, llama.cpp, or a host Ollama instance
- **Full community edition** - runs the official n8n Docker image with no integrations removed or disabled
- **Telemetry off by default** - n8n diagnostics and version notifications are disabled to match the local-first nature of this setup; see [docs/telemetry.md](docs/telemetry.md) to re-enable them

## AI Models

On first launch, the `llama3.2:3b` model (~2 GB) is automatically downloaded and configured for use in n8n LLM workflows.

To install additional Ollama models, use **Tools > Models** menu.

Alternatively, you can [install models via CLI](docs/models.md).

## Connecting to Host LLM Servers

You can use LLM servers running directly on your machine, such as [LM Studio](https://lmstudio.ai/), [llama.cpp](https://github.com/ggerganov/llama.cpp) server, or a host-installed [Ollama](https://ollama.com/) instance, alongside or instead of the built-in Ollama container.

See [docs/host-llm-servers.md](docs/host-llm-servers.md) for setup instructions.

## Roadmap

- [x] Make it possible to connect with the host machine's LLM servers from n8n workflows, e.g. LM Studio, llama.cpp, Ollama, etc.
- [x] Add an About page with app version info
- [x] Make it possible to install new models via the app menu (Tools > Models)
- [ ] [YOUR IDEA](https://github.com/kkomelin/n8n-ollama-desktop/issues/new)

---

For development setup, build instructions, and release process, see [docs/development.md](docs/development.md).
