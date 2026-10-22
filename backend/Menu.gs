/**
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
    ? "A Deploy Key is currently configured.\n\nEnter a new Deploy Key (or leave blank to keep current):"
    : "Enter a secret passphrase for GitHub Actions CI/CD deployment:\n(e.g., a strong password or random phrase)";

  var response = ui.prompt("🔑 Configure CI/CD Deploy Key", promptMessage, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() === ui.Button.OK) {
    var newKey = response.getResponseText().trim();
    if (newKey) {
      props.setProperty("DEPLOY_KEY", newKey);
      ui.alert(
        "✅ Deploy Key Saved!",
        "Your secret Deploy Key has been saved to this Google Sheet.\n\n" +
        "Now add this exact value as DEPLOY_KEY in your GitHub repository:\n" +
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
        "Google Apps Script API is enabled and your script has valid project management scopes.\n\n" +
        "GitHub Actions webhook deployments will succeed! 🎉",
        ui.ButtonSet.OK
      );
    } else if (code === 403 && body.indexOf("ACCESS_TOKEN_SCOPE_INSUFFICIENT") !== -1) {
      ui.alert(
        "❌ Insufficient Scopes (403)",
        "The script does not yet have the 'script.projects' scope authorized.\n\n" +
        "Fix in 3 steps:\n" +
        "1. In Apps Script Editor: Project Settings > Check 'Show appsscript.json manifest file in editor'.\n" +
        "2. Copy the 'oauthScopes' array from GitHub's appsscript.json into your editor's appsscript.json.\n" +
        "3. Select any function and click 'Run' to grant permissions in the Google authorization popup.",
        ui.ButtonSet.OK
      );
    } else if (code === 403 && (body.indexOf("SERVICE_DISABLED") !== -1 || body.indexOf("not enabled") !== -1 || body.indexOf("has not enabled") !== -1)) {
      ui.alert(
        "❌ Google Apps Script API Disabled (403)",
        "The Google Apps Script API must be enabled for your Google account:\n\n" +
        "1. Open https://script.google.com/home/usersettings\n" +
        "2. Toggle 'Google Apps Script API' to ON.\n" +
        "3. Re-test this menu option.",
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
    "Shongsar (সংসার) Family Ledger Engine v1.0\n\n" +
    "100% Free Google Apps Script Web App Host & Financial Database.\n" +
    "All data remains private in your Google Account."
  );
}
