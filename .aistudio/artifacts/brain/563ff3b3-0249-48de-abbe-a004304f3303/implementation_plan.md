# Zero-Token Webhook CI/CD Deployment Architecture

Transition from local Clasp `CLASPRC_JSON` token export to an automated, zero-token Webhook deployment pipeline. Changes to Shongsar can now deploy automatically on push to `main` via Google Apps Script's self-updating REST API endpoint.

## Architecture Overview

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

## Implemented Components

1. **`appsscript.json`**:
   - Added `"https://www.googleapis.com/auth/script.projects"`, `"https://www.googleapis.com/auth/script.deployments"`, and `"https://www.googleapis.com/auth/script.external_request"` scopes so Apps Script can modify its own project files.

2. **`backend/WebApp.gs`**:
   - Implemented `doPost(e)` with:
     - Authentication against `DEPLOY_KEY` stored in `PropertiesService.getScriptProperties()`.
     - `DEPLOY_FILES` action that invokes Google Apps Script REST API (`PUT /v1/projects/{scriptId}/content`) using `ScriptApp.getOAuthToken()`.
     - Automated release version tagging and optional deployment update.

3. **`backend/Menu.gs`**:
   - Added custom spreadsheet UI menu items:
     - `🔑 Configure CI/CD Deploy Key`: Dialog allowing the owner to set or update their secret passphrase directly from the Google Sheet without visiting Google Cloud Console.
     - `📋 View GitHub CI/CD Info`: Information dialog displaying the exact `WEBAPP_URL`, `DEPLOY_KEY` status, and Script ID.

4. **`.github/scripts/deploy-webhook.cjs`**:
   - Zero-dependency Node.js script that packages `backend/*.gs`, `frontend/*.html`, and `appsscript.json` into Apps Script REST API JSON format and sends the payload to `WEBAPP_URL`.

5. **`.github/workflows/deploy.yml`**:
   - Simplified GitHub Actions workflow triggered on push to `main` and manual dispatch, requiring only `WEBAPP_URL` and `DEPLOY_KEY` secrets.

6. **`README.md` & UI Components**:
   - Updated `README.md`, `GitHubCicdModal.tsx`, and `appsScriptProject.ts` with 2-minute setup instructions and zero-token guidance.

## Verification
- `compile_applet`: Passed.
- `lint_applet`: Passed (`tsc --noEmit` clean).
