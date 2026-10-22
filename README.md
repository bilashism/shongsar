# Shongsar - Family Budget & Wealth Manager

[![Deploy to Google Apps Script](https://github.com/actions/workflows/deploy.yml/badge.svg)](../../actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?logo=googlesheets&logoColor=white)](https://sheets.google.com)

**Shongsar** is a personal finance, family budget planning, and wealth management platform. It uses **Google Sheets** as a free double-entry relational database, runs on **Google Apps Script** as a serverless web app, and features automated, **zero-token continuous deployment via GitHub Actions Webhooks**.

---

## 🌟 Key Highlights

- **100% Free & Serverless**: Zero hosting fees. Your personal Google Spreadsheet is the database, and Google Apps Script serves the web app.
- **Zero-Token CI/CD (No `CLASPRC_JSON`)**: No need to install Clasp CLI locally, sign into a terminal, or copy messy OAuth refresh tokens that expire after 7 days. Continuous deployment happens through an authenticated HTTPS webhook.
- **Double-Entry Accounting Engine**: Strict financial integrity with automated debits, credits, transfers, category budgeting, and 5-year rolling archival.
- **Unified Deep Dark Slate UI**: Consistent dark mode interface across the React development preview and the production Google Apps Script deployment.
- **Automated Deployments**: Pushing code to `main` instantly uploads all backend and frontend changes to Google Apps Script and creates a new release version.

---

## 📁 Repository Structure

```
├── .github/
│   ├── scripts/
│   │   └── deploy-webhook.cjs # Packages and POSTs files to Apps Script
│   └── workflows/
│       └── deploy.yml         # GitHub Actions workflow (runs on push to main)
├── backend/                   # Google Apps Script server-side code
│   ├── Database.gs            # Google Sheets double-entry schema & storage engine
│   ├── DoubleEntry.gs         # Balance recalculation and fund transfers
│   ├── Lifecycle.gs           # 5-year rolling data retention and cleanup
│   ├── Menu.gs                # Custom spreadsheet menu & CI/CD deploy key setup
│   └── WebApp.gs              # doGet() UI server & doPost() webhook deployer
├── frontend/                  # Google Apps Script web frontend templates
│   ├── Index.html             # HTML layout, dashboard grids, and modals
│   ├── Styles.html            # Deep Dark Slate stylesheets & typography
│   └── Scripts.html           # Client-side reactivity & google.script.run bridge
├── src/                       # React SPA development & AI Studio live preview
├── appsscript.json            # Apps Script manifest with script.projects API scope
├── .gitignore                 # Excludes local artifacts and environment secrets
└── README.md                  # Complete setup and deployment documentation
```

---

## 🚀 2-Minute CI/CD Setup (Zero `CLASPRC_JSON`)

You do **not** need to install Google Clasp or copy OAuth credentials into GitHub. Continuous deployment works automatically via a secure webhook endpoint built into your deployed Apps Script web app.

```
┌─────────────────────────────────┐
│     GitHub Actions (Push)       │
│  1. Reads backend/ & frontend/  │
│  2. Packages files into JSON    │
│  3. POSTs to Web App URL        │
└────────────────┬────────────────┘
                 │ HTTPS POST with DEPLOY_KEY
                 ▼
┌─────────────────────────────────┐
│ Google Apps Script (doPost)     │
│  1. Verifies DEPLOY_KEY         │
│  2. Calls script.googleapis.com │
│     using internal              │
│     ScriptApp.getOAuthToken()   │
│  3. Overwrites project files    │
│     and creates new deployment  │
└─────────────────────────────────┘
```

---

### Step 1: Deploy Web App in Google Apps Script

1. Open your Google Spreadsheet (e.g., at [sheets.new](https://sheets.new)).
2. Go to **Extensions** > **Apps Script**.
3. Copy the project files from `backend/`, `frontend/`, and `appsscript.json` (or import this repository).
4. In the top right of the Apps Script editor, click **Deploy** > **New deployment**.
5. Click the gear icon ⚙️ next to "Select type" and select **Web app**.
6. Set:
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone`
7. Click **Deploy** and authorize the permissions.
8. Copy the generated **Web app URL** (e.g., `https://script.google.com/macros/s/AKfyc.../exec`).

---

### Step 2: Configure Your `DEPLOY_KEY` in Google Sheets

1. Return to your Google Spreadsheet and refresh the tab.
2. In the top menu, click **🌿 Shongsar (সংসার)** > **🔑 Configure CI/CD Deploy Key**.
3. Enter any secret passphrase you choose (e.g., `shongsar_secret_2026_xyz`).
4. Click **OK**. Your key is saved privately inside your Google Sheet's Script Properties.
5. *(Optional)* Click **🌿 Shongsar (সংসার)** > **📋 View GitHub CI/CD Info** to review your configured URL and status.

---

### Step 3: Add Secrets to GitHub

In your GitHub repository (or fork):

1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** and add the following 2 secrets:

| Secret Name | Required | Value |
| :--- | :--- | :--- |
| `WEBAPP_URL` | **Yes** | Your Web App URL (`https://script.google.com/macros/s/.../exec`) |
| `DEPLOY_KEY` | **Yes** | The exact secret passphrase you entered in Step 2 |
| `DEPLOYMENT_ID` | *Optional* | Your Web App deployment ID (keeps the exact same production URL on updates) |

---

### Step 4: Push & Watch It Deploy!

Whenever you push to the `main` branch:

```bash
git add .
git commit -m "feat: update budget dashboard"
git push origin main
```

1. GitHub Actions runs `.github/scripts/deploy-webhook.cjs`.
2. All `backend/*.gs`, `frontend/*.html`, and `appsscript.json` files are packaged and sent to your Apps Script Web App.
3. The Web App uses its built-in `ScriptApp.getOAuthToken()` with the `script.projects` scope to update the script project and publish a new version.
4. Your live Google Spreadsheet Web App is updated within seconds!

To deploy manually without pushing code, go to **Actions** in GitHub > **Deploy to Google Apps Script** > **Run workflow**.

---

## 🔒 Security Architecture

1. **Zero OAuth Token Management**: Because Google Apps Script executes with the owner's authorization ("Execute as: Me"), the script generates its own temporary OAuth Bearer token internally when updating its project files. No Google OAuth refresh tokens or private keys ever leave Google servers.
2. **Secret Key Verification**: All incoming deployment webhooks are verified against the `DEPLOY_KEY` saved in Google Apps Script `PropertiesService.getScriptProperties()`. Any request with an incorrect or missing key is rejected immediately.
3. **No Secrets in Git**: Your `DEPLOY_KEY` and `WEBAPP_URL` live strictly in GitHub Encrypted Secrets and your private Google Sheet.

---

## 💻 Local React Development & Preview

This repository also contains a Vite + React SPA that mimics the deployed Apps Script interface for local development and AI Studio previews:

```bash
# Install dependencies
npm install

# Run local development server (port 3000)
npm run dev

# Run TypeScript check and production build
npm run build
```

---

## ❓ Frequently Asked Questions (FAQ)

#### 1. Why is this better than Clasp and `CLASPRC_JSON`?
Google Clasp requires running `npx @google/clasp login` locally, extracting a JSON blob from `~/.clasprc.json`, and saving it to GitHub. If the Google Cloud project is in testing mode, Google automatically expires the refresh token after 7 days, breaking CI/CD. The webhook approach never expires because Google Apps Script generates a fresh access token on the fly.

#### 2. What if I get an "Unauthorized: Invalid DEPLOY_KEY" error?
Make sure the value in your GitHub repository secret `DEPLOY_KEY` exactly matches the value you entered in your Google Sheet under **🌿 Shongsar (সংসার)** > **🔑 Configure CI/CD Deploy Key**.

#### 3. How do other contributors or forkers use this?
When someone forks your repository, they only need to:
1. Deploy their own copy of the Web App from their Google Sheet.
2. Set their own `DEPLOY_KEY` in their spreadsheet.
3. Add `WEBAPP_URL` and `DEPLOY_KEY` to their GitHub fork's secrets.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
