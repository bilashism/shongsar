/**
 * @file backend/WebApp.gs
 * Web App entry point and client RPC controller.
 */

var SPREADSHEET_NAME = "shongsar";

/**
 * Serves the Shongsar frontend Web App.
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile("frontend/Index");
  return template.evaluate()
    .setTitle("Shongsar — Family Budget & Wealth Manager")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
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
