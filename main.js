const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const PROJECT_NAME = "n8n-local-desktop";

const iconPath =
  process.platform === "win32"
    ? path.join(__dirname, "assets/windows/icon.ico")
    : process.platform === "linux"
    ? path.join(__dirname, "assets/linux/icons/512x512.png")
    : undefined; // macOS: handled by the app bundle
const PORT = 5678;
const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 180_000;
const ALLOWED_ORIGIN = `http://localhost:${PORT}`;

let loaderWindow = null;
let composeProcess = null;
let composePath = null;
let dataDir = null;

// ── Loader window ──

function createLoaderWindow() {
  loaderWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0d0d0d",
    show: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loaderWindow.loadFile("loader.html");
  loaderWindow.once("ready-to-show", () => {
    loaderWindow.show();
    startServices();
  });
}

// ── IPC helpers ──

const isDev = !app.isPackaged;

function sendStatus(text) {
  if (isDev) console.log(`[status] ${text}`);
  loaderWindow?.webContents.send("status-update", text);
}

function sendLog(text) {
  if (isDev) console.log(text.trimEnd());
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed) loaderWindow?.webContents.send("log-line", trimmed);
  }
}

function sendError(text) {
  if (isDev) console.error(`[error] ${text}`);
  loaderWindow?.webContents.send("error", text);
}

// ── Docker / Compose helpers ──

function dockerAvailable() {
  try {
    execSync("docker info", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function composeArgs(subcommand, extra = []) {
  return [
    "compose",
    "--file", composePath,
    "--project-name", PROJECT_NAME,
    "--project-directory", dataDir,
    subcommand,
    ...extra,
  ];
}

function pullImages() {
  return new Promise((resolve) => {
    sendStatus("Pulling latest Docker images…");

    const proc = spawn("docker", composeArgs("pull"));

    proc.stdout.on("data", (d) => sendLog(d.toString()));
    proc.stderr.on("data", (d) => sendLog(d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        sendLog("Warning: image pull failed — will try starting with cached images.");
      }
      resolve();
    });

    proc.on("error", (err) => {
      sendLog(`Warning: ${err.message}`);
      resolve();
    });
  });
}

function startCompose() {
  return new Promise((resolve, reject) => {
    sendStatus("Starting services…");

    composeProcess = spawn("docker", composeArgs("up"));

    let started = false;

    composeProcess.stdout.on("data", (d) => {
      sendLog(d.toString());
      if (!started) { started = true; resolve(); }
    });

    composeProcess.stderr.on("data", (d) => {
      sendLog(d.toString());
      if (!started) { started = true; resolve(); }
    });

    composeProcess.on("error", (err) => {
      if (!started) reject(err);
    });

    composeProcess.on("close", (code) => {
      if (!started) {
        reject(new Error(`docker compose up exited (code ${code}) before producing output`));
      }
      composeProcess = null;
    });

    // Resolve after 5s even if no output yet
    setTimeout(() => {
      if (!started) { started = true; resolve(); }
    }, 5000);
  });
}

function waitForReady() {
  sendStatus("Waiting for n8n to be ready…");
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > POLL_TIMEOUT) {
        return reject(new Error("Timed out waiting for n8n to start"));
      }

      const req = http.get(ALLOWED_ORIGIN, (res) => {
        // 200 or any redirect means the web UI is up and serving
        if (res.statusCode === 200 || (res.statusCode >= 301 && res.statusCode <= 308)) {
          sendLog(`n8n is ready (HTTP ${res.statusCode})`);
          resolve();
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
        res.resume();
      });

      req.on("error", () => setTimeout(check, POLL_INTERVAL));
      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(check, POLL_INTERVAL);
      });
    };

    check();
  });
}

function openApp() {
  sendStatus("Launching n8n…");

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ALLOWED_ORIGIN)) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ALLOWED_ORIGIN)) return { action: "allow" };
    return { action: "deny" };
  });

  mainWindow.loadURL(ALLOWED_ORIGIN);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    loaderWindow?.close();
    loaderWindow = null;
  });

  mainWindow.on("closed", () => {
    stopServices();
    app.quit();
  });
}

function stopServices() {
  composeProcess = null;
  try {
    execSync(
      `docker compose --project-name ${PROJECT_NAME} down`,
      { stdio: "ignore", timeout: 30_000 }
    );
  } catch {
    // containers may already be gone
  }
}

// ── Main flow ──

function containerExec(service, cmd) {
  return new Promise((resolve) => {
    const proc = spawn("docker", [
      "compose",
      "--file", composePath,
      "--project-name", PROJECT_NAME,
      "--project-directory", dataDir,
      "exec", "-T", service,
      ...cmd,
    ]);

    proc.stdout.on("data", (d) => sendLog(d.toString()));
    proc.stderr.on("data", (d) => sendLog(d.toString()));

    proc.on("close", (code) => {
      sendLog(`[exec] exited ${code}`);
      resolve(code);
    });

    proc.on("error", (err) => {
      sendLog(`[exec] error: ${err.message}`);
      resolve(-1);
    });
  });
}

async function setupOllamaCredential() {
  const markerFile = path.join(dataDir, ".ollama-credentials-imported");
  if (fs.existsSync(markerFile)) {
    sendLog("[setup] Ollama credentials already imported, skipping.");
    return;
  }

  sendStatus("Configuring Ollama connection…");

  const credentialsSrc = app.isPackaged
    ? path.join(process.resourcesPath, "ollama-credentials.json")
    : path.join(__dirname, "ollama-credentials.json");

  const credentialsDest = path.join(dataDir, "n8n-files", "ollama-credentials.json");

  // Copy credentials file to the n8n-files volume (mounted at /files inside the container)
  try {
    fs.copyFileSync(credentialsSrc, credentialsDest);
    sendLog(`[setup] copied to ${credentialsDest}`);
  } catch (err) {
    sendLog(`[setup] copy failed: ${err.message}`);
    return;
  }

  // Verify the file is visible inside the container
  sendLog("[setup] checking file inside container…");
  await containerExec("n8n", ["sh", "-c", "ls -la /files/ollama-credentials.json && cat /files/ollama-credentials.json"]);

  // Import credentials — give n8n a moment to finish its own DB writes first
  await new Promise((r) => setTimeout(r, 3000));
  sendLog("[setup] importing credentials…");
  const exitCode = await containerExec("n8n", ["n8n", "import:credentials", "--input=/files/ollama-credentials.json"]);

  try { fs.unlinkSync(credentialsDest); } catch {}

  if (exitCode === 0) {
    fs.writeFileSync(markerFile, new Date().toISOString());
    sendLog("[setup] Ollama credentials imported successfully.");
  } else {
    sendLog(`[setup] WARNING: credential import exited with code ${exitCode} — Ollama connection may not be configured.`);
  }
}

async function waitForOllama() {
  sendStatus("Waiting for Ollama to be ready…");
  const start = Date.now();
  const timeout = 60_000;

  while (Date.now() - start < timeout) {
    const code = await containerExec("ollama", ["ollama", "list"]);
    if (code === 0) return;
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Timed out waiting for Ollama");
}

async function pullOllamaModel(model) {
  sendStatus(`Checking for ${model} model…`);

  const checkCode = await containerExec("ollama", ["ollama", "show", model]);
  if (checkCode === 0) {
    sendLog(`[setup] ${model} already present, skipping pull.`);
    return;
  }

  sendStatus(`Downloading ${model} model — this may take several minutes…`);
  const code = await containerExec("ollama", ["ollama", "pull", model]);

  if (code === 0) {
    sendLog(`[setup] ${model} downloaded successfully.`);
  } else {
    sendLog(`[setup] WARNING: failed to pull ${model} (exit ${code}) — you can pull it manually later.`);
  }
}

async function startServices() {
  try {
    if (!dockerAvailable()) {
      sendError("Docker is not installed or not running. Please install Docker and start it.");
      return;
    }

    // Ensure data directories exist in userData
    for (const dir of ["n8n-data", "n8n-files", "n8n-custom", "ollama-data"]) {
      fs.mkdirSync(path.join(dataDir, dir), { recursive: true });
    }

    sendLog("Checking for image updates…");
    await pullImages();

    await startCompose();
    await waitForReady();
    await setupOllamaCredential();
    await waitForOllama();
    await pullOllamaModel("gemma3:4b");
    openApp();
  } catch (err) {
    sendLog(`Error: ${err.message}`);
    sendError(`Failed to start: ${err.message}`);
  }
}

// ── About window ──

function createAboutWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "About n8n Local Desktop",
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenu(null);
  win.loadFile("about.html", {
    query: {
      version: app.getVersion(),
      homepage: "https://github.com/kkomelin/n8n-local-desktop",
    },
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "About", click: createAboutWindow },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── App lifecycle ──

app.whenReady().then(() => {
  composePath = app.isPackaged
    ? path.join(process.resourcesPath, "compose.yaml")
    : path.join(__dirname, "compose.yaml");

  dataDir = app.getPath("userData");

  buildMenu();
  createLoaderWindow();
});

app.on("window-all-closed", () => {
  stopServices();
  app.quit();
});

app.on("before-quit", stopServices);

ipcMain.on("retry", () => {
  stopServices();
  startServices();
});

ipcMain.on("quit-app", () => {
  stopServices();
  app.quit();
});

ipcMain.on("open-external", (_event, url) => {
  shell.openExternal(url);
});
