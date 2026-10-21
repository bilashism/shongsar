/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, getCurrentMonthKey } from '../utils/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRightLeft,
  Plus,
  Landmark,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  GitBranch,
} from 'lucide-react';

interface OverviewDashboardProps {
  onOpenNewTransaction: () => void;
  onOpenTransfer: () => void;
  onOpenAppsScript: () => void;
  onOpenGitHubCicd?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onOpenNewTransaction,
  onOpenTransfer,
  onOpenAppsScript,
  onOpenGitHubCicd,
}) => {
  const {
    accounts,
    transactions,
    categories,
    budgets,
    debts,
    investments,
    currency,
    selectedMonth,
    setSelectedMonth,
    sheetMetadata,
    setActiveTab,
  } = useFinance();

  // Metrics calculation
  const metrics = useMemo(() => {
    // Liquid assets: Cash, Bank, Mobile Banking
    const liquidTotal = accounts
      .filter(a => a.type === 'cash' || a.type === 'bank' || a.type === 'mobile_banking')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    // Savings pots
    const savingsTotal = accounts
      .filter(a => a.type === 'savings_pot')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    // Investment valuations
    const investmentsTotal = investments.reduce((sum, i) => sum + i.currentValuation, 0);

    // Debts owed by us
    const debtsOwedTotal = debts
      .filter(d => d.type === 'owed_by_us' && d.status === 'active')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    // Debts owed to us
    const debtsReceivableTotal = debts
      .filter(d => d.type === 'owed_to_us' && d.status === 'active')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    // Net worth = Liquid + Savings + Investments + Receivables - Debts Owed
    const netWorth = liquidTotal + savingsTotal + investmentsTotal + debtsReceivableTotal - debtsOwedTotal;

    // Current month flow
    const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      liquidTotal,
      savingsTotal,
      investmentsTotal,
      debtsOwedTotal,
      debtsReceivableTotal,
      netWorth,
      monthlyIncome,
      monthlyExpense,
      monthlySavingsRate: monthlyIncome > 0 ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)) : 0,
    };
  }, [accounts, transactions, debts, investments, selectedMonth]);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions].slice(0, 5);
  }, [transactions]);

  // Top budget envelopes for selected month
  const categoryBudgets = useMemo(() => {
    const monthTx = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
    
    return categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const spent = monthTx
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);

        const budget = budgets.find(b => b.categoryId === cat.id && b.month === selectedMonth);
        const allocated = budget ? budget.allocatedAmount : cat.defaultMonthlyBudget;
        const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

        return {
          category: cat,
          spent,
          allocated,
          percentage,
          remaining: allocated - spent,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [categories, transactions, budgets, selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Family Financial Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time balance propagation backed by personal Google Spreadsheet database
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden text-xs cursor-pointer font-medium"
            />
          </div>

          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Net Worth & High-Level KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Worth Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Family Total Net Worth</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(metrics.netWorth, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Liquid: {formatCurrency(metrics.liquidTotal, currency)}</span>
            <span aria-hidden="true">·</span>
            <span>Invested: {formatCurrency(metrics.investmentsTotal, currency)}</span>
          </div>
        </div>

        {/* Liquid Cash & Bank */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Available Liquid Funds</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(metrics.liquidTotal, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Emergency Pot: {formatCurrency(metrics.savingsTotal, currency)}</span>
          </div>
        </div>

        {/* Monthly Inflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Monthly Total Inflow</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics.monthlyIncome, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Savings Rate:</span>
            <span className="font-semibold text-emerald-600 font-mono">{metrics.monthlySavingsRate}%</span>
          </div>
        </div>

        {/* Monthly Outflow / Burn */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>Monthly Expenses & Burn</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(metrics.monthlyExpense, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Net Monthly Surplus:</span>
            <span className={`font-mono font-semibold ${metrics.monthlyIncome - metrics.monthlyExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.monthlyIncome - metrics.monthlyExpense, currency)}
            </span>
          </div>
        </div>

      </div>

      {/* Main 2-Column Split: Linked Accounts Overview + Envelope Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Linked Accounts Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Linked Source Accounts</h3>
                <p className="text-xs text-slate-500">Double-entry real-time balances</p>
              </div>
              <button
                onClick={() => setActiveTab('accounts')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                Manage All ({accounts.length}) →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.slice(0, 4).map(account => (
                <div
                  key={account.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {account.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      {account.institution}
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(account.currentBalance, currency)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    {account.notes || 'Linked fund'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
                <p className="text-xs text-slate-500">Latest activity in your Google Sheets database</p>
              </div>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                View Ledger →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map(tx => {
                const category = categories.find(c => c.id === tx.categoryId);
                const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
                const toAcc = accounts.find(a => a.id === tx.toAccountId);

                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{formatDate(tx.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{category?.name || 'General'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {tx.type === 'transfer'
                            ? `${fromAcc?.name} → ${toAcc?.name}`
                            : fromAcc?.name || toAcc?.name || 'Account'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {tx.familyMember || 'Family'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Monthly Budget Envelopes Progress */}
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Budget Envelopes</h3>
                <p className="text-xs text-slate-500">Allocation for {selectedMonth}</p>
              </div>
              <button
                onClick={() => setActiveTab('budgets')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                Adjust Targets →
              </button>
            </div>

            <div className="space-y-4">
              {categoryBudgets.slice(0, 5).map(item => {
                const isOverBudget = item.spent > item.allocated;
                const isNearing = item.percentage >= 85 && !isOverBudget;

                return (
                  <div key={item.category.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.category.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                        {formatCurrency(item.spent, currency)} / {formatCurrency(item.allocated, currency)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverBudget
                            ? 'bg-rose-500'
                            : isNearing
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{item.percentage}% consumed</span>
                      <span className={isOverBudget ? 'text-rose-500 font-semibold' : ''}>
                        {isOverBudget
                          ? `Exceeded by ${formatCurrency(Math.abs(item.remaining), currency)}`
                          : `${formatCurrency(item.remaining, currency)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 100% Free Apps Script Web App Host Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden border border-slate-700/60">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                100% Free Web App Hosting
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              You can host this entire web app completely free forever using Google Apps Script's Web App feature. No servers, no Vercel or cloud fees.
            </p>
            <div className="space-y-2">
              <button
                onClick={onOpenAppsScript}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Get Free Hosting Code &amp; Guide</span>
              </button>

              {onOpenGitHubCicd && (
                <button
                  onClick={onOpenGitHubCicd}
                  className="w-full py-1.5 px-3 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 rounded-xl border border-slate-700 transition-colors text-center shadow-xs flex items-center justify-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Setup GitHub CI/CD Pipeline</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
