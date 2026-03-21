# Migrating from n8n Local Desktop to n8n Ollama Desktop

This guide covers how to migrate your data from the old **n8n Local Desktop** app to the new **n8n Ollama Desktop** app.

## What changes

The app has been renamed. The new app uses a different user data directory and Docker Compose project name, so the old app's data will **not** be picked up automatically.

| | Old app | New app |
|---|---|---|
| App name | n8n Local Desktop | n8n Ollama Desktop |
| GitHub repo | `kkomelin/n8n-local-desktop` | `kkomelin/n8n-ollama-desktop` |
| Docker project | `n8n-local-desktop` | `n8n-ollama-desktop` |
| Container names | `n8n-local-desktop-n8n-1`, `n8n-local-desktop-ollama-1` | `n8n-ollama-desktop-n8n-1`, `n8n-ollama-desktop-ollama-1` |

## Before you start

1. **Open the old app** and make sure all Docker services are running.
2. **Export your workflows** via n8n Settings → Import/Export as a backup.
3. **Quit the old app** — this stops the Docker services cleanly.

## Locate your data directories

The app stores data in Electron's user data path:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/n8n Local Desktop/` |
| Linux | `~/.config/n8n Local Desktop/` |
| Windows | `%APPDATA%\n8n Local Desktop\` |

Inside that directory you'll find:

```
n8n-data/       ← n8n workflows, credentials, config
n8n-files/      ← files used by n8n
n8n-custom/     ← custom nodes
ollama-data/    ← downloaded Ollama models
```

## Migration steps

### Step 1 — Find the new app's data directory

Launch **n8n Ollama Desktop** once so it creates its data directory, then quit it immediately.

The new data directory is:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/n8n Ollama Desktop/` |
| Linux | `~/.config/n8n Ollama Desktop/` |
| Windows | `%APPDATA%\n8n Ollama Desktop\` |

### Step 2 — Copy data

Copy the subdirectories from the old location to the new one. Replace `<OLD>` and `<NEW>` with the paths from the table above.

**macOS / Linux:**
```bash
cp -r "<OLD>/n8n-data"   "<NEW>/n8n-data"
cp -r "<OLD>/n8n-files"  "<NEW>/n8n-files"
cp -r "<OLD>/n8n-custom" "<NEW>/n8n-custom"
cp -r "<OLD>/ollama-data" "<NEW>/ollama-data"
```

**Windows (PowerShell):**
```powershell
Copy-Item -Recurse "$env:APPDATA\n8n Local Desktop\n8n-data"   "$env:APPDATA\n8n Ollama Desktop\n8n-data"
Copy-Item -Recurse "$env:APPDATA\n8n Local Desktop\n8n-files"  "$env:APPDATA\n8n Ollama Desktop\n8n-files"
Copy-Item -Recurse "$env:APPDATA\n8n Local Desktop\n8n-custom" "$env:APPDATA\n8n Ollama Desktop\n8n-custom"
Copy-Item -Recurse "$env:APPDATA\n8n Local Desktop\ollama-data" "$env:APPDATA\n8n Ollama Desktop\ollama-data"
```

> **Tip:** Copying `ollama-data` avoids re-downloading your models (~2 GB+ per model). Skip it if you're happy to re-download.

### Step 3 — Launch the new app

Start **n8n Ollama Desktop**. Your workflows, credentials, and models should be present.

### Step 4 — Uninstall the old app (optional)

Once you've confirmed everything works, you can uninstall **n8n Local Desktop** and remove its data directory.

To also remove the old Docker volumes (they are separate from the app data directory):
```bash
docker volume ls | grep n8n-local-desktop
docker volume rm <volume-name>
```

## Troubleshooting

**Workflows or credentials are missing**
Make sure you copied `n8n-data` correctly and that the new app's data directory is the right one for your platform.

**Models are missing / re-downloading**
The `ollama-data` directory was not copied, or the copy was incomplete. Re-copy it while both apps are stopped.

**Old app still appears in the system**
Uninstall it via your OS package manager or drag it to the Trash (macOS).
