/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Budget, Category, Debt, Investment, LifecycleSettings, SheetMetadata, Transaction } from '../types/shongsar';
import { getFiveYearCutoffDate } from '../utils/formatters';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_CATEGORIES,
  INITIAL_DEBTS,
  INITIAL_INVESTMENTS,
  INITIAL_LIFECYCLE_SETTINGS,
  INITIAL_TRANSACTIONS,
} from '../data/seedData';

const SPREADSHEET_TITLE = 'shongsar';

/**
 * Searches for an existing spreadsheet named 'shongsar' in Google Drive.
 */
export async function findShongsarSpreadsheet(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to query Google Drive: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a brand new 'shongsar' spreadsheet with properly configured sheets and headers.
 */
export async function createShongsarSpreadsheet(accessToken: string): Promise<SheetMetadata> {
  const payload = {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      { properties: { title: 'Accounts' } },
      { properties: { title: 'Transactions' } },
      { properties: { title: 'Budgets' } },
      { properties: { title: 'Categories' } },
      { properties: { title: 'Debts' } },
      { properties: { title: 'Investments' } },
      { properties: { title: 'Archive_5Yr' } },
      { properties: { title: 'Config' } },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create spreadsheet 'shongsar': ${response.statusText}`);
  }

  const sheetData = await response.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Populate initial headers and seeds
  await initializeSpreadsheetData(spreadsheetId, accessToken);

  return {
    spreadsheetId,
    spreadsheetUrl: sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title: SPREADSHEET_TITLE,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Populates newly created spreadsheet tabs with headers and default family financial models.
 */
async function initializeSpreadsheetData(spreadsheetId: string, accessToken: string): Promise<void> {
  const accountsHeader = ['id', 'name', 'type', 'institution', 'currentBalance', 'currency', 'initialBalance', 'notes', 'updatedAt'];
  const accountsRows = INITIAL_ACCOUNTS.map(a => [
    a.id, a.name, a.type, a.institution, a.currentBalance, a.currency, a.initialBalance, a.notes || '', a.updatedAt,
  ]);

  const txHeader = ['id', 'date', 'type', 'amount', 'currency', 'fromAccountId', 'toAccountId', 'categoryId', 'description', 'familyMember', 'notes', 'createdAt'];
  const txRows = INITIAL_TRANSACTIONS.map(t => [
    t.id, t.date, t.type, t.amount, t.currency, t.fromAccountId || '', t.toAccountId || '', t.categoryId, t.description, t.familyMember || '', t.notes || '', t.createdAt,
  ]);

  const budgetsHeader = ['id', 'month', 'categoryId', 'allocatedAmount', 'spentAmount', 'notes'];
  const budgetsRows = INITIAL_BUDGETS.map(b => [
    b.id, b.month, b.categoryId, b.allocatedAmount, b.spentAmount || 0, b.notes || '',
  ]);

  const categoriesHeader = ['id', 'name', 'type', 'icon', 'color', 'defaultMonthlyBudget'];
  const categoriesRows = INITIAL_CATEGORIES.map(c => [
    c.id, c.name, c.type, c.icon, c.color, c.defaultMonthlyBudget,
  ]);

  const debtsHeader = ['id', 'title', 'type', 'counterparty', 'totalAmount', 'remainingAmount', 'linkedAccountId', 'dueDate', 'interestRate', 'status', 'notes', 'createdAt'];
  const debtsRows = INITIAL_DEBTS.map(d => [
    d.id, d.title, d.type, d.counterparty, d.totalAmount, d.remainingAmount, d.linkedAccountId || '', d.dueDate || '', d.interestRate || '', d.status, d.notes || '', d.createdAt,
  ]);

  const investmentsHeader = ['id', 'name', 'type', 'initialCost', 'currentValuation', 'linkedAccountId', 'targetYield', 'lastEvaluated', 'notes'];
  const investmentsRows = INITIAL_INVESTMENTS.map(i => [
    i.id, i.name, i.type, i.initialCost, i.currentValuation, i.linkedAccountId || '', i.targetYield || '', i.lastEvaluated, i.notes || '',
  ]);

  const configHeader = ['SettingKey', 'SettingValue', 'Description', 'LastUpdated'];
  const configRows = [
    ['autoRecycle5Years', 'true', 'Whether records older than 5 years are recycled', new Date().toISOString()],
    ['archiveToDedicatedSheet', 'true', 'Keep recycled records in Archive_5Yr tab', new Date().toISOString()],
    ['archivedCount', '0', 'Total transactions archived', new Date().toISOString()],
    ['primaryCurrency', 'BDT', 'Family base currency', new Date().toISOString()],
  ];

  const valueRanges = [
    { range: 'Accounts!A1:I', values: [accountsHeader, ...accountsRows] },
    { range: 'Transactions!A1:L', values: [txHeader, ...txRows] },
    { range: 'Budgets!A1:F', values: [budgetsHeader, ...budgetsRows] },
    { range: 'Categories!A1:F', values: [categoriesHeader, ...categoriesRows] },
    { range: 'Debts!A1:L', values: [debtsHeader, ...debtsRows] },
    { range: 'Investments!A1:I', values: [investmentsHeader, ...investmentsRows] },
    { range: 'Archive_5Yr!A1:L', values: [txHeader] },
    { range: 'Config!A1:D', values: [configHeader, ...configRows] },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });
}

/**
 * Loads all Shongsar data models from the linked Google Sheet.
 */
export async function loadSpreadsheetData(spreadsheetId: string, accessToken: string) {
  const ranges = [
    'Accounts!A1:I100',
    'Transactions!A1:L5000',
    'Budgets!A1:F500',
    'Categories!A1:F100',
    'Debts!A1:L100',
    'Investments!A1:I100',
    'Config!A1:D50',
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to read data from Google Sheet: ${response.statusText}`);
  }

  const batchData = await response.json();
  const valueRanges = batchData.valueRanges || [];

  // Parse Accounts
  const accountsValues = valueRanges[0]?.values || [];
  const accounts: Account[] = [];
  if (accountsValues.length > 1) {
    for (let i = 1; i < accountsValues.length; i++) {
      const row = accountsValues[i];
      if (row[0]) {
        accounts.push({
          id: String(row[0]),
          name: String(row[1] || 'Account'),
          type: (row[2] || 'bank') as any,
          institution: String(row[3] || ''),
          currentBalance: parseFloat(row[4]) || 0,
          currency: String(row[5] || 'BDT'),
          initialBalance: parseFloat(row[6]) || 0,
          notes: String(row[7] || ''),
          updatedAt: String(row[8] || new Date().toISOString()),
        });
      }
    }
  }

  // Parse Transactions
  const txValues = valueRanges[1]?.values || [];
  const transactions: Transaction[] = [];
  if (txValues.length > 1) {
    for (let i = 1; i < txValues.length; i++) {
      const row = txValues[i];
      if (row[0]) {
        transactions.push({
          id: String(row[0]),
          date: String(row[1] || new Date().toISOString().split('T')[0]),
          type: (row[2] || 'expense') as any,
          amount: parseFloat(row[3]) || 0,
          currency: String(row[4] || 'BDT'),
          fromAccountId: row[5] ? String(row[5]) : undefined,
          toAccountId: row[6] ? String(row[6]) : undefined,
          categoryId: String(row[7] || 'cat_groceries'),
          description: String(row[8] || 'Transaction'),
          familyMember: row[9] ? String(row[9]) : undefined,
          notes: row[10] ? String(row[10]) : undefined,
          createdAt: String(row[11] || new Date().toISOString()),
        });
      }
    }
  }

  // Parse Budgets
  const budgetValues = valueRanges[2]?.values || [];
  const budgets: Budget[] = [];
  if (budgetValues.length > 1) {
    for (let i = 1; i < budgetValues.length; i++) {
      const row = budgetValues[i];
      if (row[0]) {
        budgets.push({
          id: String(row[0]),
          month: String(row[1] || ''),
          categoryId: String(row[2] || ''),
          allocatedAmount: parseFloat(row[3]) || 0,
          spentAmount: parseFloat(row[4]) || 0,
          notes: row[5] ? String(row[5]) : undefined,
        });
      }
    }
  }

  // Parse Categories
  const categoryValues = valueRanges[3]?.values || [];
  const categories: Category[] = [];
  if (categoryValues.length > 1) {
    for (let i = 1; i < categoryValues.length; i++) {
      const row = categoryValues[i];
      if (row[0]) {
        categories.push({
          id: String(row[0]),
          name: String(row[1] || 'Category'),
          type: (row[2] || 'expense') as any,
          icon: String(row[3] || 'Tag'),
          color: String(row[4] || '#64748B'),
          defaultMonthlyBudget: parseFloat(row[5]) || 0,
        });
      }
    }
  }

  // Parse Debts
  const debtValues = valueRanges[4]?.values || [];
  const debts: Debt[] = [];
  if (debtValues.length > 1) {
    for (let i = 1; i < debtValues.length; i++) {
      const row = debtValues[i];
      if (row[0]) {
        debts.push({
          id: String(row[0]),
          title: String(row[1] || 'Debt'),
          type: (row[2] || 'owed_by_us') as any,
          counterparty: String(row[3] || ''),
          totalAmount: parseFloat(row[4]) || 0,
          remainingAmount: parseFloat(row[5]) || 0,
          linkedAccountId: row[6] ? String(row[6]) : undefined,
          dueDate: row[7] ? String(row[7]) : undefined,
          interestRate: row[8] ? parseFloat(row[8]) : undefined,
          status: (row[9] || 'active') as any,
          notes: row[10] ? String(row[10]) : undefined,
          createdAt: String(row[11] || new Date().toISOString()),
        });
      }
    }
  }

  // Parse Investments
  const invValues = valueRanges[5]?.values || [];
  const investments: Investment[] = [];
  if (invValues.length > 1) {
    for (let i = 1; i < invValues.length; i++) {
      const row = invValues[i];
      if (row[0]) {
        investments.push({
          id: String(row[0]),
          name: String(row[1] || 'Investment'),
          type: (row[2] || 'dps') as any,
          initialCost: parseFloat(row[3]) || 0,
          currentValuation: parseFloat(row[4]) || 0,
          linkedAccountId: row[5] ? String(row[5]) : undefined,
          targetYield: row[6] ? parseFloat(row[6]) : undefined,
          lastEvaluated: String(row[7] || ''),
          notes: row[8] ? String(row[8]) : undefined,
        });
      }
    }
  }

  // Parse Config / Lifecycle
  const configValues = valueRanges[6]?.values || [];
  const lifecycle: LifecycleSettings = { ...INITIAL_LIFECYCLE_SETTINGS };
  for (let i = 1; i < configValues.length; i++) {
    const row = configValues[i];
    if (row[0] === 'autoRecycle5Years') lifecycle.autoRecycle5Years = row[1] === 'true';
    if (row[0] === 'archiveToDedicatedSheet') lifecycle.archiveToDedicatedSheet = row[1] === 'true';
    if (row[0] === 'archivedCount') lifecycle.archivedCount = parseInt(row[1], 10) || 0;
  }

  return {
    accounts: accounts.length > 0 ? accounts : INITIAL_ACCOUNTS,
    transactions: transactions.length > 0 ? transactions : INITIAL_TRANSACTIONS,
    budgets: budgets.length > 0 ? budgets : INITIAL_BUDGETS,
    categories: categories.length > 0 ? categories : INITIAL_CATEGORIES,
    debts: debts.length > 0 ? debts : INITIAL_DEBTS,
    investments: investments.length > 0 ? investments : INITIAL_INVESTMENTS,
    lifecycle,
  };
}

/**
 * Appends a new transaction row to the 'Transactions' sheet and updates linked account balances.
 */
export async function syncTransactionToSheet(
  spreadsheetId: string,
  accessToken: string,
  tx: Transaction,
  accounts: Account[]
): Promise<void> {
  const row = [
    tx.id,
    tx.date,
    tx.type,
    tx.amount,
    tx.currency,
    tx.fromAccountId || '',
    tx.toAccountId || '',
    tx.categoryId,
    tx.description,
    tx.familyMember || '',
    tx.notes || '',
    tx.createdAt,
  ];

  // 1. Append row to Transactions
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:L:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });

  // 2. Update Accounts sheet with latest balances
  await syncAllAccountsToSheet(spreadsheetId, accessToken, accounts);
}

/**
 * Syncs full updated account list to 'Accounts' sheet.
 */
export async function syncAllAccountsToSheet(
  spreadsheetId: string,
  accessToken: string,
  accounts: Account[]
): Promise<void> {
  const header = ['id', 'name', 'type', 'institution', 'currentBalance', 'currency', 'initialBalance', 'notes', 'updatedAt'];
  const rows = accounts.map(a => [
    a.id, a.name, a.type, a.institution, a.currentBalance, a.currency, a.initialBalance, a.notes || '', a.updatedAt,
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Accounts!A1:I${accounts.length + 1}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [header, ...rows] }),
  });
}

/**
 * Performs 5-year archival directly on the Google Sheet.
 */
export async function runSheetFiveYearArchival(
  spreadsheetId: string,
  accessToken: string,
  allTransactions: Transaction[]
): Promise<{ archivedCount: number; remainingTransactions: Transaction[] }> {
  const cutoff = getFiveYearCutoffDate();
  const toKeep: Transaction[] = [];
  const toArchive: Transaction[] = [];

  for (const tx of allTransactions) {
    if (tx.date && tx.date < cutoff) {
      toArchive.push(tx);
    } else {
      toKeep.push(tx);
    }
  }

  if (toArchive.length === 0) {
    return { archivedCount: 0, remainingTransactions: allTransactions };
  }

  const txHeader = ['id', 'date', 'type', 'amount', 'currency', 'fromAccountId', 'toAccountId', 'categoryId', 'description', 'familyMember', 'notes', 'createdAt'];

  // Append to Archive_5Yr sheet
  const archiveRows = toArchive.map(t => [
    t.id, t.date, t.type, t.amount, t.currency, t.fromAccountId || '', t.toAccountId || '', t.categoryId, t.description, t.familyMember || '', t.notes || '', t.createdAt,
  ]);

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Archive_5Yr!A1:L:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: archiveRows }),
  });

  // Rewrite active Transactions sheet
  const keepRows = toKeep.map(t => [
    t.id, t.date, t.type, t.amount, t.currency, t.fromAccountId || '', t.toAccountId || '', t.categoryId, t.description, t.familyMember || '', t.notes || '', t.createdAt,
  ]);

  // Clear sheet first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:L:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Write kept transactions back
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:L${keepRows.length + 1}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [txHeader, ...keepRows] }),
  });

  return { archivedCount: toArchive.length, remainingTransactions: toKeep };
}
