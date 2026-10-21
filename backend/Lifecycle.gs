/**
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
