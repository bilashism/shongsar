/**
 * @file backend/DoubleEntry.gs
 * Double-entry balance calculation, fund transfers, and ledger mutations.
 */

/**
 * Appends a new transaction row and recalculates linked account balances.
 */
function processNewTransaction(tx) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  if (!txSheet) return { success: false, error: "Transactions sheet not found" };

  var txId = tx.id || ("tx_" + new Date().getTime());
  var row = [
    txId,
    tx.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    tx.type,
    parseFloat(tx.amount) || 0,
    tx.currency || "BDT",
    tx.fromAccountId || "",
    tx.toAccountId || "",
    tx.categoryId || "",
    tx.description || "",
    tx.familyMember || "",
    tx.notes || "",
    new Date().toISOString()
  ];

  txSheet.appendRow(row);
  reconcileAllBalances();
  return { success: true, transactionId: txId };
}

/**
 * Creates double-entry transfer between two linked accounts.
 */
function processFundTransfer(fromAccountId, toAccountId, amount, description, date) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  if (!txSheet) return { success: false, error: "Transactions sheet not found" };

  var transferDate = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var amt = parseFloat(amount) || 0;
  var desc = description || "Fund Transfer";

  var row = [
    "tr_" + new Date().getTime(),
    transferDate,
    "transfer",
    amt,
    "BDT",
    fromAccountId,
    toAccountId,
    "cat_transfer",
    desc,
    "",
    "Linked double-entry transfer",
    new Date().toISOString()
  ];

  txSheet.appendRow(row);
  reconcileAllBalances();
  return { success: true };
}

/**
 * Recalculates current balances for all accounts based on initialBalance + sum(inflows) - sum(outflows).
 */
function reconcileAllBalances() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accountsSheet = ss.getSheetByName("Accounts");
  var txSheet = ss.getSheetByName("Transactions");
  if (!accountsSheet) return;

  var accountsData = accountsSheet.getDataRange().getValues();
  if (accountsData.length <= 1) return;

  var accHeaders = accountsData[0];
  var idIdx = accHeaders.indexOf("id");
  var currBalIdx = accHeaders.indexOf("currentBalance");
  var initBalIdx = accHeaders.indexOf("initialBalance");
  var updateIdx = accHeaders.indexOf("updatedAt");

  var netFlows = {};
  for (var i = 1; i < accountsData.length; i++) {
    var accId = accountsData[i][idIdx];
    var initBal = parseFloat(accountsData[i][initBalIdx]) || 0;
    netFlows[accId] = initBal;
  }

  if (txSheet) {
    var txData = txSheet.getDataRange().getValues();
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
