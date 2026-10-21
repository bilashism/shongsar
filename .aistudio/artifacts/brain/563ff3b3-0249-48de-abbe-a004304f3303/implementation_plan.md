# Zero-Secret CI/CD Deployment & Complete Setup README

Create a comprehensive, production-grade `README.md` and verify the CI/CD pipeline so changes to the Shongsar family financial management platform can automatically deploy to Google Apps Script and Google Sheets with zero secrets committed to code.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Zero Secrets in Code**: All sensitive credentials (`SCRIPT_ID`, `CLASPRC_JSON`, `DEPLOYMENT_ID`) remain strictly in GitHub Secrets and are never committed to the git repository.
> **Auto-Deploy on Push**: Every push to the `main` branch automatically packages `backend/` and `frontend/`, bumps the version tag, and updates the live production Web App deployment in Google Apps Script.

- **Deployment Scope**: Covers both the primary personal spreadsheet deployment and onboarding instructions for community forkers.
- **Workflow Triggers**: Dual-trigger configuration: automatic on `push` to `main`, plus manual `workflow_dispatch` button in the GitHub Actions tab.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a clear, comprehensive `README.md` guiding users through end-to-end setup of Shongsar:
  1. Creating the Google Spreadsheet and opening Apps Script.
  2. Obtaining Google Clasp credentials locally via `npx @google/clasp login`.
  3. Configuring GitHub Actions Secrets (`SCRIPT_ID`, `CLASPRC_JSON`, `DEPLOYMENT_ID`).
  4. Triggering automated push and production releases with zero manual copy-pasting.
- **Target Audience**: Repository owner maintaining their family finances, as well as open-source contributors or family members self-hosting on their own Google accounts.
- **Key Value**: Continuous, automated delivery from GitHub to Google Apps Script without exposing credentials or requiring manual script editor updates.

---

## 2. User Experience & Visual Design

- **Documentation Flow**:
  - **Quick Overview & Architecture**: Explaining the free serverless model (Google Sheets as database + Google Apps Script Web App host).
  - **Prerequisites**: Node.js and Google account.
  - **Step-by-Step CI/CD Configuration**:
    - Step 1: Link Google Sheets & extract `Script ID`.
    - Step 2: One-time Clasp login to generate `~/.clasprc.json`.
    - Step 3: Add `SCRIPT_ID`, `CLASPRC_JSON`, and optional `DEPLOYMENT_ID` to GitHub Secrets.
    - Step 4: Push to `main` and watch GitHub Actions deploy automatically.
  - **Zero-Secret Security Model**: Clear guidance on `.gitignore`, avoiding committed keys, and keeping Google tokens secure.
  - **Local Development & Preview**: Instructions for running the Vite preview or testing standalone.

---

## 3. Key Product Decisions & Trade-Offs

- **Clasp Token Authentication via Secrets**:
  - *Chosen Approach*: Storing the JSON contents of `~/.clasprc.json` in a single GitHub Secret `CLASPRC_JSON` and writing it at runner initialization.
  - *Why*: Google Clasp CLI requires OAuth token credentials to interact with Google's Apps Script API. Injecting it as an encrypted repository secret keeps the repository 100% public-safe while allowing GitHub Actions to authenticate headless.
- **Atomic Deployment Pipeline**:
  - *Chosen Approach*: `.claspignore` isolates only `backend/**`, `frontend/**`, and `appsscript.json`. GitHub Actions creates a new immutable version on each release and updates the deployment ID in place.
  - *Why*: Ensures the deployed Web App URL remains permanent, so users don't need to change bookmarks or update spreadsheet menus on new releases.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│   ├── backend/*.gs (Database, DoubleEntry, Lifecycle, Menu) │
│   ├── frontend/*.html (Index, Styles, Scripts)              │
│   └── .github/workflows/deploy.yml                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ git push origin main
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions Runner                     │
│   1. Reads Secrets: SCRIPT_ID, CLASPRC_JSON, DEPLOYMENT_ID  │
│   2. Injects ~/.clasprc.json securely                       │
│   3. Runs `clasp push --force` (syncs code)                 │
│   4. Runs `clasp version` & updates Web App deployment      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Deploy to Google Apps Script API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Apps Script + Google Sheets             │
│   ├── Serves Deep Dark Slate Web App URL                    │
│   ├── Reads/Writes 8 Database Tabs in personal Sheets       │
│   └── Reconciles double-entry accounts in real time         │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Plan

1. Verify `.github/workflows/deploy.yml` contains correct secret bindings and automated deployment steps.
2. Verify `.claspignore` and `.gitignore` exclude all credential files.
3. Create `README.md` with complete, copy-pasteable instructions.
4. Run `compile_applet` and `lint_applet` to ensure codebase integrity.
