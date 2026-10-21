/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CurrencyCode = 'BDT' | 'USD' | 'EUR' | 'GBP' | 'INR' | string;

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  format: 'south_asian' | 'standard'; // BDT uses lakh/crore (1,00,000), standard uses 100,000
}

export type AccountType = 
  | 'cash' 
  | 'bank' 
  | 'mobile_banking' 
  | 'savings_pot' 
  | 'investment_account' 
  | 'credit_line';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string; // e.g. "Cash Wallet", "City Bank", "bKash", "Brac Bank"
  currency: CurrencyCode;
  initialBalance: number;
  currentBalance: number;
  notes?: string;
  updatedAt: string;
}

export type TransactionType = 
  | 'expense' 
  | 'income' 
  | 'transfer' 
  | 'debt_payment' 
  | 'investment_allocation';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  fromAccountId?: string; // Debited account (for expense, transfer, debt_payment, investment)
  toAccountId?: string;   // Credited account (for income, transfer)
  categoryId: string;
  description: string;
  familyMember?: string;  // e.g. "Bilash", "Self", "Shared Family", "Spouse"
  notes?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  defaultMonthlyBudget: number;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  categoryId: string;
  allocatedAmount: number;
  spentAmount?: number;
  notes?: string;
}

export type DebtType = 'owed_by_us' | 'owed_to_us';

export interface Debt {
  id: string;
  title: string;
  type: DebtType;
  counterparty: string; // Person / Bank name
  totalAmount: number;
  remainingAmount: number;
  linkedAccountId?: string; // Account from which repayments are made or received
  dueDate?: string;
  interestRate?: number;
  status: 'active' | 'settled';
  notes?: string;
  createdAt: string;
}

export type InvestmentType = 
  | 'stocks' 
  | 'dps' 
  | 'savings_certificate' 
  | 'real_estate' 
  | 'gold' 
  | 'mutual_fund';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  initialCost: number;
  currentValuation: number;
  linkedAccountId?: string; // Source account used to fund this investment
  targetYield?: number;     // e.g., 9.5% annual return
  lastEvaluated: string;
  notes?: string;
}

export interface LifecycleSettings {
  autoRecycle5Years: boolean; // If true, delete older than 5 years; if false, keep everything
  archiveToDedicatedSheet: boolean; // If true, move to Archive_5Yr tab before deletion
  lastArchivedAt?: string;
  archivedCount: number;
}

export interface SheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'demo_mode';
