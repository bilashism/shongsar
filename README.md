# Shongsar - Family Budget & Wealth Manager

[![Deploy to Google Apps Script](https://github.com/actions/workflows/deploy.yml/badge.svg)](../../actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?logo=googlesheets&logoColor=white)](https://sheets.google.com)

**Shongsar** is a modern, high-performance personal finance, family budget planning, and wealth management platform. It uses **Google Sheets** as a free, resilient double-entry database, runs on **Google Apps Script** as a serverless web app, and features automated, zero-secret continuous deployment via **GitHub Actions** and **Google Clasp CLI**.

---

## 🌟 Key Highlights

- **100% Free & Serverless**: Zero hosting costs. The database lives in your personal Google Spreadsheet, and the application is hosted by Google Apps Script.
- **Double-Entry Accounting Engine**: Strict financial integrity with automated debits, credits, account transfers, categories, and monthly rollups.
- **Unified Deep Dark Slate UI**: High-contrast, responsive dashboard matching across local previews and deployed Apps Script environments.
- **Zero-Secret Security Architecture**: No passwords, tokens, or credentials are hardcoded or tracked in git. Everything authenticates headlessly via GitHub Encrypted Secrets.
- **Automated CI/CD**: Pushing code to `main` automatically uploads code, creates an immutable version release, and deploys to your live Web App URL.

---

## 📁 Repository Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml        # Automated CI/CD pipeline for Google Apps Script
├── backend/                  # Google Apps Script server-side code
│   ├── Database.gs           # Google Sheets double-entry schema & storage engine
│   ├── DoubleEntry.gs        # Accounting balance validations & journal entries
│   ├── Lifecycle.gs          # Database initialization & sample data migration
│   ├── Menu.gs               # Custom menu integration within the Google Spreadsheet
│   └── WebApp.gs             # doGet() entry point & client-server RPC endpoints
├── frontend/                 # Google Apps Script web frontend templates
│   ├── Index.html            # Main HTML layout and structural view
│   ├── Styles.html           # Tailwind-inspired Deep Dark Slate stylesheets
│   └── Scripts.html          # Client-side reactivity & google.script.run bridge
├── src/                      # React SPA development & AI Studio live preview
├── appsscript.json           # Google Apps Script project manifest
├── .clasp.json.example       # Example Clasp configuration
├── .claspignore              # Prevents non-Apps-Script files from uploading
├── .gitignore                # Excludes secrets, credentials, and local build files
└── README.md                 # Complete setup and deployment documentation
```

---

## 🔒 Zero-Secret Security Model

Security and privacy are built into this repository by design:
1. **No Hardcoded Secrets**: All configuration files containing sensitive credentials (`.clasprc.json`, `.clasp.json`, `firebase-applet-config.json`, `.env*`) are explicitly listed in `.gitignore` and never committed.
2. **Strict Clasp Whitelist**: The `.claspignore` file excludes all repository contents by default (`**/**`) and whitelists only the production files required by Apps Script (`backend/**`, `frontend/**`, and `appsscript.json`). Development dependencies, node modules, and git histories are never uploaded.
3. **Encrypted Pipeline Execution**: Deployment credentials live exclusively in GitHub Secrets and are injected into an ephemeral runner at deploy time with restricted file permissions (`chmod 600`).

---

## 🚀 Setup & Continuous Deployment (CI/CD)

Follow these steps to link your Google Spreadsheet with GitHub Actions and enable automatic deployments.

### Prerequisites

1. A **Google Account** with access to Google Drive and Google Sheets.
2. **Node.js 18+** installed locally on your machine (needed once to generate Clasp login tokens).
3. A fork or clone of this repository on **GitHub**.

---

### Step 1: Enable the Google Apps Script API

Google requires you to enable API access in your user account before Clasp can push code:

1. Open your browser and navigate to: **[Google Apps Script User Settings](https://script.google.com/home/usersettings)**
2. Find the toggle labeled **Google Apps Script API**.
3. Switch it to **ON**.

*(If this is not enabled, Clasp commands will fail with a `Google Apps Script API has not been used` error).*

---

### Step 2: Create or Connect Your Google Sheet

1. Create a new Google Spreadsheet at [sheets.new](https://sheets.new) (or open your existing budget sheet).
2. Click **Extensions** in the top menu -> **Apps Script**.
3. In the Apps Script project that opens:
   - Click the **Project Settings** icon (gear ⚙️ on the left sidebar).
   - Locate the **Script ID** (a string of ~57 alphanumeric characters, e.g., `1a2b3c4d5e6f7g8h9i0j...`).
   - **Copy your Script ID** — you will use this as `SCRIPT_ID` in Step 4.

---

### Step 3: Generate Clasp Credentials Locally

Google Clasp requires an OAuth token to deploy headlessly on your behalf. Generate this once from your computer:

1. Open your local terminal and run:
   ```bash
   npx @google/clasp login
   ```
2. Your browser will open asking you to sign in with your Google account. Authorize the Google Clasp CLI.
3. Once logged in, Clasp saves your authentication tokens in your user home directory at `~/.clasprc.json`.
4. Display and copy the contents of this file:

   - **macOS / Linux**:
     ```bash
     cat ~/.clasprc.json
     ```
   - **Windows (PowerShell)**:
     ```powershell
     Get-Content ~\.clasprc.json
     ```

The output will look like this JSON structure:
```json
{
  "token": {
    "access_token": "ya29...",
    "refresh_token": "1//0...",
    "scope": "https://www.googleapis.com/auth/script.projects ...",
    "token_type": "Bearer",
    "expiry_date": 1700000000000
  },
  "oauth2ClientSettings": {
    "clientId": "...",
    "clientSecret": "...",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```
> **Important**: Keep this token secure! Never share it publicly or commit it to your repository.

---

### Step 4: Create Initial Web App Deployment (Recommended)

Creating an initial deployment allows the CI/CD pipeline to continuously update the **same URL** on every release rather than generating a new URL each time:

1. In the Google Apps Script editor for your project, click **Deploy** (top right) -> **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Configure settings:
   - **Description**: `Production Web App`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` (or `Only myself` based on your preference)
4. Click **Deploy**.
5. Copy the **Deployment ID** (e.g., `AKfycby...`) and save your **Web app URL**.

---

### Step 5: Configure GitHub Encrypted Secrets

1. In your GitHub repository, navigate to:
   **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following three secrets:

| Secret Name | Required | Description | Example / Where to find |
| :--- | :--- | :--- | :--- |
| `SCRIPT_ID` | **Yes** | Your Google Apps Script project ID | Apps Script Editor -> Project Settings (⚙️) -> Script ID |
| `CLASPRC_JSON` | **Yes** | Full JSON content of `~/.clasprc.json` | Generated in Step 3 via `npx @google/clasp login` |
| `DEPLOYMENT_ID` | **Recommended** | Web app deployment ID to update | Obtained from Step 4 under Deployments |

> **Note**: If `DEPLOYMENT_ID` is omitted, the workflow will publish a new deployment on each push instead of updating the existing URL. Setting `DEPLOYMENT_ID` ensures your bookmarks and mobile home screen shortcuts remain constant.

---

### Step 6: Verify Automatic Deployments

1. Push any commit to the `main` branch:
   ```bash
   git add .
   git commit -m "feat: setup continuous deployment"
   git push origin main
   ```
2. Navigate to the **Actions** tab in your GitHub repository.
3. You will see the **Deploy to Google Apps Script** workflow running:
   - ✅ Checks out code
   - ✅ Sets up Node.js 20 & installs `@google/clasp`
   - ✅ Writes credentials with secure `0600` permissions
   - ✅ Executes `clasp push --force`
   - ✅ Generates an immutable version tag (e.g., `Automated release: 7a8b9c0`)
   - ✅ Deploys to your production `DEPLOYMENT_ID`
4. Open your Apps Script Web App URL to see your changes live!

You can also trigger a manual deployment anytime from GitHub under **Actions** -> **Deploy to Google Apps Script** -> **Run workflow**.

---

## 💻 Local React Development & Preview

This repository also contains a local React + Vite development environment with the exact same Deep Dark Slate design language:

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Verify TypeScript compilation and production build
npm run build
```

---

## 🛠️ Spreadsheet Initialization & First Run

Once the code is pushed to your Google Apps Script project:

1. Open your linked Google Spreadsheet.
2. Refresh the page. You will see a custom menu appear in the top bar: **🏛️ Shongsar**.
3. Click **🏛️ Shongsar** -> **Initialize / Reset Database**.
4. Grant the initial Google authorization prompt if requested.
5. The script will automatically format and create the required sheets:
   - `Accounts`: Assets, Liabilities, Incomes, and Expenses.
   - `Transactions`: General double-entry journal entries.
   - `Categories`: Budget tracking categories and target allocations.
   - `Settings`: User preferences and currency configurations.
6. Open your Web App deployment URL to manage your budget and family finances with real-time sync.

---

## ❓ Troubleshooting & FAQs

#### Error: `User has not enabled the Apps Script API`
- Visit [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) and ensure the **Google Apps Script API** toggle is set to **ON** for the account that owns the script.

#### Error: `clasp push fails with 401 Unauthorized`
- Your Clasp refresh token may have expired or been revoked. Re-run `npx @google/clasp login` locally, copy the new contents of `~/.clasprc.json`, and update the `CLASPRC_JSON` secret in GitHub.

#### My changes deploy but the live URL still shows the old version
- Ensure `DEPLOYMENT_ID` is correctly set in your GitHub Repository Secrets. The workflow uses this ID to re-point the active deployment to the newly minted version number.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
