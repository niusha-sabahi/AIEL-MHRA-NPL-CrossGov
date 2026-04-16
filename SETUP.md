# Setup guide — Casework Decision Support

Instructions for running the project locally on macOS or Windows.

---

## macOS

### 1. Install Node.js

Open **Terminal** (search for it in Spotlight with `Cmd + Space`).

Install Node.js using the official installer:

1. Go to https://nodejs.org
2. Download the **LTS** version (the left button — "Recommended for most users")
3. Open the downloaded `.pkg` file and follow the installer steps
4. When it finishes, verify it worked by running:

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

This downloads the project's packages into a `node_modules` folder. It only needs to be run once (or again after pulling new changes that update `package.json`).

---

### 4. Start the app

```
npm run dev
```

You should see output like:

```
  VITE ready in 400ms

  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. The app will hot-reload when you save changes.

Press `Ctrl + C` in the terminal to stop it.

---

## Windows

### 1. Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (the left button — "Recommended for most users") — choose the **Windows Installer (.msi)**
3. Run the installer and accept all defaults (including the option to install necessary tools if prompted)
4. Open **Command Prompt** (search for `cmd` in the Start menu) and verify:

```
node --version
npm --version
```

Both should print a version number. If they don't, try restarting Command Prompt.

---

### 2. Get the code

If you have Git installed (check by running `git --version`):

```
git clone https://github.com/niusha-sabahi/AIEL-MHRA-NPL-CrossGov.git
cd AIEL-MHRA-NPL-CrossGov
```

If not, download the repo as a ZIP from GitHub (green **Code** button → **Download ZIP**), unzip it somewhere convenient (e.g. your Desktop), then open Command Prompt and navigate to it:

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

### 4. Start the app

```
npm run dev
```

You should see:

```
  VITE ready in 400ms

  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

Press `Ctrl + C` to stop the server.

---

## Troubleshooting

**`npm install` fails with a permissions error on Mac**
Run `sudo npm install` and enter your Mac password when prompted.

**Port 5173 is already in use**
Another instance of the app is probably already running. Either stop that one (`Ctrl + C` in the other terminal) or run on a different port: `npm run dev -- --port 5174`

**`node` or `npm` not found after installing**
Close and reopen your terminal/Command Prompt — it needs to reload its PATH after a new install.

**Changes not showing in the browser**
The dev server hot-reloads automatically. If it doesn't, try a hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows).