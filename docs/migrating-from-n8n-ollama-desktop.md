# Migrating from n8n Ollama Desktop to LonelyNathan

This guide covers how to migrate your data from the old **n8n Ollama Desktop** app to the new **LonelyNathan** app.

## What changes

The app has been renamed. The new app uses a different user data directory and Docker Compose project name, so the old app's data will **not** be picked up automatically.

| | Old app | New app |
|---|---|---|
| App name | n8n Ollama Desktop | LonelyNathan |
| GitHub repo | `kkomelin/n8n-ollama-desktop` | `kkomelin/n8n-ollama-desktop` |
| Docker project | `n8n-ollama-desktop` | `lonelynathan` |
| Container names | `n8n-ollama-desktop-n8n-1`, `n8n-ollama-desktop-ollama-1` | `lonelynathan-n8n-1`, `lonelynathan-ollama-1` |

## Before you start

Make sure the old app is installed and has been launched at least once.

## Locate your data directories

The app stores data in Electron's user data path:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/n8n Ollama Desktop/` |
| Linux | `~/.config/n8n-ollama-desktop/` |
| Windows | `%APPDATA%\n8n Ollama Desktop\` |

Inside that directory you'll find:

```
n8n-data/       ← n8n workflows, credentials, config
n8n-files/      ← files used by n8n
n8n-custom/     ← custom nodes
ollama-data/    ← downloaded Ollama models
```

## Migration steps

### Step 1 — Export your workflows

Open **n8n Ollama Desktop** and make sure it is fully started. In n8n, open the Workflows list, select all workflows, and use the Download option from the action menu to save them as a backup.

Then quit the old app to stop the Docker services cleanly before copying data.

### Step 2 — Find the new app's data directory

Launch **LonelyNathan** once so it creates its data directory, then quit it immediately.

The new data directory is:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/LonelyNathan/` |
| Linux | `~/.config/lonelynathan/` |
| Windows | `%APPDATA%\LonelyNathan\` |

### Step 3 — Copy data

**macOS:**
```bash
OLD="$HOME/Library/Application Support/n8n Ollama Desktop"
NEW="$HOME/Library/Application Support/LonelyNathan"
cp -r "$OLD/n8n-data"    "$NEW/n8n-data"
cp -r "$OLD/n8n-files"   "$NEW/n8n-files"
cp -r "$OLD/n8n-custom"  "$NEW/n8n-custom"
sudo cp -r "$OLD/ollama-data" "$NEW/ollama-data"
```

**Linux:**
```bash
OLD="$HOME/.config/n8n-ollama-desktop"
NEW="$HOME/.config/lonelynathan"
cp -r "$OLD/n8n-data"    "$NEW/n8n-data"
cp -r "$OLD/n8n-files"   "$NEW/n8n-files"
cp -r "$OLD/n8n-custom"  "$NEW/n8n-custom"
sudo cp -r "$OLD/ollama-data" "$NEW/ollama-data"
```

**Windows (PowerShell):**
```powershell
$OLD = "$env:APPDATA\n8n Ollama Desktop"
$NEW = "$env:APPDATA\LonelyNathan"
Copy-Item -Recurse "$OLD\n8n-data"    "$NEW\n8n-data"
Copy-Item -Recurse "$OLD\n8n-files"   "$NEW\n8n-files"
Copy-Item -Recurse "$OLD\n8n-custom"  "$NEW\n8n-custom"
Copy-Item -Recurse "$OLD\ollama-data" "$NEW\ollama-data"
```

> **Tip:** Copying `ollama-data` avoids re-downloading your models (~2 GB+ per model). Skip it if you're happy to re-download.
> **Note:** `ollama-data` contains files created by Docker as root, so `sudo` is required on macOS and Linux.

### Step 4 — Launch the new app

Start **LonelyNathan**. Your workflows, credentials, and models should be present. If your workflows are missing, import them manually via the Workflows list using the files you exported in Step 1.

### Step 5 — Uninstall the old app (optional)

Once you've confirmed everything works, you can uninstall **n8n Ollama Desktop** and remove its data directory.

**macOS:** Drag **n8n Ollama Desktop.app** to the Trash, then delete `~/Library/Application Support/n8n Ollama Desktop/`.

**Linux (deb):**
```bash
sudo apt remove n8n-ollama-desktop
rm -rf ~/.config/n8n-ollama-desktop
```

**Linux (AppImage):** Delete the `.AppImage` file and `~/.config/n8n-ollama-desktop/`.

**Windows:** Uninstall via Settings → Apps, then delete `%APPDATA%\n8n Ollama Desktop\`.

To also remove the old Docker volumes (they are separate from the app data directory):
```bash
docker volume ls | grep n8n-ollama-desktop
docker volume rm <volume-name>
```

## Troubleshooting

**Workflows or credentials are missing**
Make sure you copied `n8n-data` correctly and that the new app's data directory is the right one for your platform.

**Models are missing / re-downloading**
The `ollama-data` directory was not copied, or the copy was incomplete. Re-copy it while both apps are stopped.

**Old app still appears in the system**
Uninstall it via your OS package manager or drag it to the Trash (macOS).
