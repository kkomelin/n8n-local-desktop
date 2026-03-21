# Installing Ollama Models via CLI

Launch the app first, then run:

```bash
docker exec -it n8n-ollama-desktop-ollama-1 ollama pull <model-name>
```

For example:
```bash
docker exec -it n8n-ollama-desktop-ollama-1 ollama pull llama3.2:3b
```

Browse available models at [ollama.com/search](https://ollama.com/search).
