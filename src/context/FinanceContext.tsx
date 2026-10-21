/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  Account,
  Budget,
  Category,
  CurrencyCode,
  Debt,
  Investment,
  LifecycleSettings,
  SheetMetadata,
  SyncStatus,
  Transaction,
} from '../types/shongsar';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_CATEGORIES,
  INITIAL_DEBTS,
  INITIAL_INVESTMENTS,
  INITIAL_LIFECYCLE_SETTINGS,
  INITIAL_TRANSACTIONS,
} from '../data/seedData';
import { googleSignIn, initAuth, logout } from '../services/firebaseAuth';
import {
  createShongsarSpreadsheet,
  findShongsarSpreadsheet,
  loadSpreadsheetData,
  runSheetFiveYearArchival,
  syncAllAccountsToSheet,
  syncTransactionToSheet,
} from '../services/googleSheets';
import { getCurrentMonthKey, getFiveYearCutoffDate } from '../utils/formatters';

interface FinanceContextType {
  user: User | null;
  accessToken: string | null;
  sheetMetadata: SheetMetadata | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;

  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  debts: Debt[];
  investments: Investment[];
  lifecycleSettings: LifecycleSettings;

  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  transferFunds: (fromId: string, toId: string, amount: number, description: string, date?: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'currentBalance' | 'updatedAt'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id' | 'remainingAmount' | 'createdAt' | 'status'>) => Promise<void>;
  recordDebtPayment: (debtId: string, amount: number, fromAccountId: string, date?: string) => Promise<void>;
  addInvestment: (investment: Omit<Investment, 'id' | 'lastEvaluated'>) => Promise<void>;
  updateInvestmentValuation: (investmentId: string, newValuation: number) => Promise<void>;
  updateLifecycleSettings: (settings: Partial<LifecycleSettings>) => Promise<void>;
  runFiveYearMaintenance: () => Promise<number>;

  // Auth / Google Sync
  handleConnectGoogle: () => Promise<void>;
  handleDisconnectGoogle: () => Promise<void>;
  handleManualSync: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sheetMetadata, setSheetMetadata] = useState<SheetMetadata | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('demo_mode');
  const [syncError, setSyncError] = useState<string | null>(null);

  const [currency, setCurrency] = useState<CurrencyCode>('BDT');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());

  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [debts, setDebts] = useState<Debt[]>(INITIAL_DEBTS);
  const [investments, setInvestments] = useState<Investment[]>(INITIAL_INVESTMENTS);
  const [lifecycleSettings, setLifecycleSettings] = useState<LifecycleSettings>(INITIAL_LIFECYCLE_SETTINGS);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        await initOrLoadSheet(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setSyncStatus('demo_mode');
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect or discover 'shongsar' spreadsheet
  const initOrLoadSheet = useCallback(async (token: string) => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      let spreadsheetId = await findShongsarSpreadsheet(token);
      let metadata: SheetMetadata;

      if (!spreadsheetId) {
        // Create new spreadsheet 'shongsar'
        metadata = await createShongsarSpreadsheet(token);
      } else {
        metadata = {
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
          title: 'shongsar',
          lastSyncedAt: new Date().toISOString(),
        };
      }

      setSheetMetadata(metadata);

      // Load data from spreadsheet
      const data = await loadSpreadsheetData(metadata.spreadsheetId, token);
      setAccounts(data.accounts);
      setTransactions(data.transactions);
      setCategories(data.categories);
      setBudgets(data.budgets);
      setDebts(data.debts);
      setInvestments(data.investments);
      setLifecycleSettings(data.lifecycle);

      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to sync with Google Sheet:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Unable to sync with Google Sheets');
    }
  }, []);

  const handleConnectGoogle = async () => {
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        await initOrLoadSheet(result.accessToken);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || 'Google Sign-In was cancelled or failed.');
    }
  };

  const handleDisconnectGoogle = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSheetMetadata(null);
    setSyncStatus('demo_mode');
    setSyncError(null);
  };

  const handleManualSync = async () => {
    if (!accessToken || !sheetMetadata) return;
    await initOrLoadSheet(accessToken);
  };

  /**
   * Double-Entry Balance Engine:
   * Adds transaction and synchronously updates all linked account balances.
   */
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    // Update state & calculate linked balances
    setAccounts(prevAccounts => {
      const updated = prevAccounts.map(acc => {
        let newBalance = acc.currentBalance;

        // Debit from source account
        if (newTx.fromAccountId && acc.id === newTx.fromAccountId) {
          newBalance -= newTx.amount;
        }

        // Credit to destination account
        if (newTx.toAccountId && acc.id === newTx.toAccountId) {
          newBalance += newTx.amount;
        }

        return {
          ...acc,
          currentBalance: Math.round(newBalance * 100) / 100,
          updatedAt: new Date().toISOString(),
        };
      });

      // Async sync to Google Sheets if connected
      if (accessToken && sheetMetadata) {
        syncTransactionToSheet(sheetMetadata.spreadsheetId, accessToken, newTx, updated).catch(err => {
          console.error('Background sheet sync failed:', err);
        });
      }

      return updated;
    });

    setTransactions(prev => [newTx, ...prev]);

    // Update budget spent amount for this category if expense
    if (newTx.type === 'expense') {
      const monthKey = newTx.date.substring(0, 7);
      setBudgets(prev =>
        prev.map(b => {
          if (b.categoryId === newTx.categoryId && b.month === monthKey) {
            return {
              ...b,
              spentAmount: (b.spentAmount || 0) + newTx.amount,
            };
          }
          return b;
        })
      );
    }
  };

  const deleteTransaction = async (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    // Reverse balance effect
    setAccounts(prev =>
      prev.map(acc => {
        let newBalance = acc.currentBalance;
        if (target.fromAccountId && acc.id === target.fromAccountId) {
          newBalance += target.amount; // Add back debited amount
        }
        if (target.toAccountId && acc.id === target.toAccountId) {
          newBalance -= target.amount; // Remove credited amount
        }
        return { ...acc, currentBalance: newBalance, updatedAt: new Date().toISOString() };
      })
    );

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const transferFunds = async (
    fromId: string,
    toId: string,
    amount: number,
    description: string,
    date?: string
  ) => {
    const fromAcc = accounts.find(a => a.id === fromId);
    const toAcc = accounts.find(a => a.id === toId);

    await addTransaction({
      date: date || new Date().toISOString().split('T')[0],
      type: 'transfer',
      amount,
      currency,
      fromAccountId: fromId,
      toAccountId: toId,
      categoryId: 'cat_transfer',
      description: description || `Transfer: ${fromAcc?.name || 'Account'} → ${toAcc?.name || 'Account'}`,
      notes: `Linked account transfer between ${fromAcc?.name} and ${toAcc?.name}`,
    });
  };

  const addAccount = async (accData: Omit<Account, 'id' | 'currentBalance' | 'updatedAt'>) => {
    const newAcc: Account = {
      ...accData,
      id: `acc_${Date.now()}`,
      currentBalance: accData.initialBalance,
      updatedAt: new Date().toISOString(),
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);

    if (accessToken && sheetMetadata) {
      syncAllAccountsToSheet(sheetMetadata.spreadsheetId, accessToken, updated).catch(console.error);
    }
  };

  const updateAccount = async (account: Account) => {
    const updated = accounts.map(a => (a.id === account.id ? { ...account, updatedAt: new Date().toISOString() } : a));
    setAccounts(updated);
    if (accessToken && sheetMetadata) {
      syncAllAccountsToSheet(sheetMetadata.spreadsheetId, accessToken, updated).catch(console.error);
    }
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    if (accessToken && sheetMetadata) {
      syncAllAccountsToSheet(sheetMetadata.spreadsheetId, accessToken, updated).catch(console.error);
    }
  };

  const addCategory = async (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat_${Date.now()}`,
    };
    setCategories(prev => [...prev, newCat]);
  };

  const updateCategory = async (category: Category) => {
    setCategories(prev => prev.map(c => (c.id === category.id ? category : c)));
  };

  const updateBudget = async (budget: Budget) => {
    setBudgets(prev => {
      const exists = prev.some(b => b.categoryId === budget.categoryId && b.month === budget.month);
      if (exists) {
        return prev.map(b => (b.categoryId === budget.categoryId && b.month === budget.month ? budget : b));
      }
      return [...prev, { ...budget, id: `b_${Date.now()}` }];
    });
  };

  const addDebt = async (debtData: Omit<Debt, 'id' | 'remainingAmount' | 'createdAt' | 'status'>) => {
    const newDebt: Debt = {
      ...debtData,
      id: `debt_${Date.now()}`,
      remainingAmount: debtData.totalAmount,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setDebts(prev => [newDebt, ...prev]);
  };

  const recordDebtPayment = async (
    debtId: string,
    amount: number,
    fromAccountId: string,
    date?: string
  ) => {
    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const newRemaining = Math.max(0, targetDebt.remainingAmount - amount);
    const updatedDebts = debts.map(d =>
      d.id === debtId
        ? {
            ...d,
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? ('settled' as const) : ('active' as const),
          }
        : d
    );
    setDebts(updatedDebts);

    // Record linked payment transaction
    await addTransaction({
      date: date || new Date().toISOString().split('T')[0],
      type: 'debt_payment',
      amount,
      currency,
      fromAccountId,
      categoryId: 'cat_debt',
      description: `Debt Repayment: ${targetDebt.title} (${targetDebt.counterparty})`,
      notes: `Remaining balance: ${newRemaining}`,
    });
  };

  const addInvestment = async (invData: Omit<Investment, 'id' | 'lastEvaluated'>) => {
    const newInv: Investment = {
      ...invData,
      id: `inv_${Date.now()}`,
      lastEvaluated: new Date().toISOString().split('T')[0],
    };

    setInvestments(prev => [...prev, newInv]);

    // If linked account specified, log the investment allocation transaction
    if (newInv.linkedAccountId && newInv.initialCost > 0) {
      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'investment_allocation',
        amount: newInv.initialCost,
        currency,
        fromAccountId: newInv.linkedAccountId,
        categoryId: 'cat_investment',
        description: `Investment Capital Allocation: ${newInv.name}`,
        notes: `Asset Type: ${newInv.type}`,
      });
    }
  };

  const updateInvestmentValuation = async (investmentId: string, newValuation: number) => {
    setInvestments(prev =>
      prev.map(inv =>
        inv.id === investmentId
          ? {
              ...inv,
              currentValuation: newValuation,
              lastEvaluated: new Date().toISOString().split('T')[0],
            }
          : inv
      )
    );
  };

  const updateLifecycleSettings = async (settings: Partial<LifecycleSettings>) => {
    setLifecycleSettings(prev => ({ ...prev, ...settings }));
  };

  /**
   * 5-Year Maintenance Protocol:
   * Recycles or archives transactions older than 5 years.
   */
  const runFiveYearMaintenance = async (): Promise<number> => {
    const cutoff = getFiveYearCutoffDate();
    const older = transactions.filter(t => t.date < cutoff);
    if (older.length === 0) return 0;

    if (accessToken && sheetMetadata) {
      const result = await runSheetFiveYearArchival(sheetMetadata.spreadsheetId, accessToken, transactions);
      setTransactions(result.remainingTransactions);
      setLifecycleSettings(prev => ({
        ...prev,
        archivedCount: prev.archivedCount + result.archivedCount,
        lastArchivedAt: new Date().toISOString(),
      }));
      return result.archivedCount;
    } else {
      // Offline simulation
      setTransactions(prev => prev.filter(t => t.date >= cutoff));
      setLifecycleSettings(prev => ({
        ...prev,
        archivedCount: prev.archivedCount + older.length,
        lastArchivedAt: new Date().toISOString(),
      }));
      return older.length;
    }
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      sheetMetadata,
      syncStatus,
      syncError,
      currency,
      setCurrency,
      accounts,
      transactions,
      categories,
      budgets,
      debts,
      investments,
      lifecycleSettings,
      activeTab,
      setActiveTab,
      selectedMonth,
      setSelectedMonth,
      addTransaction,
      deleteTransaction,
      transferFunds,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      updateBudget,
      addDebt,
      recordDebtPayment,
      addInvestment,
      updateInvestmentValuation,
      updateLifecycleSettings,
      runFiveYearMaintenance,
      handleConnectGoogle,
      handleDisconnectGoogle,
      handleManualSync,
    }),
    [
      user,
      accessToken,
      sheetMetadata,
      syncStatus,
      syncError,
      currency,
      accounts,
      transactions,
      categories,
      budgets,
      debts,
      investments,
      lifecycleSettings,
      activeTab,
      selectedMonth,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
