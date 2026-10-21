/**
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
