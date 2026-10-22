/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

export interface AppsScriptFile {
  path: string;
  filename: string;
  folder: 'backend' | 'frontend' | 'ci_cd' | 'config';
  type: 'gs' | 'html' | 'yml' | 'json' | 'ignore' | 'md';
  description: string;
  content: string;
}

// 1. backend/WebApp.gs
const BACKEND_WEB_APP_GS = `/**
 * @file backend/WebApp.gs
 * Web App entry point, client RPC controller, and zero-token CI/CD Webhook deployer.
 */

var SPREADSHEET_NAME = "shongsar";

/**
 * Serves the Shongsar frontend Web App.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "ping") {
    var storedKey = PropertiesService.getScriptProperties().getProperty("DEPLOY_KEY");
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      app: "Shongsar",
      scriptId: ScriptApp.getScriptId(),
      deployKeyConfigured: !!storedKey,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var template = HtmlService.createTemplateFromFile("frontend/Index");
  return template.evaluate()
    .setTitle("Shongsar — Family Budget & Wealth Manager")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
}

/**
 * Handles incoming CI/CD Webhook deployments from GitHub Actions.
 * Eliminates the need for local CLASPRC_JSON / OAuth token exports.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing request payload in POST body"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var storedSecret = PropertiesService.getScriptProperties().getProperty("DEPLOY_KEY");

    if (!storedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "DEPLOY_KEY is not configured in this Google Sheet yet. Please open the Google Sheet, click '🌿 Shongsar' in the top menu, and select '🔑 Configure CI/CD Deploy Key' to set your secret passphrase."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!payload.deployKey || payload.deployKey !== storedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Unauthorized: Invalid DEPLOY_KEY provided by GitHub Actions."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === "PING") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Authentication successful. Apps Script Webhook receiver is ready.",
        scriptId: ScriptApp.getScriptId(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === "DEPLOY_FILES") {
      if (!payload.files || !Array.isArray(payload.files) || payload.files.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "No files array provided in deployment payload."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var scriptId = ScriptApp.getScriptId();
      var authToken = ScriptApp.getOAuthToken();

      var updateContentUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
      var contentResponse = UrlFetchApp.fetch(updateContentUrl, {
        method: "put",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + authToken },
        payload: JSON.stringify({ files: payload.files }),
        muteHttpExceptions: true
      });

      var responseCode = contentResponse.getResponseCode();
      var responseText = contentResponse.getContentText();

      if (responseCode >= 400) {
        var guidance = "";
        if (responseCode === 403 && responseText.indexOf("ACCESS_TOKEN_SCOPE_INSUFFICIENT") !== -1) {
          guidance = " -> Solution: Update your Apps Script Editor's appsscript.json with 'oauthScopes' containing 'https://www.googleapis.com/auth/script.projects', enable Google Apps Script API at https://script.google.com/home/usersettings, and click 'Run' on any function in the editor to re-authorize.";
        } else if (responseCode === 403 && (responseText.indexOf("SERVICE_DISABLED") !== -1 || responseText.indexOf("has not been used in project") !== -1)) {
          guidance = " -> Solution: Google Apps Script API is not enabled for this script's GCP container project. If opening the link shows 'You need additional access / missing resourcemanager.projects.get', create a free project at https://console.cloud.google.com/projectcreate, enable Google Apps Script API in it, copy the numeric Project Number, and link it via Apps Script Editor > Project Settings (gear icon) > Google Cloud Platform (GCP) Project > Change project.";
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Google Apps Script API content update failed (" + responseCode + "): " + responseText + guidance
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var versionNumber = null;
      var commitRef = payload.commitSha ? payload.commitSha.substring(0, 7) : "webhook";
      var versionDescription = payload.description || ("CI/CD Release " + commitRef + " via Webhook");

      try {
        var versionUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/versions";
        var versionResponse = UrlFetchApp.fetch(versionUrl, {
          method: "post",
          contentType: "application/json",
          headers: { Authorization: "Bearer " + authToken },
          payload: JSON.stringify({ description: versionDescription }),
          muteHttpExceptions: true
        });

        if (versionResponse.getResponseCode() === 200) {
          var versionData = JSON.parse(versionResponse.getContentText());
          versionNumber = versionData.versionNumber;

          var deploymentId = payload.deploymentId || PropertiesService.getScriptProperties().getProperty("DEPLOYMENT_ID");
          if (deploymentId && versionNumber) {
            var deployUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/deployments/" + deploymentId;
            UrlFetchApp.fetch(deployUrl, {
              method: "put",
              contentType: "application/json",
              headers: { Authorization: "Bearer " + authToken },
              payload: JSON.stringify({
                deploymentConfig: {
                  versionNumber: versionNumber,
                  description: versionDescription
                }
              }),
              muteHttpExceptions: true
            });
          }
        }
      } catch (versionErr) {
        Logger.log("Versioning notice: " + versionErr.toString());
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Project files synchronized successfully without Clasp!",
        filesUpdatedCount: payload.files.length,
        versionNumber: versionNumber,
        scriptId: scriptId,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Unknown action: " + payload.action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Server exception in doPost: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Standard Apps Script include helper for modular HTML templates.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * RPC: Fetches all family ledger entities for frontend initial load.
 */
function apiGetFullData() {
  ensureSpreadsheetSetup();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  return {
    accounts: readSheetRows("Accounts"),
    transactions: readSheetRows("Transactions"),
    budgets: readSheetRows("Budgets"),
    categories: readSheetRows("Categories"),
    debts: readSheetRows("Debts"),
    investments: readSheetRows("Investments"),
    config: readSheetRows("Config"),
    spreadsheetUrl: ss.getUrl()
  };
}

/**
 * RPC: Records transaction and recalculates account balances.
 */
function apiRecordTransaction(tx) {
  return processNewTransaction(tx);
}

/**
 * RPC: Executes fund transfer between linked accounts.
 */
function apiTransferFunds(fromId, toId, amount, description, date) {
  return processFundTransfer(fromId, toId, amount, description, date);
}

/**
 * RPC: Triggers 5-year rolling data archival and recycling.
 */
function apiRunArchival() {
  return runFiveYearArchivalAndRecycle();
}
`;

// 2. backend/Database.gs
const BACKEND_DATABASE_GS = `/**
 * @file backend/Database.gs
 * Google Sheets database schema initialization, reading and writing.
 */

/**
 * Ensures all required sheets and header columns exist with seeds.
 */
function ensureSpreadsheetSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schemas = {
    "Accounts": ["id", "name", "type", "institution", "currentBalance", "currency", "initialBalance", "notes", "updatedAt"],
    "Transactions": ["id", "date", "type", "amount", "currency", "fromAccountId", "toAccountId", "categoryId", "description", "familyMember", "notes", "createdAt"],
    "Budgets": ["id", "month", "categoryId", "allocatedAmount", "spentAmount", "notes"],
    "Categories": ["id", "name", "type", "icon", "color", "defaultMonthlyBudget"],
    "Debts": ["id", "title", "type", "counterparty", "totalAmount", "remainingAmount", "linkedAccountId", "dueDate", "interestRate", "status", "notes", "createdAt"],
    "Investments": ["id", "name", "type", "initialCost", "currentValuation", "linkedAccountId", "targetYield", "lastEvaluated", "notes"],
    "Archive_5Yr": ["id", "date", "type", "amount", "currency", "fromAccountId", "toAccountId", "categoryId", "description", "familyMember", "notes", "createdAt"],
    "Config": ["SettingKey", "SettingValue", "Description", "LastUpdated"]
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      seedSheetDefaults(sheetName, sheet);
    }
  }
}

function seedSheetDefaults(sheetName, sheet) {
  if (sheetName === "Accounts") {
    sheet.appendRow(["acc_bank", "Primary Salary Account", "bank", "City Bank", 148500, "BDT", 125000, "Direct payroll deposit", new Date().toISOString()]);
    sheet.appendRow(["acc_cash", "Household Cash Wallet", "cash", "Cash in Hand", 18200, "BDT", 25000, "Daily bazaar cash", new Date().toISOString()]);
    sheet.appendRow(["acc_wallet", "bKash Family Wallet", "mobile_banking", "bKash", 12400, "BDT", 15000, "Quick bills & merchant", new Date().toISOString()]);
    sheet.appendRow(["acc_savings", "Emergency Reserve Fund", "savings_pot", "BRAC Bank", 520000, "BDT", 450000, "6 months buffer", new Date().toISOString()]);
  } else if (sheetName === "Categories") {
    sheet.appendRow(["cat_rent", "Housing & Rent", "expense", "Home", "#2563EB", 45000]);
    sheet.appendRow(["cat_groceries", "Groceries & Food", "expense", "ShoppingBag", "#059669", 35000]);
    sheet.appendRow(["cat_utilities", "Utilities & Internet", "expense", "Zap", "#D97706", 9500]);
    sheet.appendRow(["cat_healthcare", "Healthcare & Medicine", "expense", "HeartPulse", "#DC2626", 7500]);
    sheet.appendRow(["cat_education", "Children & School", "expense", "GraduationCap", "#7C3AED", 22000]);
    sheet.appendRow(["cat_salary", "Primary Salary", "income", "Briefcase", "#059669", 180000]);
  } else if (sheetName === "Config") {
    sheet.appendRow(["autoRecycle5Years", "true", "Recycle transactions older than 5 years", new Date().toISOString()]);
    sheet.appendRow(["archiveToDedicatedSheet", "true", "Preserve in Archive_5Yr sheet", new Date().toISOString()]);
    sheet.appendRow(["primaryCurrency", "BDT", "Default currency", new Date().toISOString()]);
  }
}

/**
 * Reads all rows from a sheet as JSON objects mapped to headers.
 */
function readSheetRows(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      var val = row[h];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[headers[h]] = val;
    }
    rows.push(obj);
  }
  return rows;
}
`;

// 3. backend/DoubleEntry.gs
const BACKEND_DOUBLE_ENTRY_GS = `/**
 * @file backend/DoubleEntry.gs
 * Double-entry balance calculation, transfer engine, and balance reconciliation.
 */

/**
 * Saves a transaction and updates debited/credited accounts simultaneously.
 */
function processNewTransaction(tx) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  if (!txSheet) return { error: "Transactions sheet not found" };

  var newId = "tx_" + Utilities.getUuid().substring(0, 8);
  var createdAt = new Date().toISOString();
  var row = [
    newId,
    tx.date || createdAt.substring(0, 10),
    tx.type || "expense",
    parseFloat(tx.amount) || 0,
    tx.currency || "BDT",
    tx.fromAccountId || "",
    tx.toAccountId || "",
    tx.categoryId || "cat_groceries",
    tx.description || "Transaction",
    tx.familyMember || "Shared Family",
    tx.notes || "",
    createdAt
  ];

  txSheet.appendRow(row);
  reconcileAllBalances();
  return { success: true, id: newId };
}

/**
 * Records a linked transfer between two accounts.
 */
function processFundTransfer(fromId, toId, amount, description, date) {
  return processNewTransaction({
    date: date || new Date().toISOString().substring(0, 10),
    type: "transfer",
    amount: amount,
    fromAccountId: fromId,
    toAccountId: toId,
    categoryId: "cat_transfer",
    description: description || "Linked Fund Transfer",
    notes: "Direct transfer between linked accounts"
  });
}

/**
 * Reconciles every account's currentBalance:
 * Balance = initialBalance + Sum(Inflows to account) - Sum(Outflows from account)
 */
function reconcileAllBalances() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accountsSheet = ss.getSheetByName("Accounts");
  var txSheet = ss.getSheetByName("Transactions");
  if (!accountsSheet || !txSheet) return;

  var accountsData = accountsSheet.getDataRange().getValues();
  if (accountsData.length <= 1) return;

  var txData = txSheet.getDataRange().getValues();
  var accHeaders = accountsData[0];
  var idIdx = accHeaders.indexOf("id");
  var initBalIdx = accHeaders.indexOf("initialBalance");
  var currBalIdx = accHeaders.indexOf("currentBalance");
  var updateIdx = accHeaders.indexOf("updatedAt");

  if (idIdx === -1 || currBalIdx === -1) return;

  var netFlows = {};
  for (var i = 1; i < accountsData.length; i++) {
    var accId = accountsData[i][idIdx];
    var initial = parseFloat(accountsData[i][initBalIdx]) || 0;
    netFlows[accId] = initial;
  }

  if (txData.length > 1) {
    var txHeaders = txData[0];
    var amountIdx = txHeaders.indexOf("amount");
    var fromIdx = txHeaders.indexOf("fromAccountId");
    var toIdx = txHeaders.indexOf("toAccountId");

    for (var j = 1; j < txData.length; j++) {
      var row = txData[j];
      var amt = parseFloat(row[amountIdx]) || 0;
      var fromAcc = row[fromIdx];
      var toAcc = row[toIdx];

      if (fromAcc && netFlows.hasOwnProperty(fromAcc)) {
        netFlows[fromAcc] -= amt;
      }
      if (toAcc && netFlows.hasOwnProperty(toAcc)) {
        netFlows[toAcc] += amt;
      }
    }
  }

  for (var k = 1; k < accountsData.length; k++) {
    var aId = accountsData[k][idIdx];
    if (netFlows.hasOwnProperty(aId)) {
      accountsSheet.getRange(k + 1, currBalIdx + 1).setValue(netFlows[aId]);
      if (updateIdx !== -1) {
        accountsSheet.getRange(k + 1, updateIdx + 1).setValue(new Date().toISOString());
      }
    }
  }
}
`;

// 4. backend/Lifecycle.gs
const BACKEND_LIFECYCLE_GS = `/**
 * @file backend/Lifecycle.gs
 * 5-year rolling data retention, automatic time trigger, and archival.
 */

/**
 * Identifies transactions older than 5 years (today - 5 years).
 * Moves them to 'Archive_5Yr' sheet and purges them from 'Transactions'.
 */
function runFiveYearArchivalAndRecycle() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var archiveSheet = ss.getSheetByName("Archive_5Yr");
  if (!txSheet) return 0;

  var txData = txSheet.getDataRange().getValues();
  if (txData.length <= 1) return 0;

  var headers = txData[0];
  var dateIdx = headers.indexOf("date");
  if (dateIdx === -1) return 0;

  var now = new Date();
  var cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  var cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), "yyyy-MM-dd");

  var rowsToKeep = [headers];
  var rowsToArchive = [];

  for (var i = 1; i < txData.length; i++) {
    var row = txData[i];
    var txDate = row[dateIdx];
    var dateString = txDate instanceof Date
      ? Utilities.formatDate(txDate, Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(txDate).substring(0, 10);

    if (dateString && dateString < cutoffStr) {
      rowsToArchive.push(row);
    } else {
      rowsToKeep.push(row);
    }
  }

  if (rowsToArchive.length === 0) return 0;

  if (!archiveSheet) {
    archiveSheet = ss.insertSheet("Archive_5Yr");
    archiveSheet.appendRow(headers);
  }

  for (var a = 0; a < rowsToArchive.length; a++) {
    archiveSheet.appendRow(rowsToArchive[a]);
  }

  txSheet.clearContents();
  txSheet.getRange(1, 1, rowsToKeep.length, headers.length).setValues(rowsToKeep);
  return rowsToArchive.length;
}

/**
 * Installs weekly time trigger to automate the 5-year cleanup.
 */
function installWeeklyArchivalTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runFiveYearArchivalAndRecycle") {
      SpreadsheetApp.getUi().alert("Weekly archival trigger is already active!");
      return;
    }
  }

  ScriptApp.newTrigger("runFiveYearArchivalAndRecycle")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();

  SpreadsheetApp.getUi().alert("Weekly automated trigger enabled: Runs every Sunday at 2 AM.");
}
`;

// 5. backend/Menu.gs
const BACKEND_MENU_GS = `/**
 * @file backend/Menu.gs
 * Custom Google Spreadsheet UI Menu with CI/CD Webhook controls.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🌿 Shongsar (সংসার)")
    .addItem("🌐 Open Web App URL", "openWebAppUrlDialog")
    .addItem("🔄 Reconcile Balances", "reconcileAllBalances")
    .addItem("⏳ Run 5-Year Archival Now", "menuRunArchival")
    .addItem("⏰ Setup Weekly 5-Year Trigger", "installWeeklyArchivalTrigger")
    .addSeparator()
    .addItem("🔑 Configure CI/CD Deploy Key", "menuConfigureDeployKey")
    .addItem("🧪 Test CI/CD Permissions & Authorize", "menuTestCicdPermissions")
    .addItem("📋 View GitHub CI/CD Info", "menuShowCicdInfo")
    .addSeparator()
    .addItem("ℹ️ About Shongsar Engine", "showAboutDialog")
    .addToUi();
}

/**
 * Allows the user to configure or change their CI/CD secret deploy key
 * directly from the Google Sheets UI without needing Google Cloud console.
 */
function menuConfigureDeployKey() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var currentKey = props.getProperty("DEPLOY_KEY") || "";

  var promptMessage = currentKey
    ? "A Deploy Key is currently configured.\\n\\nEnter a new Deploy Key (or leave blank to keep current):"
    : "Enter a secret passphrase for GitHub Actions CI/CD deployment:\\n(e.g., a strong password or random phrase)";

  var response = ui.prompt("🔑 Configure CI/CD Deploy Key", promptMessage, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() === ui.Button.OK) {
    var newKey = response.getResponseText().trim();
    if (newKey) {
      props.setProperty("DEPLOY_KEY", newKey);
      ui.alert(
        "✅ Deploy Key Saved!",
        "Your secret Deploy Key has been saved to this Google Sheet.\\n\\n" +
        "Now add this exact value as DEPLOY_KEY in your GitHub repository:\\n" +
        "GitHub > Settings > Secrets and variables > Actions > New repository secret.",
        ui.ButtonSet.OK
      );
    } else if (!currentKey) {
      ui.alert("⚠️ Notice", "No key entered. Deployments via GitHub Actions will be rejected until a key is saved.", ui.ButtonSet.OK);
    }
  }
}

/**
 * Displays all information needed to configure GitHub Actions Secrets.
 */
function menuShowCicdInfo() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var scriptId = ScriptApp.getScriptId();
  var webAppUrl = ScriptApp.getService().getUrl() || "(Deploy as Web App first to get URL)";
  var isKeyConfigured = !!props.getProperty("DEPLOY_KEY");

  var html = '<div style="font-family:system-ui,-apple-system,sans-serif;padding:16px;color:#0f172a;line-height:1.5;">' +
    '<h3 style="margin-top:0;color:#059669;display:flex;align-items:center;gap:8px;">🚀 GitHub CI/CD Configuration</h3>' +
    '<p style="font-size:12px;color:#475569;">Copy these details into your <b>GitHub Repository Secrets</b> (Settings &gt; Secrets and variables &gt; Actions):</p>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px;">' +
    '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">1. WEBAPP_URL</div>' +
    '<div style="font-family:monospace;font-size:11px;background:#ffffff;border:1px solid #cbd5e1;padding:6px;border-radius:4px;word-break:break-all;margin-top:4px;">' + webAppUrl + '</div>' +
    '</div>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px;">' +
    '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">2. DEPLOY_KEY</div>' +
    '<div style="font-size:12px;margin-top:4px;color:' + (isKeyConfigured ? '#16a34a' : '#dc2626') + ';font-weight:600;">' +
    (isKeyConfigured ? '✅ Configured in this Spreadsheet' : '❌ Not set yet — Click "Configure CI/CD Deploy Key" to set') +
    '</div>' +
    '</div>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px;">' +
    '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">3. Script ID (Reference)</div>' +
    '<div style="font-family:monospace;font-size:11px;background:#ffffff;border:1px solid #cbd5e1;padding:6px;border-radius:4px;word-break:break-all;margin-top:4px;">' + scriptId + '</div>' +
    '</div>' +
    '<p style="font-size:11px;color:#64748b;">No local Clasp login or CLASPRC_JSON is required! GitHub Actions will push updates via secure webhook.</p>' +
    '</div>';

  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(360), "GitHub CI/CD Info");
}

/**
 * Validates whether the Apps Script API is enabled and that oauthScopes
 * includes permission to update project content and deployments.
 */
function menuTestCicdPermissions() {
  var ui = SpreadsheetApp.getUi();
  var scriptId = ScriptApp.getScriptId();
  var authToken = ScriptApp.getOAuthToken();

  try {
    var testUrl = "https://script.googleapis.com/v1/projects/" + scriptId;
    var resp = UrlFetchApp.fetch(testUrl, {
      method: "get",
      headers: { Authorization: "Bearer " + authToken },
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();
    var body = resp.getContentText();

    if (code === 200) {
      ui.alert(
        "✅ CI/CD Ready & Authorized!",
        "Google Apps Script API is enabled and your script has valid project management scopes.\\n\\n" +
        "GitHub Actions webhook deployments will succeed! 🎉",
        ui.ButtonSet.OK
      );
    } else if (code === 403 && body.indexOf("ACCESS_TOKEN_SCOPE_INSUFFICIENT") !== -1) {
      ui.alert(
        "❌ Insufficient Scopes (403)",
        "The script does not yet have the 'script.projects' scope authorized.\\n\\n" +
        "Fix in 3 steps:\\n" +
        "1. In Apps Script Editor: Project Settings > Check 'Show appsscript.json manifest file in editor'.\\n" +
        "2. Copy the 'oauthScopes' array from GitHub's appsscript.json into your editor's appsscript.json.\\n" +
        "3. Select any function and click 'Run' to grant permissions in the Google authorization popup.",
        ui.ButtonSet.OK
      );
    } else if (code === 403 && (body.indexOf("SERVICE_DISABLED") !== -1 || body.indexOf("not enabled") !== -1 || body.indexOf("has not enabled") !== -1 || body.indexOf("has not been used") !== -1)) {
      ui.alert(
        "❌ Google Apps Script API Disabled (403)",
        "The Google Apps Script API is not activated for this script's Google Cloud project.\\n\\n" +
        "If opening the activation link gives 'You need additional access / missing resourcemanager.projects.get', follow these 3 quick steps:\\n\\n" +
        "1. Create a free project at https://console.cloud.google.com/projectcreate\\n" +
        "2. Enable Google Apps Script API at https://console.cloud.google.com/apis/library/script.googleapis.com\\n" +
        "3. In Apps Script Editor: Project Settings (⚙️) > Google Cloud Platform (GCP) Project > 'Change project' > paste your numeric Project Number and save.",
        ui.ButtonSet.OK
      );
    } else {
      ui.alert("⚠️ API Response (" + code + ")", body, ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert("❌ Error Testing Permissions", err.toString(), ui.ButtonSet.OK);
  }
}

function openWebAppUrlDialog() {
  var url = ScriptApp.getService().getUrl();
  var html = '<div style="font-family:sans-serif;padding:16px;">' +
    '<h3 style="color:#059669;margin-top:0;">Your Shongsar Web App URL</h3>' +
    '<p style="font-size:13px;color:#475569;">Open this link in your browser or bookmark it on your mobile device:</p>' +
    '<p><a href="' + url + '" target="_blank" style="color:#2563eb;word-break:break-all;font-size:12px;">' + url + '</a></p>' +
    '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(180), "Shongsar Web App");
}

function menuRunArchival() {
  var count = runFiveYearArchivalAndRecycle();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    count > 0 ? "Archived and recycled " + count + " records older than 5 years." : "No records older than 5 years found.",
    "5-Year Archival",
    5
  );
}

function showAboutDialog() {
  SpreadsheetApp.getUi().alert(
    "Shongsar (সংসার) Family Ledger Engine v1.0\\n\\n" +
    "100% Free Google Apps Script Web App Host & Financial Database.\\n" +
    "All data remains private in your Google Account."
  );
}
`;

// 6. frontend/Styles.html
const FRONTEND_STYLES_HTML = `<!-- frontend/Styles.html -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          slate: {
            850: '#111827',
            950: '#0B1120',
          }
        }
      }
    }
  }
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: dark;
  }
  html, body {
    background-color: #0B1120 !important;
    color: #F1F5F9 !important;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
  .font-mono {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  input[type="month"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
    cursor: pointer;
  }
  /* Polished dark theme scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #0B1120;
  }
  ::-webkit-scrollbar-thumb {
    background: #1E293B;
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
</style>
`;

// 7. frontend/Index.html
const FRONTEND_INDEX_HTML = `<!-- frontend/Index.html -->
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Shongsar — Family Budget &amp; Wealth Manager</title>
  <?!= include('frontend/Styles'); ?>
</head>
<body class="bg-[#0B1120] text-slate-100 min-h-screen pb-20 selection:bg-emerald-500/30">
  
  <!-- Top Navigation Bar -->
  <header class="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-[#1E293B]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-6 h-16">
      
      <!-- Zone 1: Wordmark -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
          শ
        </div>
        <div class="flex flex-col">
          <span class="text-base font-bold text-white tracking-tight leading-none">Shongsar</span>
          <span class="text-[10px] text-slate-400 font-medium tracking-wider mt-0.5">সংসার · FAMILY WEALTH</span>
        </div>
      </div>

      <!-- Zone 2: Navigation Links -->
      <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button onclick="switchTab('overview')" id="nav-overview" class="tab-link text-emerald-400 font-bold border-b-2 border-emerald-500 py-1 whitespace-nowrap transition-colors">Overview</button>
        <button onclick="switchTab('accounts')" id="nav-accounts" class="tab-link hover:text-slate-200 py-1 whitespace-nowrap transition-colors">Linked Funds</button>
        <button onclick="switchTab('transactions')" id="nav-transactions" class="tab-link hover:text-slate-200 py-1 whitespace-nowrap transition-colors">Transactions</button>
        <button onclick="switchTab('budgets')" id="nav-budgets" class="tab-link hover:text-slate-200 py-1 whitespace-nowrap transition-colors">Envelopes</button>
        <button onclick="switchTab('debts')" id="nav-debts" class="tab-link hover:text-slate-200 py-1 whitespace-nowrap transition-colors">Debts & Assets</button>
        <button onclick="switchTab('lifecycle')" id="nav-lifecycle" class="tab-link hover:text-slate-200 py-1 whitespace-nowrap transition-colors">5-Yr Retention</button>
      </nav>

      <!-- Zone 3: Currency Badge & Database Link -->
      <div class="flex items-center gap-2.5 shrink-0">
        <span class="px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded-xl">৳ BDT</span>
        <a id="sheet-direct-link" href="#" target="_blank" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-colors">
          <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
          <span>Sheets Database</span>
        </a>
      </div>

    </div>
  </header>

  <!-- Main Content Area -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    
    <!-- Tab 1: Overview -->
    <section id="tab-overview" class="tab-content space-y-6">
      
      <!-- Top Banner & Command Center Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">
            Family Financial Command Center
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">
            Real-time balance propagation backed by personal Google Spreadsheet database
          </p>
        </div>

        <!-- Action Controls -->
        <div class="flex items-center gap-2">
          <!-- Month Selector -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200">
            <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <input
              type="month"
              id="overview-month-selector"
              onchange="onMonthChange(this.value)"
              class="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-medium"
            />
          </div>

          <button
            onclick="openModal('transferModal')"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-colors whitespace-nowrap shadow-xs"
          >
            <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
            <span>Transfer Funds</span>
          </button>

          <button
            onclick="openModal('txModal')"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors whitespace-nowrap shadow-xs"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      <!-- 4 High-Level KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Net Worth Card -->
        <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Family Total Net Worth</span>
            <span class="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
            </span>
          </div>
          <div id="kpi-networth" class="text-3xl font-bold font-mono tracking-tight text-white">৳ 0</div>
          <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Liquid: <span id="kpi-sub-liquid" class="font-mono text-slate-300">৳ 0</span></span>
            <span aria-hidden="true">·</span>
            <span>Invested: <span id="kpi-sub-invested" class="font-mono text-slate-300">৳ 0</span></span>
          </div>
        </div>

        <!-- Liquid Cash & Bank -->
        <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm">
          <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Available Liquid Funds</span>
            <span class="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
            </span>
          </div>
          <div id="kpi-liquid" class="text-3xl font-bold font-mono tracking-tight text-white">৳ 0</div>
          <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Emergency Pot: <span id="kpi-sub-emergency" class="font-mono text-slate-300">৳ 0</span></span>
          </div>
        </div>

        <!-- Monthly Inflow -->
        <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm">
          <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Monthly Total Inflow</span>
            <span class="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </span>
          </div>
          <div id="kpi-income" class="text-3xl font-bold font-mono tracking-tight text-emerald-400">৳ 0</div>
          <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Savings Rate:</span>
            <span id="kpi-sub-savingsrate" class="font-mono font-semibold text-emerald-400">0%</span>
          </div>
        </div>

        <!-- Monthly Expenses & Burn -->
        <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm">
          <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Monthly Expenses & Burn</span>
            <span class="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            </span>
          </div>
          <div id="kpi-expense" class="text-3xl font-bold font-mono tracking-tight text-white">৳ 0</div>
          <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Net Monthly Surplus:</span>
            <span id="kpi-sub-surplus" class="font-mono font-semibold text-emerald-400">৳ 0</span>
          </div>
        </div>

      </div>

      <!-- Main 2-Column Split: Linked Accounts Overview + Envelope Progress -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: Linked Accounts Snapshot & Recent Table -->
        <div class="lg:col-span-2 space-y-6">
          
          <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-white">Linked Source Accounts</h3>
                <p class="text-xs text-slate-400">Double-entry real-time balances</p>
              </div>
              <button onclick="switchTab('accounts')" class="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                Manage All (<span id="accounts-count">0</span>) →
              </button>
            </div>
            <div id="overview-accounts-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
          </div>

          <!-- Recent Transactions Card -->
          <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-white">Recent Transactions</h3>
                <p class="text-xs text-slate-400">Latest activity in this period</p>
              </div>
              <button onclick="switchTab('transactions')" class="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                View Full Ledger →
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-[#1E293B] text-slate-400 font-semibold uppercase text-[10px]">
                    <th class="py-2.5 px-3">Date</th>
                    <th class="py-2.5 px-3">Description</th>
                    <th class="py-2.5 px-3">Category</th>
                    <th class="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody id="overview-recent-tx-body" class="divide-y divide-slate-800/60"></tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Right Col: Monthly Envelopes -->
        <div class="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white">Monthly Envelopes</h3>
              <p class="text-xs text-slate-400">Budget allocation &amp; spent</p>
            </div>
            <button onclick="switchTab('budgets')" class="text-xs font-medium text-emerald-400 hover:text-emerald-300">
              Details →
            </button>
          </div>
          <div id="overview-envelopes-list" class="space-y-3.5"></div>
        </div>

      </div>

    </section>

    <!-- Tab 2: Linked Funds -->
    <section id="tab-accounts" class="tab-content hidden space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Linked Accounts &amp; Financial Pots</h2>
          <p class="text-xs text-slate-400">Primary bank accounts, cash wallets, and earmarked funds</p>
        </div>
        <button onclick="openModal('transferModal')" class="px-3.5 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded-xl hover:bg-emerald-900/60 transition-colors">Transfer Funds</button>
      </div>
      <div id="accounts-full-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </section>

    <!-- Tab 3: Transactions Ledger -->
    <section id="tab-transactions" class="tab-content hidden space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Transaction Ledger</h2>
          <p class="text-xs text-slate-400">Double-entry verified records backed by Google Sheets</p>
        </div>
        <button onclick="openModal('txModal')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs">+ Record Transaction</button>
      </div>
      <div class="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-800/40 border-b border-[#1E293B] text-slate-400 font-semibold uppercase text-[10px]">
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4">Description</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Account</th>
              <th class="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody id="ledger-table-body" class="divide-y divide-slate-800/60"></tbody>
        </table>
      </div>
    </section>

    <!-- Tab 4: Budget Envelopes -->
    <section id="tab-budgets" class="tab-content hidden space-y-4">
      <div>
        <h2 class="text-lg font-bold text-white">Monthly Category Budget Envelopes</h2>
        <p class="text-xs text-slate-400">Zero-based envelope allocations and remaining limits</p>
      </div>
      <div id="envelopes-full-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </section>

    <!-- Tab 5: Debts & Assets -->
    <section id="tab-debts" class="tab-content hidden space-y-6">
      <div class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-white">Debts &amp; Counterparty Loans</h2>
          <p class="text-xs text-slate-400">Track money owed to others and receivables</p>
        </div>
        <div id="debts-full-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </div>
      <div class="space-y-3 pt-2">
        <div>
          <h2 class="text-lg font-bold text-white">Investments &amp; Asset Valuations</h2>
          <p class="text-xs text-slate-400">Long-term capital assets and expected yield</p>
        </div>
        <div id="investments-full-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
      </div>
    </section>

    <!-- Tab 6: 5-Year Lifecycle Retention -->
    <section id="tab-lifecycle" class="tab-content hidden space-y-4">
      <div class="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-sm space-y-4">
        <h2 class="text-base font-bold text-white">5-Year Historical Retention &amp; Rolling Archival</h2>
        <p class="text-xs text-slate-400 leading-relaxed max-w-xl">
          Google Apps Script enforces an automatic 5-year retention lifecycle. Any transaction older than 5 years is safely preserved in the <span class="font-mono text-emerald-400">Archive_5Yr</span> sheet while keeping the active ledger high-performance.
        </p>
        <div class="pt-2">
          <button onclick="runArchival()" id="archivalBtn" class="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors">
            Run 5-Year Archival Now
          </button>
        </div>
      </div>
    </section>

  </main>

  <!-- Mobile Bottom Navigation Bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-t border-[#1E293B] px-3 py-2 flex items-center justify-around">
    <button onclick="switchTab('overview')" id="mobile-nav-overview" class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium text-emerald-400">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      <span>Overview</span>
    </button>
    <button onclick="switchTab('accounts')" id="mobile-nav-accounts" class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium text-slate-400 hover:text-slate-200">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
      <span>Funds</span>
    </button>
    <button onclick="openModal('txModal')" class="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-600 text-white shadow-lg -mt-5 hover:bg-emerald-500 transition-transform active:scale-95">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    </button>
    <button onclick="switchTab('transactions')" id="mobile-nav-transactions" class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium text-slate-400 hover:text-slate-200">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/></svg>
      <span>Ledger</span>
    </button>
    <button onclick="switchTab('budgets')" id="mobile-nav-budgets" class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium text-slate-400 hover:text-slate-200">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
      <span>Envelopes</span>
    </button>
  </nav>

  <!-- Modals -->
  <div id="txModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
    <div class="w-full max-w-md bg-[#0F172A] rounded-2xl border border-slate-700 p-5 shadow-2xl space-y-4 text-slate-100">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white">Record Transaction</h3>
        <button onclick="closeModal('txModal')" class="text-slate-400 hover:text-slate-200 text-base">✕</button>
      </div>
      <form onsubmit="submitTransaction(event)" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Type</label>
          <select id="modal-tx-type" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Amount (৳)</label>
          <input type="number" id="modal-tx-amount" step="any" min="0.01" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 font-mono text-sm text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Description</label>
          <input type="text" id="modal-tx-desc" required placeholder="e.g. Weekly Provisions" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Account</label>
          <select id="modal-tx-account" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"></select>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button type="button" onclick="closeModal('txModal')" class="px-3.5 py-1.5 text-slate-400 hover:text-slate-200">Cancel</button>
          <button type="submit" class="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition-colors">Save Entry</button>
        </div>
      </form>
    </div>
  </div>

  <div id="transferModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
    <div class="w-full max-w-md bg-[#0F172A] rounded-2xl border border-slate-700 p-5 shadow-2xl space-y-4 text-slate-100">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white">Transfer Funds</h3>
        <button onclick="closeModal('transferModal')" class="text-slate-400 hover:text-slate-200 text-base">✕</button>
      </div>
      <form onsubmit="submitTransfer(event)" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Amount (৳)</label>
          <input type="number" id="modal-tr-amount" step="any" min="0.01" required placeholder="0.00" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 font-mono text-sm text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">From Source Account</label>
          <select id="modal-tr-from" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"></select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">To Destination Account</label>
          <select id="modal-tr-to" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"></select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-300">Transfer Memo</label>
          <input type="text" id="modal-tr-desc" placeholder="e.g. ATM cash withdrawal or emergency buffer" class="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button type="button" onclick="closeModal('transferModal')" class="px-3.5 py-1.5 text-slate-400 hover:text-slate-200">Cancel</button>
          <button type="submit" class="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition-colors">Execute Transfer</button>
        </div>
      </form>
    </div>
  </div>

  <?!= include('frontend/Scripts'); ?>
</body>
</html>
`;

// 8. frontend/Scripts.html
const FRONTEND_SCRIPTS_HTML = `<!-- frontend/Scripts.html -->
<script>
  var state = { accounts: [], transactions: [], budgets: [], categories: [], debts: [], investments: [], spreadsheetUrl: '#' };
  var selectedMonth = new Date().toISOString().substring(0, 7);

  function formatBDT(amount) {
    var val = parseFloat(amount) || 0;
    var abs = Math.abs(val);
    var parts = Math.round(abs).toString();
    if (parts.length > 3) {
      var last3 = parts.substring(parts.length - 3);
      var rest = parts.substring(0, parts.length - 3);
      parts = rest.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ",") + "," + last3;
    }
    return (val < 0 ? "-৳ " : "৳ ") + parts;
  }

  function onMonthChange(val) {
    if (val) {
      selectedMonth = val;
      renderUI();
    }
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.add('hidden'); });
    document.querySelectorAll('.tab-link').forEach(function(el) {
      el.classList.remove('text-emerald-400', 'font-bold', 'border-b-2', 'border-emerald-500');
      el.classList.add('hover:text-slate-200');
    });
    var target = document.getElementById('tab-' + tabId);
    if (target) target.classList.remove('hidden');
    var navBtn = document.getElementById('nav-' + tabId);
    if (navBtn) {
      navBtn.classList.add('text-emerald-400', 'font-bold', 'border-b-2', 'border-emerald-500');
    }
  }

  function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

  function renderUI() {
    // 1. Month Picker
    var monthInput = document.getElementById('overview-month-selector');
    if (monthInput && monthInput.value !== selectedMonth) {
      monthInput.value = selectedMonth;
    }

    // 2. Liquid & Net Worth Calculation
    var liquid = 0, savings = 0;
    state.accounts.forEach(function(a) {
      var b = parseFloat(a.currentBalance) || 0;
      if (a.type === 'cash' || a.type === 'bank' || a.type === 'mobile_banking') {
        liquid += b;
      } else if (a.type === 'savings_pot') {
        savings += b;
      }
    });

    var invested = 0;
    state.investments.forEach(function(inv) {
      invested += (parseFloat(inv.currentValuation) || 0);
    });

    var debtsOwed = 0;
    state.debts.forEach(function(d) {
      if (d.type === 'owed_by_us' && d.status !== 'cleared') {
        debtsOwed += (parseFloat(d.remainingAmount) || 0);
      }
    });

    var networth = liquid + savings + invested - debtsOwed;

    // 3. Monthly Income & Expense for selectedMonth
    var income = 0, expense = 0;
    var monthTxs = [];
    state.transactions.forEach(function(t) {
      var d = String(t.date || '');
      if (d.startsWith(selectedMonth)) {
        monthTxs.push(t);
        var amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') income += amt;
        if (t.type === 'expense') expense += amt;
      }
    });

    var savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
    var surplus = income - expense;

    // 4. Update KPI Values & Submetrics
    document.getElementById('kpi-networth').textContent = formatBDT(networth);
    document.getElementById('kpi-sub-liquid').textContent = formatBDT(liquid);
    document.getElementById('kpi-sub-invested').textContent = formatBDT(invested);

    document.getElementById('kpi-liquid').textContent = formatBDT(liquid);
    document.getElementById('kpi-sub-emergency').textContent = formatBDT(savings);

    document.getElementById('kpi-income').textContent = formatBDT(income);
    document.getElementById('kpi-sub-savingsrate').textContent = savingsRate + '%';

    document.getElementById('kpi-expense').textContent = formatBDT(expense);
    var surplusEl = document.getElementById('kpi-sub-surplus');
    surplusEl.textContent = formatBDT(surplus);
    if (surplus >= 0) {
      surplusEl.className = "font-mono font-semibold text-emerald-400";
    } else {
      surplusEl.className = "font-mono font-semibold text-rose-400";
    }

    // 5. Account Count & Linked Pots
    document.getElementById('accounts-count').textContent = state.accounts.length;
    var accHtml = '';
    state.accounts.slice(0, 4).forEach(function(a) {
      accHtml += '<div class="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:border-slate-700 transition-colors">' +
        '<div class="flex items-center justify-between mb-1.5">' +
          '<span class="text-xs font-semibold text-white truncate">' + a.name + '</span>' +
          '<span class="text-[10px] text-slate-400 uppercase tracking-wider font-mono">' + (a.institution || '') + '</span>' +
        '</div>' +
        '<div class="text-lg font-bold font-mono tabular-nums text-white">' + formatBDT(a.currentBalance) + '</div>' +
        '<div class="mt-1 text-[11px] text-slate-400 truncate">' + (a.notes || 'Linked fund') + '</div>' +
      '</div>';
    });
    document.getElementById('overview-accounts-grid').innerHTML = accHtml;

    // Full accounts tab grid
    var fullAccHtml = '';
    state.accounts.forEach(function(a) {
      fullAccHtml += '<div class="p-4 rounded-xl border border-slate-800 bg-[#0F172A] shadow-xs space-y-2">' +
        '<div class="flex items-center justify-between">' +
          '<span class="text-xs font-semibold text-white">' + a.name + '</span>' +
          '<span class="text-[10px] text-slate-400 uppercase font-mono px-2 py-0.5 bg-slate-800 rounded">' + (a.type || 'account') + '</span>' +
        '</div>' +
        '<div class="text-xl font-bold font-mono text-white">' + formatBDT(a.currentBalance) + '</div>' +
        '<div class="text-xs text-slate-400">' + (a.institution || 'Personal Fund') + '</div>' +
      '</div>';
    });
    document.getElementById('accounts-full-grid').innerHTML = fullAccHtml;

    // 6. Recent Transactions Table (Overview + Ledger Tab)
    var recentTxs = state.transactions.slice(0, 5);
    var recentHtml = '';
    recentTxs.forEach(function(t) {
      var isInc = t.type === 'income';
      recentHtml += '<tr class="hover:bg-slate-800/30">' +
        '<td class="py-2.5 px-3 font-mono text-slate-400 text-[11px]">' + String(t.date || '').substring(0, 10) + '</td>' +
        '<td class="py-2.5 px-3 font-medium text-slate-200">' + t.description + '</td>' +
        '<td class="py-2.5 px-3 text-slate-400">' + (t.categoryId || 'General') + '</td>' +
        '<td class="py-2.5 px-3 text-right font-mono font-semibold ' + (isInc ? 'text-emerald-400' : 'text-slate-100') + '">' + (isInc ? '+' : '-') + formatBDT(t.amount) + '</td>' +
      '</tr>';
    });
    document.getElementById('overview-recent-tx-body').innerHTML = recentHtml || '<tr><td colspan="4" class="py-4 text-center text-slate-500">No transactions recorded yet</td></tr>';

    var ledgerHtml = '';
    state.transactions.slice(0, 50).forEach(function(t) {
      var isInc = t.type === 'income';
      ledgerHtml += '<tr class="hover:bg-slate-800/30">' +
        '<td class="py-2.5 px-4 font-mono text-slate-400 text-[11px]">' + String(t.date || '').substring(0, 10) + '</td>' +
        '<td class="py-2.5 px-4 font-medium text-slate-200">' + t.description + '</td>' +
        '<td class="py-2.5 px-4 text-slate-400">' + (t.categoryId || 'General') + '</td>' +
        '<td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">' + (t.fromAccountId || '-') + '</td>' +
        '<td class="py-2.5 px-4 text-right font-mono font-semibold ' + (isInc ? 'text-emerald-400' : 'text-slate-100') + '">' + (isInc ? '+' : '-') + formatBDT(t.amount) + '</td>' +
      '</tr>';
    });
    document.getElementById('ledger-table-body').innerHTML = ledgerHtml || '<tr><td colspan="5" class="py-6 text-center text-slate-500">No records found</td></tr>';

    // 7. Monthly Envelopes List
    var envHtml = '';
    var fullEnvHtml = '';
    var categories = state.categories.filter(function(c) { return c.type === 'expense'; });
    if (categories.length === 0) {
      categories = [
        { id: 'cat_rent', name: 'Housing & Rent', defaultMonthlyBudget: 45000 },
        { id: 'cat_groceries', name: 'Groceries & Food', defaultMonthlyBudget: 35000 },
        { id: 'cat_utilities', name: 'Utilities & Internet', defaultMonthlyBudget: 9500 },
        { id: 'cat_healthcare', name: 'Healthcare & Medicine', defaultMonthlyBudget: 7500 }
      ];
    }
    categories.forEach(function(c) {
      var spent = 0;
      monthTxs.forEach(function(t) {
        if (t.categoryId === c.id && t.type === 'expense') spent += (parseFloat(t.amount) || 0);
      });
      var allocated = parseFloat(c.defaultMonthlyBudget) || 10000;
      var pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
      var isOver = spent > allocated;

      envHtml += '<div class="space-y-1.5">' +
        '<div class="flex items-center justify-between text-xs">' +
          '<span class="font-medium text-slate-200">' + c.name + '</span>' +
          '<span class="font-mono text-slate-400">' + formatBDT(spent) + ' / ' + formatBDT(allocated) + '</span>' +
        '</div>' +
        '<div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">' +
          '<div class="h-full rounded-full ' + (isOver ? 'bg-rose-500' : 'bg-emerald-500') + '" style="width: ' + pct + '%"></div>' +
        '</div>' +
      '</div>';

      fullEnvHtml += '<div class="p-4 rounded-xl border border-slate-800 bg-[#0F172A] space-y-2">' +
        '<div class="flex justify-between items-center text-xs">' +
          '<span class="font-semibold text-white">' + c.name + '</span>' +
          '<span class="font-mono text-slate-400">' + pct + '%</span>' +
        '</div>' +
        '<div class="text-base font-bold font-mono text-white">' + formatBDT(spent) + ' <span class="text-xs text-slate-400 font-normal">of ' + formatBDT(allocated) + '</span></div>' +
        '<div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">' +
          '<div class="h-full ' + (isOver ? 'bg-rose-500' : 'bg-emerald-500') + '" style="width: ' + pct + '%"></div>' +
        '</div>' +
      '</div>';
    });
    document.getElementById('overview-envelopes-list').innerHTML = envHtml;
    document.getElementById('envelopes-full-grid').innerHTML = fullEnvHtml;

    // 8. Debts & Investments
    var debtsHtml = '';
    state.debts.forEach(function(d) {
      debtsHtml += '<div class="p-4 rounded-xl border border-slate-800 bg-[#0F172A] space-y-1">' +
        '<div class="flex justify-between text-xs font-semibold text-white"><span>' + d.title + '</span><span class="text-rose-400 font-mono">' + formatBDT(d.remainingAmount) + '</span></div>' +
        '<div class="text-[11px] text-slate-400">' + (d.counterparty || 'Counterparty') + '</div>' +
      '</div>';
    });
    document.getElementById('debts-full-grid').innerHTML = debtsHtml || '<p class="text-xs text-slate-500">No active debts</p>';

    var invHtml = '';
    state.investments.forEach(function(i) {
      invHtml += '<div class="p-4 rounded-xl border border-slate-800 bg-[#0F172A] space-y-1">' +
        '<div class="flex justify-between text-xs font-semibold text-white"><span>' + i.name + '</span><span class="text-emerald-400 font-mono">' + formatBDT(i.currentValuation) + '</span></div>' +
        '<div class="text-[11px] text-slate-400">' + (i.type || 'Asset') + '</div>' +
      '</div>';
    });
    document.getElementById('investments-full-grid').innerHTML = invHtml || '<p class="text-xs text-slate-500">No investments listed</p>';

    // 9. Dropdown Select Options
    var optHtml = '';
    state.accounts.forEach(function(a) {
      optHtml += '<option value="' + a.id + '">' + a.name + ' (' + formatBDT(a.currentBalance) + ')</option>';
    });
    document.getElementById('modal-tx-account').innerHTML = optHtml;
    document.getElementById('modal-tr-from').innerHTML = optHtml;
    document.getElementById('modal-tr-to').innerHTML = optHtml;

    // 10. Direct link to Google Sheets
    if (state.spreadsheetUrl && state.spreadsheetUrl !== '#') {
      var sheetLink = document.getElementById('sheet-direct-link');
      if (sheetLink) sheetLink.href = state.spreadsheetUrl;
    }
  }

  function loadData() {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run.withSuccessHandler(function(data) {
        if (data) {
          state = data;
          renderUI();
        }
      }).withFailureHandler(function(err) {
        console.error("RPC Error:", err);
      }).apiGetFullData();
    }
  }

  function submitTransaction(e) {
    e.preventDefault();
    var tx = {
      type: document.getElementById('modal-tx-type').value,
      amount: parseFloat(document.getElementById('modal-tx-amount').value),
      description: document.getElementById('modal-tx-desc').value,
      fromAccountId: document.getElementById('modal-tx-account').value,
      date: new Date().toISOString().substring(0, 10)
    };
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run.withSuccessHandler(function() {
        closeModal('txModal');
        loadData();
      }).apiRecordTransaction(tx);
    }
  }

  function submitTransfer(e) {
    e.preventDefault();
    var fromId = document.getElementById('modal-tr-from').value;
    var toId = document.getElementById('modal-tr-to').value;
    var amount = parseFloat(document.getElementById('modal-tr-amount').value);
    var desc = document.getElementById('modal-tr-desc').value;

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run.withSuccessHandler(function() {
        closeModal('transferModal');
        loadData();
      }).apiTransferFunds(fromId, toId, amount, desc);
    }
  }

  function runArchival() {
    var btn = document.getElementById('archivalBtn');
    btn.textContent = "Archiving...";
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run.withSuccessHandler(function(count) {
        alert("Archival complete! Recycled " + count + " transactions older than 5 years.");
        btn.textContent = "Run 5-Year Archival Now";
        loadData();
      }).apiRunArchival();
    }
  }

  window.onload = loadData;
</script>
`;

// CI/CD Configuration Templates (Zero-Token Webhook Pipeline)
export const GITHUB_DEPLOY_YML = `name: Deploy to Google Apps Script (Webhook CI/CD)

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Google Apps Script Web App
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Deploy Code to Apps Script Webhook
        env:
          WEBAPP_URL: \${{ secrets.WEBAPP_URL }}
          DEPLOY_KEY: \${{ secrets.DEPLOY_KEY }}
          DEPLOYMENT_ID: \${{ secrets.DEPLOYMENT_ID }}
        run: node .github/scripts/deploy-webhook.cjs
`;

export const GITHUB_DEPLOY_WEBHOOK_SCRIPT = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const webAppUrl = process.env.WEBAPP_URL;
const deployKey = process.env.DEPLOY_KEY;
const deploymentId = process.env.DEPLOYMENT_ID || '';
const commitSha = process.env.GITHUB_SHA || '';

if (!webAppUrl) {
  console.error('❌ ERROR: WEBAPP_URL secret is not set in GitHub Repository Secrets.');
  process.exit(1);
}

if (!deployKey) {
  console.error('❌ ERROR: DEPLOY_KEY secret is not set in GitHub Repository Secrets.');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '../../');
const files = [];

const manifestPath = path.join(rootDir, 'appsscript.json');
if (fs.existsSync(manifestPath)) {
  files.push({ name: 'appsscript', type: 'JSON', source: fs.readFileSync(manifestPath, 'utf8') });
}

const backendDir = path.join(rootDir, 'backend');
if (fs.existsSync(backendDir)) {
  fs.readdirSync(backendDir).filter(f => f.endsWith('.gs')).forEach(f => {
    files.push({ name: 'backend/' + f.replace(/\\.gs$/, ''), type: 'SERVER_JS', source: fs.readFileSync(path.join(backendDir, f), 'utf8') });
  });
}

const frontendDir = path.join(rootDir, 'frontend');
if (fs.existsSync(frontendDir)) {
  fs.readdirSync(frontendDir).filter(f => f.endsWith('.html')).forEach(f => {
    files.push({ name: 'frontend/' + f.replace(/\\.html$/, ''), type: 'HTML', source: fs.readFileSync(path.join(frontendDir, f), 'utf8') });
  });
}

console.log('Sending ' + files.length + ' files to Apps Script Webhook...');

fetch(webAppUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'DEPLOY_FILES',
    deployKey: deployKey,
    deploymentId: deploymentId,
    commitSha: commitSha,
    description: commitSha ? 'Release ' + commitSha.substring(0, 7) : 'Webhook release',
    createVersion: true,
    files: files
  }),
  redirect: 'follow'
}).then(r => r.json()).then(res => {
  if (res.success) {
    console.log('✅ Successfully deployed ' + (res.filesUpdatedCount || files.length) + ' files to Google Apps Script!');
  } else {
    console.error('❌ Deployment error:', res.error);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Network error:', err.message);
  process.exit(1);
});
`;

export const CLASP_IGNORE_CONTENT = `**/**
!backend/**
!frontend/**
!appsscript.json
`;

export const APPSSCRIPT_JSON_CONTENT = `{
  "timeZone": "Asia/Dhaka",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.deployments",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
`;

export const CLASP_JSON_EXAMPLE = `{
  "scriptId": "YOUR_APPS_SCRIPT_PROJECT_ID_FROM_GOOGLE_SHEETS",
  "rootDir": "."
}
`;

export const APPS_SCRIPT_PROJECT_FILES: AppsScriptFile[] = [
  {
    path: '.github/workflows/deploy.yml',
    filename: 'deploy.yml',
    folder: 'ci_cd',
    type: 'yml',
    description: 'GitHub Actions workflow: automated push, versioning, and deployment via webhook',
    content: GITHUB_DEPLOY_YML,
  },
  {
    path: '.github/scripts/deploy-webhook.cjs',
    filename: 'deploy-webhook.cjs',
    folder: 'ci_cd',
    type: 'gs',
    description: 'Zero-token webhook deployer script that packages and POSTs source files to Apps Script',
    content: GITHUB_DEPLOY_WEBHOOK_SCRIPT,
  },
  {
    path: '.claspignore',
    filename: '.claspignore',
    folder: 'config',
    type: 'ignore',
    description: 'Clasp ignore list ensuring only source files are pushed',
    content: CLASP_IGNORE_CONTENT,
  },
  {
    path: 'appsscript.json',
    filename: 'appsscript.json',
    folder: 'config',
    type: 'json',
    description: 'Google Apps Script manifest (V8 engine, timeZone, permissions)',
    content: APPSSCRIPT_JSON_CONTENT,
  },
  {
    path: '.clasp.json.example',
    filename: '.clasp.json.example',
    folder: 'config',
    type: 'json',
    description: 'Example Clasp project config specifying rootDir and scriptId',
    content: CLASP_JSON_EXAMPLE,
  },
  {
    path: 'backend/WebApp.gs',
    filename: 'WebApp.gs',
    folder: 'backend',
    type: 'gs',
    description: 'Serves the Web App via HtmlService, client RPC calls, and zero-token CI/CD webhook',
    content: BACKEND_WEB_APP_GS,
  },
  {
    path: 'backend/Database.gs',
    filename: 'Database.gs',
    folder: 'backend',
    type: 'gs',
    description: 'Schema initialization, table defaults, and row CRUD operations',
    content: BACKEND_DATABASE_GS,
  },
  {
    path: 'backend/DoubleEntry.gs',
    filename: 'DoubleEntry.gs',
    folder: 'backend',
    type: 'gs',
    description: 'Double-entry balance recalculation and fund transfers',
    content: BACKEND_DOUBLE_ENTRY_GS,
  },
  {
    path: 'backend/Lifecycle.gs',
    filename: 'Lifecycle.gs',
    folder: 'backend',
    type: 'gs',
    description: '5-year rolling data retention and automated weekly triggers',
    content: BACKEND_LIFECYCLE_GS,
  },
  {
    path: 'backend/Menu.gs',
    filename: 'Menu.gs',
    folder: 'backend',
    type: 'gs',
    description: 'Custom Google Spreadsheet UI Menu with CI/CD deploy key setup dialogs',
    content: BACKEND_MENU_GS,
  },
  {
    path: 'frontend/Index.html',
    filename: 'Index.html',
    folder: 'frontend',
    type: 'html',
    description: 'Primary HTML layout, dashboard grids, and modal dialogs',
    content: FRONTEND_INDEX_HTML,
  },
  {
    path: 'frontend/Styles.html',
    filename: 'Styles.html',
    folder: 'frontend',
    type: 'html',
    description: 'Tailwind CSS, Plus Jakarta Sans, and tabular typography styling',
    content: FRONTEND_STYLES_HTML,
  },
  {
    path: 'frontend/Scripts.html',
    filename: 'Scripts.html',
    folder: 'frontend',
    type: 'html',
    description: 'Client-side state manager, formatters, and google.script.run bridge',
    content: FRONTEND_SCRIPTS_HTML,
  },
];

/**
 * Downloads the complete Apps Script project with CI/CD as a structured .zip file
 */
export async function downloadProjectAsZip(): Promise<void> {
  const zip = new JSZip();

  const backendFolder = zip.folder('backend');
  const frontendFolder = zip.folder('frontend');
  const githubFolder = zip.folder('.github');
  const workflowsFolder = githubFolder ? githubFolder.folder('workflows') : null;
  const scriptsFolder = githubFolder ? githubFolder.folder('scripts') : null;

  for (const file of APPS_SCRIPT_PROJECT_FILES) {
    if (file.folder === 'backend' && backendFolder) {
      backendFolder.file(file.filename, file.content);
    } else if (file.folder === 'frontend' && frontendFolder) {
      frontendFolder.file(file.filename, file.content);
    } else if (file.folder === 'ci_cd') {
      if (file.filename.endsWith('.cjs') || file.filename.endsWith('.js')) {
        if (scriptsFolder) scriptsFolder.file(file.filename, file.content);
      } else if (workflowsFolder) {
        workflowsFolder.file(file.filename, file.content);
      }
    } else {
      zip.file(file.filename, file.content);
    }
  }

  // Also include a comprehensive open-source README.md
  const readmeContent = `# Shongsar (সংসার) — Family Wealth Manager & Ledger Engine

A 100% free, privacy-first family budget and wealth management platform backed by Google Sheets as a database, hosted on Google Apps Script, and synchronized via GitHub CI/CD with zero tokens.

## Repository Architecture
- \`.github/workflows/deploy.yml\`: Automated GitHub Actions webhook deployment pipeline
- \`.github/scripts/deploy-webhook.cjs\`: Zero-clasp file packager and webhook dispatcher
- \`appsscript.json\`: Apps Script project manifest
- \`backend/\`: Modular server-side Apps Script code
  - \`WebApp.gs\`: Serves Web App UI, client RPC, and incoming webhook deployer
  - \`Database.gs\`: Table schemas, seed defaults, and row operations
  - \`DoubleEntry.gs\`: Double-entry balance propagation engine
  - \`Lifecycle.gs\`: 5-year rolling data retention & weekly triggers
  - \`Menu.gs\`: Spreadsheet custom menu & CI/CD deploy key setup
- \`frontend/\`: Client-side single-page web app
  - \`Index.html\`: HTML layout, dashboard grids & modals
  - \`Styles.html\`: Tailwind CSS & typography
  - \`Scripts.html\`: Reactive state & google.script.run bridge

## Zero-Token CI/CD Setup (2 Minutes):

### 1. Set Deploy Key in Google Sheets
1. Open your Google Sheet.
2. In the top menu, click **🌿 Shongsar (সংসার)** > **🔑 Configure CI/CD Deploy Key**.
3. Enter any secret passphrase of your choice and click OK.
4. Click **🌿 Shongsar (সংসার)** > **📋 View GitHub CI/CD Info** to see your Web App URL.

### 2. Configure GitHub Repository Secrets
In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions** and add 2 secrets:
- \`WEBAPP_URL\`: Your Web App deployment URL.
- \`DEPLOY_KEY\`: The exact secret passphrase you entered in step 1.

### 3. Push & Deploy!
Every \`git push origin main\` will now automatically:
1. Read and package all \`backend/\` and \`frontend/\` files.
2. Send an authenticated HTTPS webhook to your Google Apps Script project.
3. Automatically update project files and mint an immutable release version!
No local Clasp login or CLASPRC_JSON is ever required!
`;
  zip.file('README.md', readmeContent);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'shongsar_github_cicd_project.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single file from the project
 */
export function downloadSingleFile(file: AppsScriptFile): void {
  const mimeType = file.type === 'gs' ? 'text/javascript;charset=utf-8' : 'text/html;charset=utf-8';
  const blob = new Blob([file.content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
