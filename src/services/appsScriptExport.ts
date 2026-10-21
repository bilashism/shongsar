/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * =========================================================================
 * CODE.GS — Server-side Apps Script Engine & Web App Host
 * =========================================================================
 */
export const SHONGSAR_CODE_GS = `/**
 * =========================================================================
 * SHONGSAR (সংসার) — 100% Free Google Apps Script Web App Host & Engine
 * =========================================================================
 * 
 * This file (Code.gs) hosts the Shongsar web app for FREE on Google Apps Script,
 * provides bidirectional RPC methods for Index.html, and executes 5-year triggers.
 */

var SPREADSHEET_NAME = "shongsar";

/**
 * Web App entry point: Serves the Shongsar single-page app (Index.html)
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile("Index");
  return template.evaluate()
    .setTitle("Shongsar — Family Budget & Wealth Manager")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
}

/**
 * Spreadsheet custom menu when opened inside Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🌿 Shongsar (সংসার)")
    .addItem("🌐 Open Web App", "openWebAppUrlDialog")
    .addItem("🔄 Reconcile Balances", "reconcileAccountBalances")
    .addItem("⏳ Run 5-Year Archival & Cleanup", "cleanAndArchiveOldTransactions")
    .addItem("📊 Refresh Budget Summaries", "refreshBudgetSummaries")
    .addSeparator()
    .addItem("⏰ Setup Weekly 5-Year Trigger", "setupAutomatedWeeklyTrigger")
    .addItem("ℹ️ About Shongsar Engine", "showAboutDialog")
    .addToUi();
}

function openWebAppUrlDialog() {
  var url = ScriptApp.getService().getUrl();
  var html = '<div style="font-family:sans-serif;padding:16px;">' +
    '<h3 style="color:#059669;margin-top:0;">Your Shongsar Web App URL</h3>' +
    '<p style="font-size:13px;color:#475569;">Open this link in your browser or bookmark it on your phone:</p>' +
    '<p><a href="' + url + '" target="_blank" style="color:#2563eb;word-break:break-all;font-size:12px;">' + url + '</a></p>' +
    '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(450).setHeight(180), "Shongsar Web App");
}

/**
 * RPC: Loads all accounts, transactions, categories, and budgets into frontend
 */
function apiGetLedgerData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRequiredSheetsExist(ss);

  return {
    accounts: readSheetObjects(ss.getSheetByName("Accounts")),
    transactions: readSheetObjects(ss.getSheetByName("Transactions")),
    budgets: readSheetObjects(ss.getSheetByName("Budgets")),
    categories: readSheetObjects(ss.getSheetByName("Categories")),
    debts: readSheetObjects(ss.getSheetByName("Debts")),
    investments: readSheetObjects(ss.getSheetByName("Investments")),
    config: readSheetObjects(ss.getSheetByName("Config")),
    spreadsheetUrl: ss.getUrl()
  };
}

/**
 * RPC: Records a new transaction and updates linked account balances
 */
function apiSaveTransaction(tx) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  
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
  reconcileAccountBalances();
  return { success: true, id: newId };
}

/**
 * RPC: Transfers funds between linked accounts
 */
function apiTransferFunds(fromId, toId, amount, description, date) {
  return apiSaveTransaction({
    date: date || new Date().toISOString().substring(0, 10),
    type: "transfer",
    amount: amount,
    fromAccountId: fromId,
    toAccountId: toId,
    categoryId: "cat_transfer",
    description: description || "Fund Transfer",
    notes: "Direct transfer between linked accounts"
  });
}

/**
 * RPC: Double-entry account balance recalculation
 */
function reconcileAccountBalances() {
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

/**
 * RPC & Trigger: 5-Year Data Archival & Recycling
 */
function cleanAndArchiveOldTransactions() {
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

function setupAutomatedWeeklyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "cleanAndArchiveOldTransactions") {
      SpreadsheetApp.getUi().alert("Weekly maintenance trigger is already active!");
      return;
    }
  }

  ScriptApp.newTrigger("cleanAndArchiveOldTransactions")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();

  SpreadsheetApp.getUi().alert("Automated weekly 5-year cleanup trigger enabled!");
}

function refreshBudgetSummaries() {
  reconcileAccountBalances();
  SpreadsheetApp.getActiveSpreadsheet().toast("Summaries updated.", "Shongsar", 4);
}

function showAboutDialog() {
  SpreadsheetApp.getUi().alert(
    "Shongsar (সংসার) Family Ledger Engine v1.0\\n\\n" +
    "100% Free Google Apps Script Web App Host & Financial Database.\\n" +
    "All data remains private in your Google Account."
  );
}

function readSheetObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var results = [];

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
    results.push(obj);
  }
  return results;
}

function ensureRequiredSheetsExist(ss) {
  var required = ["Accounts", "Transactions", "Budgets", "Categories", "Debts", "Investments", "Archive_5Yr", "Config"];
  for (var i = 0; i < required.length; i++) {
    if (!ss.getSheetByName(required[i])) {
      ss.insertSheet(required[i]);
    }
  }
}
`;

/**
 * =========================================================================
 * INDEX.HTML — Self-Contained Web App Frontend for Apps Script
 * =========================================================================
 */
export const SHONGSAR_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shongsar — Family Budget & Wealth Manager</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  
  <!-- Top Navigation Bar -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
      
      <!-- Zone 1: Wordmark -->
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
          শ
        </div>
        <div class="flex flex-col">
          <span class="text-base font-bold text-slate-900 tracking-tight leading-none">Shongsar</span>
          <span class="text-[10px] text-slate-400 font-medium tracking-wider">সংসার · APPS SCRIPT WEB APP</span>
        </div>
      </div>

      <!-- Zone 2: Navigation Links -->
      <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
        <button onclick="switchTab('overview')" id="nav-overview" class="tab-link text-emerald-600 font-bold border-b-2 border-emerald-600 py-1">Overview</button>
        <button onclick="switchTab('accounts')" id="nav-accounts" class="tab-link hover:text-slate-900 py-1">Linked Funds</button>
        <button onclick="switchTab('transactions')" id="nav-transactions" class="tab-link hover:text-slate-900 py-1">Transactions</button>
        <button onclick="switchTab('budgets')" id="nav-budgets" class="tab-link hover:text-slate-900 py-1">Envelopes</button>
        <button onclick="switchTab('debts')" id="nav-debts" class="tab-link hover:text-slate-900 py-1">Debts & Assets</button>
        <button onclick="switchTab('lifecycle')" id="nav-lifecycle" class="tab-link hover:text-slate-900 py-1">5-Yr Retention</button>
      </nav>

      <!-- Zone 3: Status & Action -->
      <div class="flex items-center gap-3">
        <span class="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
          ● Hosted on Google Apps Script
        </span>
        <button onclick="openModal('txModal')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs">
          + Record Entry
        </button>
      </div>

    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    
    <!-- Tab 1: Overview -->
    <section id="tab-overview" class="tab-content space-y-6">
      
      <!-- KPI Row -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span class="text-xs text-slate-500">Total Net Worth</span>
          <div id="kpi-networth" class="text-2xl font-bold font-mono text-slate-900 mt-1">৳ 0</div>
          <span class="text-[11px] text-slate-400">Aggregated across all funds</span>
        </div>
        <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span class="text-xs text-slate-500">Available Liquid Cash</span>
          <div id="kpi-liquid" class="text-2xl font-bold font-mono text-slate-900 mt-1">৳ 0</div>
          <span class="text-[11px] text-slate-400">Bank + Cash + bKash</span>
        </div>
        <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span class="text-xs text-slate-500">Monthly Total Inflow</span>
          <div id="kpi-income" class="text-2xl font-bold font-mono text-emerald-600 mt-1">৳ 0</div>
          <span class="text-[11px] text-slate-400">Current month salary & earnings</span>
        </div>
        <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span class="text-xs text-slate-500">Monthly Total Outflow</span>
          <div id="kpi-expense" class="text-2xl font-bold font-mono text-slate-900 mt-1">৳ 0</div>
          <span class="text-[11px] text-slate-400">Provisions & household burn</span>
        </div>
      </div>

      <!-- Linked Accounts & Envelopes Split -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">Linked Financial Pots</h3>
            <button onclick="openModal('transferModal')" class="text-xs font-semibold text-emerald-600 hover:underline">Transfer Funds →</button>
          </div>
          <div id="overview-accounts-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Dynamic cards -->
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <h3 class="text-sm font-bold text-slate-900">Budget Envelopes</h3>
          <div id="overview-envelopes-list" class="space-y-3">
            <!-- Dynamic progress bars -->
          </div>
        </div>
      </div>

    </section>

    <!-- Tab 2: Linked Funds -->
    <section id="tab-accounts" class="tab-content hidden space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-900">Linked Accounts & Pots</h2>
        <button onclick="openModal('transferModal')" class="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100">Transfer Funds</button>
      </div>
      <div id="accounts-full-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
    </section>

    <!-- Tab 3: Transactions Ledger -->
    <section id="tab-transactions" class="tab-content hidden space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Ledger History</h2>
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4">Description</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody id="ledger-table-body" class="divide-y divide-slate-100"></tbody>
        </table>
      </div>
    </section>

    <!-- Tab 4: Envelopes -->
    <section id="tab-budgets" class="tab-content hidden space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Monthly Category Envelopes</h2>
      <div id="envelopes-full-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </section>

    <!-- Tab 5: Debts & Assets -->
    <section id="tab-debts" class="tab-content hidden space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Debts & Investment Assets</h2>
      <div id="debts-full-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      <div id="investments-full-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"></div>
    </section>

    <!-- Tab 6: 5-Yr Retention -->
    <section id="tab-lifecycle" class="tab-content hidden space-y-4">
      <div class="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h2 class="text-base font-bold text-slate-900">5-Year Data Lifecycle & Rolling Archival</h2>
        <p class="text-xs text-slate-500 leading-relaxed">
          Google Apps Script maintains a rolling 5-year retention window. When transactions exceed 5 years,
          they are moved to the Archive_5Yr sheet automatically via weekly triggers.
        </p>
        <button onclick="runArchival()" id="archivalBtn" class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800">
          Run 5-Year Archival Now
        </button>
      </div>
    </section>

  </main>

  <!-- New Transaction Modal -->
  <div id="txModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
    <div class="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">Record Transaction</h3>
        <button onclick="closeModal('txModal')" class="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>
      <form onsubmit="submitTransaction(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold mb-1">Type</label>
          <select id="modal-tx-type" class="w-full px-3 py-2 border rounded-xl bg-slate-50">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-1">Amount (৳)</label>
          <input type="number" id="modal-tx-amount" step="any" min="0.01" required placeholder="0.00" class="w-full px-3 py-2 border rounded-xl font-mono text-sm">
        </div>
        <div>
          <label class="block font-semibold mb-1">Description</label>
          <input type="text" id="modal-tx-desc" required placeholder="e.g. Grocery Provisions" class="w-full px-3 py-2 border rounded-xl">
        </div>
        <div>
          <label class="block font-semibold mb-1">Account</label>
          <select id="modal-tx-account" class="w-full px-3 py-2 border rounded-xl bg-slate-50"></select>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeModal('txModal')" class="px-3 py-1.5 text-slate-600">Cancel</button>
          <button type="submit" class="px-4 py-1.5 text-white bg-slate-900 rounded-xl font-semibold">Save Entry</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Transfer Modal -->
  <div id="transferModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
    <div class="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">Transfer Funds</h3>
        <button onclick="closeModal('transferModal')" class="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>
      <form onsubmit="submitTransfer(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold mb-1">Amount (৳)</label>
          <input type="number" id="modal-tr-amount" step="any" min="0.01" required placeholder="0.00" class="w-full px-3 py-2 border rounded-xl font-mono text-sm">
        </div>
        <div>
          <label class="block font-semibold mb-1">From Account</label>
          <select id="modal-tr-from" class="w-full px-3 py-2 border rounded-xl bg-slate-50"></select>
        </div>
        <div>
          <label class="block font-semibold mb-1">To Account</label>
          <select id="modal-tr-to" class="w-full px-3 py-2 border rounded-xl bg-slate-50"></select>
        </div>
        <div>
          <label class="block font-semibold mb-1">Memo</label>
          <input type="text" id="modal-tr-desc" placeholder="e.g. ATM withdrawal or savings allocation" class="w-full px-3 py-2 border rounded-xl">
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeModal('transferModal')" class="px-3 py-1.5 text-slate-600">Cancel</button>
          <button type="submit" class="px-4 py-1.5 text-white bg-slate-900 rounded-xl font-semibold">Execute Transfer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Client Script -->
  <script>
    var state = { accounts: [], transactions: [], budgets: [], categories: [], debts: [], investments: [] };

    function formatBDT(amount) {
      var abs = Math.abs(amount || 0);
      var parts = Math.round(abs).toString();
      if (parts.length > 3) {
        var last3 = parts.substring(parts.length - 3);
        var rest = parts.substring(0, parts.length - 3);
        parts = rest.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ",") + "," + last3;
      }
      return (amount < 0 ? "-৳ " : "৳ ") + parts;
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-link').forEach(el => {
        el.classList.remove('text-emerald-600', 'font-bold', 'border-b-2', 'border-emerald-600');
        el.classList.add('hover:text-slate-900');
      });
      document.getElementById('tab-' + tabId).classList.remove('hidden');
      var navBtn = document.getElementById('nav-' + tabId);
      if (navBtn) {
        navBtn.classList.add('text-emerald-600', 'font-bold', 'border-b-2', 'border-emerald-600');
      }
    }

    function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
    function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    function renderUI() {
      // 1. Calculations
      var liquid = 0, networth = 0;
      state.accounts.forEach(a => {
        var b = parseFloat(a.currentBalance) || 0;
        networth += b;
        if (a.type === 'cash' || a.type === 'bank' || a.type === 'mobile_banking') liquid += b;
      });

      var curMonth = new Date().toISOString().substring(0, 7);
      var income = 0, expense = 0;
      state.transactions.forEach(t => {
        if (String(t.date).startsWith(curMonth)) {
          var amt = parseFloat(t.amount) || 0;
          if (t.type === 'income') income += amt;
          if (t.type === 'expense') expense += amt;
        }
      });

      document.getElementById('kpi-networth').textContent = formatBDT(networth);
      document.getElementById('kpi-liquid').textContent = formatBDT(liquid);
      document.getElementById('kpi-income').textContent = formatBDT(income);
      document.getElementById('kpi-expense').textContent = formatBDT(expense);

      // Accounts Grid
      var accHtml = '';
      state.accounts.forEach(a => {
        accHtml += '<div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50">' +
          '<div class="flex justify-between text-xs text-slate-500 font-medium"><span>' + a.name + '</span><span>' + (a.institution || '') + '</span></div>' +
          '<div class="text-lg font-bold font-mono text-slate-900 mt-1">' + formatBDT(a.currentBalance) + '</div>' +
          '</div>';
      });
      document.getElementById('overview-accounts-grid').innerHTML = accHtml;
      document.getElementById('accounts-full-grid').innerHTML = accHtml;

      // Select Dropdowns
      var optHtml = '';
      state.accounts.forEach(a => {
        optHtml += '<option value="' + a.id + '">' + a.name + ' (' + formatBDT(a.currentBalance) + ')</option>';
      });
      document.getElementById('modal-tx-account').innerHTML = optHtml;
      document.getElementById('modal-tr-from').innerHTML = optHtml;
      document.getElementById('modal-tr-to').innerHTML = optHtml;

      // Ledger Table
      var ledgerHtml = '';
      state.transactions.slice(0, 30).forEach(t => {
        var isInc = t.type === 'income';
        ledgerHtml += '<tr class="hover:bg-slate-50">' +
          '<td class="py-2.5 px-4 font-mono text-slate-500 text-[11px]">' + String(t.date).substring(0, 10) + '</td>' +
          '<td class="py-2.5 px-4 font-semibold text-slate-900">' + t.description + '</td>' +
          '<td class="py-2.5 px-4 text-slate-500">' + (t.categoryId || 'General') + '</td>' +
          '<td class="py-2.5 px-4 text-right font-mono font-bold ' + (isInc ? 'text-emerald-600' : 'text-slate-900') + '">' + (isInc ? '+' : '-') + formatBDT(t.amount) + '</td>' +
          '</tr>';
      });
      document.getElementById('ledger-table-body').innerHTML = ledgerHtml;
    }

    function loadData() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(data) {
          state = data;
          renderUI();
        }).apiGetLedgerData();
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
        }).apiSaveTransaction(tx);
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
        }).cleanAndArchiveOldTransactions();
      }
    }

    window.onload = loadData;
  </script>
</body>
</html>
`;

export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SHONGSAR_APPS_SCRIPT_CODE = SHONGSAR_CODE_GS;

export function downloadAppsScriptFile() {
  downloadFile('Code.gs', SHONGSAR_CODE_GS, 'text/javascript;charset=utf-8');
}

export function downloadIndexHtmlFile() {
  downloadFile('Index.html', SHONGSAR_INDEX_HTML, 'text/html;charset=utf-8');
}
