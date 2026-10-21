/**
 * @file backend/Menu.gs
 * Custom Google Spreadsheet UI Menu.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🌿 Shongsar (সংসার)")
    .addItem("🌐 Open Web App URL", "openWebAppUrlDialog")
    .addItem("🔄 Reconcile Balances", "reconcileAllBalances")
    .addItem("⏳ Run 5-Year Archival Now", "menuRunArchival")
    .addItem("⏰ Setup Weekly 5-Year Trigger", "installWeeklyArchivalTrigger")
    .addSeparator()
    .addItem("ℹ️ About Shongsar Engine", "showAboutDialog")
    .addToUi();
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
