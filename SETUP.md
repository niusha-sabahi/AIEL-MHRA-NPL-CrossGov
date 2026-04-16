# Setup guide — Casework Decision Support

Instructions for running the project locally on macOS or Windows.

The app has two parts that run side-by-side:

| Process | Command | URL | Purpose |
|---|---|---|---|
| Frontend | `npm run dev` | http://localhost:5173 | React UI |
| AI server | `npm run server` | http://localhost:8000 | Calls Claude API |

The frontend works without the AI server — it shows a mock response when the server is unreachable. Start the server when you want real AI analysis.

---

## macOS

### 1. Install Node.js

Open **Terminal** (search for it in Spotlight with `Cmd + Space`).

1. Go to https://nodejs.org
2. Download the **LTS** version (the left button — "Recommended for most users")
3. Open the downloaded `.pkg` file and follow the installer steps
4. Verify it worked:

```
node --version
npm --version
```

Both commands should print a version number (e.g. `v22.x.x`).

---

### 2. Get the code

If you have Git installed:

```
git clone https://github.com/niusha-sabahi/AIEL-MHRA-NPL-CrossGov.git
cd AIEL-MHRA-NPL-CrossGov
```

If you don't have Git, download the repo as a ZIP from GitHub (green **Code** button → **Download ZIP**), then unzip it.

---

### 3. Install dependencies

```
cd casework-ui
npm install
```

Only needs to be run once (or again after pulling changes that update `package.json`).

---

### 4. Configure credentials

Copy the example env file and fill in your credentials:

```
cp .env.example .env
```

Open `casework-ui/.env` and set your values. For the shared team proxy use:

```
ANTHROPIC_BASE_URL=https://licenseportal.aiengineeringlab.co.uk
ANTHROPIC_AUTH_TOKEN=<your token>
ANTHROPIC_DEFAULT_OPUS_MODEL=eu.anthropic.claude-opus-4-6-v1
```

If you have a direct Anthropic API key instead, set `ANTHROPIC_API_KEY=sk-ant-...` and leave the other three unset.

---

### 5. Start the app

You need **two terminal windows** open, both inside `casework-ui/`.

**Terminal 1 — frontend:**
```
npm run dev
```

**Terminal 2 — AI server:**
```
npm run server
```

Then open **http://localhost:5173** in your browser.

Press `Ctrl + C` in either terminal to stop it.

---

## Windows

### 1. Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version — choose the **Windows Installer (.msi)**
3. Run the installer and accept all defaults
4. Open **Command Prompt** (search for `cmd` in the Start menu) and verify:

```
node --version
npm --version
```

If they don't print a version, try restarting Command Prompt.

---

### 2. Get the code

If you have Git installed (check by running `git --version`):

```
git clone https://github.com/niusha-sabahi/AIEL-MHRA-NPL-CrossGov.git
cd AIEL-MHRA-NPL-CrossGov
```

If not, download the repo as a ZIP from GitHub (green **Code** button → **Download ZIP**), unzip it, then navigate to it in Command Prompt:

```
cd C:\Users\YourName\Desktop\AIEL-MHRA-NPL-CrossGov
```

---

### 3. Install dependencies

```
cd casework-ui
npm install
```

---

### 4. Configure credentials

Copy the example env file:

```
copy .env.example .env
```

Open `casework-ui\.env` in a text editor and set your values. For the shared team proxy:

```
ANTHROPIC_BASE_URL=https://licenseportal.aiengineeringlab.co.uk
ANTHROPIC_AUTH_TOKEN=<your token>
ANTHROPIC_DEFAULT_OPUS_MODEL=eu.anthropic.claude-opus-4-6-v1
```

---

### 5. Start the app

You need **two Command Prompt windows** open, both inside `casework-ui\`.

**Window 1 — frontend:**
```
npm run dev
```

**Window 2 — AI server:**
```
npm run server
```

Then open **http://localhost:5173** in your browser.

Press `Ctrl + C` in either window to stop it.

---

## Troubleshooting

**`npm install` fails with a permissions error on Mac**
Run `sudo npm install` and enter your Mac password when prompted.

**AI server fails to start with "No API key found"**
Check that `casework-ui/.env` exists and contains either `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY`. If you only have `.env.example`, run `cp .env.example .env` and fill it in.

**"Analyse Case" shows a mock/offline response**
The AI server isn't running or failed to start. Check the second terminal for error messages, then try `npm run server` again.

**Port 5173 is already in use**
Another instance is already running. Stop it (`Ctrl + C`) or use a different port: `npm run dev -- --port 5174`

**Port 8000 is already in use**
Another instance of the AI server is running. Find and stop it, or check if a previous `npm run server` process is still active.

**`node` or `npm` not found after installing**
Close and reopen your terminal — it needs to reload its PATH after a new install.

**Changes not showing in the browser**
The dev server hot-reloads automatically. If it doesn't, try a hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows).