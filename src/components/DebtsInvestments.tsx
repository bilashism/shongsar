/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Debt, DebtType, Investment, InvestmentType } from '../types/shongsar';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ShieldAlert,
  TrendingUp,
  Plus,
  CheckCircle2,
  Calendar,
  Percent,
  X,
  CreditCard,
  Briefcase,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export const DebtsInvestments: React.FC = () => {
  const {
    debts,
    investments,
    accounts,
    currency,
    addDebt,
    recordDebtPayment,
    addInvestment,
    updateInvestmentValuation,
  } = useFinance();

  // Debt Modals State
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState(accounts[0]?.id || '');

  // Add Debt Form State
  const [debtTitle, setDebtTitle] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('owed_by_us');
  const [debtCounterparty, setDebtCounterparty] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtInterest, setDebtInterest] = useState('');

  // Investment Modals State
  const [isAddInvOpen, setIsAddInvOpen] = useState(false);
  const [evaluatingInv, setEvaluatingInv] = useState<Investment | null>(null);
  const [newValuationInput, setNewValuationInput] = useState('');

  // Add Inv Form State
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState<InvestmentType>('dps');
  const [invInitialCost, setInvInitialCost] = useState('');
  const [invCurrentVal, setInvCurrentVal] = useState('');
  const [invTargetYield, setInvTargetYield] = useState('');
  const [invLinkedAcc, setInvLinkedAcc] = useState('');

  // Debts calculation
  const totalDebtsOwed = debts
    .filter(d => d.type === 'owed_by_us' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalDebtsReceivable = debts
    .filter(d => d.type === 'owed_to_us' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  // Investments calculation
  const totalInvestedCost = investments.reduce((sum, i) => sum + i.initialCost, 0);
  const totalInvestedValuation = investments.reduce((sum, i) => sum + i.currentValuation, 0);
  const unrealizedGain = totalInvestedValuation - totalInvestedCost;
  const unrealizedYield = totalInvestedCost > 0 ? ((unrealizedGain / totalInvestedCost) * 100).toFixed(1) : '0';

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) return;

    await recordDebtPayment(payingDebt.id, amt, paymentAccount);
    setPayingDebt(null);
    setPaymentAmount('');
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTitle.trim()) return;
    const total = parseFloat(debtTotal) || 0;

    await addDebt({
      title: debtTitle.trim(),
      type: debtType,
      counterparty: debtCounterparty.trim(),
      totalAmount: total,
      dueDate: debtDueDate || undefined,
      interestRate: debtInterest ? parseFloat(debtInterest) : undefined,
    });

    setIsAddDebtOpen(false);
    setDebtTitle('');
    setDebtCounterparty('');
    setDebtTotal('');
    setDebtDueDate('');
    setDebtInterest('');
  };

  const handleUpdateValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingInv) return;
    const newVal = parseFloat(newValuationInput) || 0;
    await updateInvestmentValuation(evaluatingInv.id, newVal);
    setEvaluatingInv(null);
  };

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) return;
    const cost = parseFloat(invInitialCost) || 0;
    const current = parseFloat(invCurrentVal) || cost;

    await addInvestment({
      name: invName.trim(),
      type: invType,
      initialCost: cost,
      currentValuation: current,
      targetYield: invTargetYield ? parseFloat(invTargetYield) : undefined,
      linkedAccountId: invLinkedAcc || undefined,
    });

    setIsAddInvOpen(false);
    setInvName('');
    setInvInitialCost('');
    setInvCurrentVal('');
    setInvTargetYield('');
    setInvLinkedAcc('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Debts, Liabilities & Investment Assets
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Linked payoff schedules and wealth accumulation tracked in your Google Spreadsheet
        </p>
      </div>

      {/* SECTION 1: DEBTS & LIABILITIES */}
      <div className="space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Family Debts & Loans
            </h2>
          </div>

          <button
            onClick={() => setIsAddDebtOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Loan / Debt</span>
          </button>
        </div>

        {/* Debt KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500">Total Outstanding Liabilities (Owed by Us)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(totalDebtsOwed, currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500">Total Receivables (Owed to Us by Others)</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalDebtsReceivable, currency)}
            </div>
          </div>
        </div>

        {/* Debts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map(debt => {
            const isOwedByUs = debt.type === 'owed_by_us';
            const progress = debt.totalAmount > 0
              ? Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100)
              : 100;

            return (
              <div
                key={debt.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{debt.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isOwedByUs ? 'Owed to: ' : 'Lent to: '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {debt.counterparty}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      debt.status === 'settled'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50'
                        : isOwedByUs
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50'
                    }`}
                  >
                    {debt.status === 'settled' ? 'Settled' : isOwedByUs ? 'Liability' : 'Receivable'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Remaining Balance</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(debt.remainingAmount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Initial Principal</span>
                    <span>{formatCurrency(debt.totalAmount, currency)}</span>
                  </div>
                </div>

                {/* Payoff Progress */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        debt.status === 'settled' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{progress}% Paid Off</span>
                    {debt.dueDate && <span>Due: {formatDate(debt.dueDate)}</span>}
                  </div>
                </div>

                {debt.status !== 'settled' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        setPayingDebt(debt);
                        setPaymentAmount('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Record Payoff →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: INVESTMENTS & WEALTH ASSETS */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Family Investments & Assets
            </h2>
          </div>

          <button
            onClick={() => setIsAddInvOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Asset</span>
          </button>
        </div>

        {/* Investment Portfolio KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500">Total Capital Cost Invested</span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalInvestedCost, currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500">Current Market Valuation</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalInvestedValuation, currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500">Unrealized Growth</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>+{formatCurrency(unrealizedGain, currency)}</span>
              <span className="text-xs font-normal">({unrealizedYield}%)</span>
            </div>
          </div>
        </div>

        {/* Investments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map(inv => {
            const gain = inv.currentValuation - inv.initialCost;
            const yieldPct = inv.initialCost > 0 ? ((gain / inv.initialCost) * 100).toFixed(1) : '0';

            return (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {inv.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {inv.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Current Valuation</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.currentValuation, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Initial Cost</span>
                    <span>{formatCurrency(inv.initialCost, currency)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{yieldPct}% yield</span>
                  </div>

                  <button
                    onClick={() => {
                      setEvaluatingInv(inv);
                      setNewValuationInput(String(inv.currentValuation));
                    }}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    Update Valuation
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Pay Debt Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Record Debt Payoff
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{payingDebt.title}</p>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pay From Linked Fund
                </label>
                <select
                  value={paymentAccount}
                  onChange={e => setPaymentAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  Execute Payoff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Debt or Loan</h3>
              <button
                onClick={() => setIsAddDebtOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Car Loan, Friendly Loan"
                  value={debtTitle}
                  onChange={e => setDebtTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Debt Relationship
                </label>
                <select
                  value={debtType}
                  onChange={e => setDebtType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="owed_by_us">Liability (We owe someone)</option>
                  <option value="owed_to_us">Receivable (Someone owes us)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Counterparty (Person or Bank)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Bank, Cousin Rahman"
                  value={debtCounterparty}
                  onChange={e => setDebtCounterparty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Principal Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={debtTotal}
                  onChange={e => setDebtTotal(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDebtOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-xl"
                >
                  Save Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Valuation Modal */}
      {evaluatingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Asset Valuation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{evaluatingInv.name}</p>
              </div>
              <button
                onClick={() => setEvaluatingInv(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateValuation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Market Value ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={newValuationInput}
                  onChange={e => setNewValuationInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEvaluatingInv(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  Update Valuation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
      {isAddInvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Investment Asset</h3>
              <button
                onClick={() => setIsAddInvOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvestment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5-Yr Savings Certificate, DPS, Gold"
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Category
                </label>
                <select
                  value={invType}
                  onChange={e => setInvType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="savings_certificate">Savings Certificate (Sanchayapatra)</option>
                  <option value="dps">Deposit Pension Scheme (DPS)</option>
                  <option value="stocks">Stock / Equity Portfolio</option>
                  <option value="gold">Gold Bullion / Sovereign</option>
                  <option value="real_estate">Real Estate & Land</option>
                  <option value="mutual_fund">Mutual Fund</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Cost Basis ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={invInitialCost}
                  onChange={e => setInvInitialCost(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Valuation ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Leave empty if same as cost"
                  value={invCurrentVal}
                  onChange={e => setInvCurrentVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddInvOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-xl"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
