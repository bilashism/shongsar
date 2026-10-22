/**
 * @file backend/WebApp.gs
 * Web App entry point, client RPC controller, and zero-token CI/CD Webhook deployer.
 */

var SPREADSHEET_NAME = "shongsar";

/**
 * Serves the Shongsar frontend Web App.
 */
function doGet(e) {
  // If invoked with ?action=ping for CI/CD health checks
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

    // 1. Validation: Ensure deploy key is configured in Apps Script Properties
    if (!storedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "DEPLOY_KEY is not configured in this Google Sheet yet. Please open the Google Sheet, click '🌿 Shongsar' in the top menu, and select '🔑 Configure CI/CD Deploy Key' to set your secret passphrase."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Security Check: Validate incoming secret against stored key
    if (!payload.deployKey || payload.deployKey !== storedSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Unauthorized: Invalid DEPLOY_KEY provided by GitHub Actions."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Handle Health Check / Ping
    if (payload.action === "PING") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Authentication successful. Apps Script Webhook receiver is ready.",
        scriptId: ScriptApp.getScriptId(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Handle Code Deployment
    if (payload.action === "DEPLOY_FILES") {
      if (!payload.files || !Array.isArray(payload.files) || payload.files.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "No files array provided in deployment payload."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var scriptId = ScriptApp.getScriptId();
      var authToken = ScriptApp.getOAuthToken();

      // Step A: Update Script Project Content
      var updateContentUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
      var contentResponse = UrlFetchApp.fetch(updateContentUrl, {
        method: "put",
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + authToken
        },
        payload: JSON.stringify({
          files: payload.files
        }),
        muteHttpExceptions: true
      });

      var responseCode = contentResponse.getResponseCode();
      var responseText = contentResponse.getContentText();

      if (responseCode >= 400) {
        var guidance = "";
        if (responseCode === 403 && responseText.indexOf("ACCESS_TOKEN_SCOPE_INSUFFICIENT") !== -1) {
          guidance = " -> Solution: Update your Apps Script Editor's appsscript.json with 'oauthScopes' containing 'https://www.googleapis.com/auth/script.projects', enable Google Apps Script API at https://script.google.com/home/usersettings, and click 'Run' on any function in the editor to re-authorize.";
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Google Apps Script API content update failed (" + responseCode + "): " + responseText + guidance
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Step B: Automatically create an immutable version tag (Optional release bump)
      var versionNumber = null;
      var commitRef = payload.commitSha ? payload.commitSha.substring(0, 7) : "webhook";
      var versionDescription = payload.description || ("CI/CD Release " + commitRef + " via Webhook");

      try {
        var versionUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/versions";
        var versionResponse = UrlFetchApp.fetch(versionUrl, {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + authToken
          },
          payload: JSON.stringify({
            description: versionDescription
          }),
          muteHttpExceptions: true
        });

        if (versionResponse.getResponseCode() === 200) {
          var versionData = JSON.parse(versionResponse.getContentText());
          versionNumber = versionData.versionNumber;

          // Step C: If deploymentId is provided or configured, update it to the new version
          var deploymentId = payload.deploymentId || PropertiesService.getScriptProperties().getProperty("DEPLOYMENT_ID");
          if (deploymentId && versionNumber) {
            var deployUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/deployments/" + deploymentId;
            UrlFetchApp.fetch(deployUrl, {
              method: "put",
              contentType: "application/json",
              headers: {
                Authorization: "Bearer " + authToken
              },
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
        // Versioning error is non-fatal to file updates
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
