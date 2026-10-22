#!/usr/bin/env node
/**
 * @file .github/scripts/deploy-webhook.cjs
 * Zero-token, zero-clasp CI/CD deployer for Google Apps Script.
 * Reads backend and frontend source files and POSTs them to the Shongsar Web App webhook.
 */

const fs = require('fs');
const path = require('path');

const webAppUrl = process.env.WEBAPP_URL;
const deployKey = process.env.DEPLOY_KEY;
const deploymentId = process.env.DEPLOYMENT_ID || '';
const commitSha = process.env.GITHUB_SHA || '';

if (!webAppUrl) {
  console.error('\n❌ ERROR: WEBAPP_URL secret is not set in GitHub Repository Secrets.');
  console.error('Please add WEBAPP_URL in GitHub: Settings > Secrets and variables > Actions > New repository secret.\n');
  process.exit(1);
}

if (!deployKey) {
  console.error('\n❌ ERROR: DEPLOY_KEY secret is not set in GitHub Repository Secrets.');
  console.error('Please configure your DEPLOY_KEY in your Google Sheet (🌿 Shongsar > 🔑 Configure CI/CD Deploy Key)');
  console.error('and add the exact same value in GitHub: Settings > Secrets and variables > Actions > New repository secret.\n');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '../../');
const files = [];

// 1. Add appsscript.json manifest
const manifestPath = path.join(rootDir, 'appsscript.json');
if (fs.existsSync(manifestPath)) {
  files.push({
    name: 'appsscript',
    type: 'JSON',
    source: fs.readFileSync(manifestPath, 'utf8')
  });
  console.log('📦 Packaged: appsscript.json');
} else {
  console.error('⚠️ Warning: appsscript.json not found in root.');
}

// 2. Add backend/*.gs files
const backendDir = path.join(rootDir, 'backend');
if (fs.existsSync(backendDir)) {
  const backendFiles = fs.readdirSync(backendDir).filter(f => f.endsWith('.gs'));
  for (const filename of backendFiles) {
    const filePath = path.join(backendDir, filename);
    const baseName = filename.replace(/\.gs$/, '');
    files.push({
      name: `backend/${baseName}`,
      type: 'SERVER_JS',
      source: fs.readFileSync(filePath, 'utf8')
    });
    console.log(`📦 Packaged: backend/${filename} (SERVER_JS)`);
  }
}

// 3. Add frontend/*.html files
const frontendDir = path.join(rootDir, 'frontend');
if (fs.existsSync(frontendDir)) {
  const frontendFiles = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));
  for (const filename of frontendFiles) {
    const filePath = path.join(frontendDir, filename);
    const baseName = filename.replace(/\.html$/, '');
    files.push({
      name: `frontend/${baseName}`,
      type: 'HTML',
      source: fs.readFileSync(filePath, 'utf8')
    });
    console.log(`📦 Packaged: frontend/${filename} (HTML)`);
  }
}

console.log(`\n🚀 Prepared ${files.length} project files. Sending deployment payload to Google Apps Script...`);

const payload = {
  action: 'DEPLOY_FILES',
  deployKey: deployKey,
  deploymentId: deploymentId,
  commitSha: commitSha,
  description: commitSha ? `Release ${commitSha.substring(0, 7)} (GitHub Actions)` : 'Release via Webhook',
  createVersion: true,
  files: files
};

async function executeDeploy() {
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Shongsar-GitHub-Actions-Deployer/1.0'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok || (result && result.success === false)) {
      console.error('\n❌ Deployment failed!');
      console.error('Status:', response.status);
      var errStr = result.error || responseText;
      console.error('Error Details:', errStr);

      if (errStr.includes('SERVICE_DISABLED') || errStr.includes('has not been used in project')) {
        console.error('\n======================================================');
        console.error('💡 HOW TO FIX: LINK YOUR FREE GOOGLE CLOUD PROJECT');
        console.error('======================================================');
        console.error('Default Apps Script containers restrict direct console activation.');
        console.error('Link your own free Google Cloud Project in 4 quick steps (takes 2 min):');
        console.error('');
        console.error('1. Create a free project (e.g. Shongsar-CICD):');
        console.error('   👉 https://console.cloud.google.com/projectcreate');
        console.error('2. Enable Google Apps Script API in that project:');
        console.error('   👉 https://console.cloud.google.com/apis/library/script.googleapis.com');
        console.error('3. Copy your numeric Project Number from Cloud Console Settings/Dashboard.');
        console.error('4. In Apps Script Editor: click ⚙️ Project Settings > Google Cloud Platform (GCP) Project > "Change project" > paste Project Number and save.');
        console.error('5. Click Deploy > Manage deployments > edit > New version > Deploy, then re-run this workflow.');
        console.error('======================================================\n');
      }

      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('🎉 DEPLOYMENT SUCCESSFUL TO GOOGLE APPS SCRIPT!');
    console.log('======================================================');
    console.log(`✅ Files Synchronized : ${result.filesUpdatedCount || files.length}`);
    if (result.versionNumber) {
      console.log(`✅ Version Created    : Version ${result.versionNumber}`);
    }
    if (result.scriptId) {
      console.log(`✅ Script Project ID  : ${result.scriptId}`);
    }
    console.log(`✅ Deployed At        : ${result.timestamp || new Date().toISOString()}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Network or fetch exception during deployment:', error.message);
    process.exit(1);
  }
}

executeDeploy();
