# Telemetry

By default, LonelyNathan disables all n8n diagnostics and version notifications to match its local-first, privacy-focused nature. The following environment variables are set in the bundled `compose.yaml`:

```yaml
- N8N_DIAGNOSTICS_ENABLED=false
- N8N_VERSION_NOTIFICATIONS_ENABLED=false
- EXTERNAL_FRONTEND_HOOKS_URLS=
- N8N_DIAGNOSTICS_CONFIG_FRONTEND=
- N8N_DIAGNOSTICS_CONFIG_BACKEND=
```

## Re-enabling telemetry

To restore n8n's default telemetry behaviour, remove or comment out those lines from the `compose.yaml` bundled inside the app.

### Locate compose.yaml

| Platform | Path |
|---|---|
| macOS | `/Applications/LonelyNathan.app/Contents/Resources/compose.yaml` |
| Linux (deb) | `/opt/LonelyNathan/resources/compose.yaml` |
| Linux (AppImage) | See note below |
| Windows | `C:\Program Files\LonelyNathan\resources\compose.yaml` |

> **Linux AppImage:** The AppImage is a read-only filesystem. Mount it first to extract the file, or switch to the `.deb` package for easier editing.
> ```bash
> ./LonelyNathan-*.AppImage --appimage-mount
> ```
> This mounts the image at a temporary path — copy `compose.yaml` from there to a writable location and re-package, or switch to the `.deb` instead.

### Edit the file

Open `compose.yaml` in a text editor (you may need `sudo` on Linux/macOS) and remove or comment out the diagnostics block:

```yaml
# Remove or comment out these lines:
- N8N_DIAGNOSTICS_ENABLED=false
- N8N_VERSION_NOTIFICATIONS_ENABLED=false
- EXTERNAL_FRONTEND_HOOKS_URLS=
- N8N_DIAGNOSTICS_CONFIG_FRONTEND=
- N8N_DIAGNOSTICS_CONFIG_BACKEND=
```

Restart the app for the changes to take effect.

See [n8n environment variables docs](https://docs.n8n.io/hosting/configuration/environment-variables/) for the full list of available options.
