/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types/shongsar';
import { formatCurrency } from '../utils/formatters';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose }) => {
  const { accounts, categories, currency, addTransaction, debts, investments } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || 'cat_groceries');
  const [fromAccountId, setFromAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || '');
  const [description, setDescription] = useState<string>('');
  const [familyMember, setFamilyMember] = useState<string>('Shared Family');
  const [notes, setNotes] = useState<string>('');
  const [linkedDebtId, setLinkedDebtId] = useState<string>(debts[0]?.id || '');
  const [linkedInvestmentId, setLinkedInvestmentId] = useState<string>(investments[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => {
    if (type === 'income') return c.type === 'income';
    return c.type === 'expense';
  });

  const parsedAmount = parseFloat(amount) || 0;
  const selectedFromAccount = accounts.find(a => a.id === fromAccountId);
  const selectedToAccount = accounts.find(a => a.id === toAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      let finalDescription = description.trim();
      if (!finalDescription) {
        if (type === 'transfer') {
          finalDescription = `Transfer: ${selectedFromAccount?.name || 'Account'} → ${selectedToAccount?.name || 'Account'}`;
        } else if (type === 'debt_payment') {
          const d = debts.find(debt => debt.id === linkedDebtId);
          finalDescription = `Debt Payment: ${d?.title || 'Loan'}`;
        } else if (type === 'investment_allocation') {
          const inv = investments.find(i => i.id === linkedInvestmentId);
          finalDescription = `Capital Allocation: ${inv?.name || 'Asset'}`;
        } else {
          const cat = categories.find(c => c.id === categoryId);
          finalDescription = `${cat?.name || 'Transaction'}`;
        }
      }

      await addTransaction({
        date,
        type,
        amount: parsedAmount,
        currency,
        fromAccountId: type === 'income' ? undefined : fromAccountId,
        toAccountId: type === 'expense' || type === 'debt_payment' || type === 'investment_allocation' ? undefined : toAccountId,
        categoryId: type === 'transfer' ? 'cat_transfer' : categoryId,
        description: finalDescription,
        familyMember,
        notes,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Record Family Transaction</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time ledger entry with automatic fund reconciliation</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Transaction Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Transaction Mode
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {[
                { id: 'expense', label: 'Expense' },
                { id: 'income', label: 'Income' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'debt_payment', label: 'Debt Pay' },
                { id: 'investment_allocation', label: 'Invest' },
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setType(item.id as TransactionType)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all text-center whitespace-nowrap ${
                    type === item.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Linked Account Selectors (Double Entry) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== 'income' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  From Account (Debited)
                </label>
                <select
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(type === 'income' || type === 'transfer') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To Account (Credited)
                </label>
                <select
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts
                    .filter(acc => type !== 'transfer' || acc.id !== fromAccountId)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Category Selector (for Expense and Income) */}
          {type !== 'transfer' && type !== 'debt_payment' && type !== 'investment_allocation' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Budget Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Linked Debt Selector */}
          {type === 'debt_payment' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Active Debt
              </label>
              <select
                value={linkedDebtId}
                onChange={e => setLinkedDebtId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {debts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} (Remaining: {formatCurrency(d.remainingAmount, currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Linked Investment Selector */}
          {type === 'investment_allocation' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Investment Asset
              </label>
              <select
                value={linkedInvestmentId}
                onChange={e => setLinkedInvestmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {investments.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Valuation: {formatCurrency(i.currentValuation, currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description & Family Member */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Weekly Kitchen Staples, Monthly Tuition"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Family Member
              </label>
              <select
                value={familyMember}
                onChange={e => setFamilyMember(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Shared Family">Shared Family</option>
                <option value="Bilash">Bilash</option>
                <option value="Spouse">Spouse</option>
                <option value="Children">Children</option>
                <option value="Parents">Parents</option>
              </select>
            </div>
          </div>

          {/* Real-time Double-Entry Impact Preview */}
          {parsedAmount > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Double-Entry Balance Propagation Preview</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {selectedFromAccount && type !== 'income' && (
                  <span className="flex items-center gap-1 font-mono">
                    <span className="text-slate-500">{selectedFromAccount.name}:</span>
                    <span className="text-slate-400 line-through">
                      {formatCurrency(selectedFromAccount.currentBalance, currency)}
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(selectedFromAccount.currentBalance - parsedAmount, currency)}
                    </span>
                  </span>
                )}
                {selectedToAccount && (type === 'income' || type === 'transfer') && (
                  <span className="flex items-center gap-1 font-mono">
                    <span className="text-slate-500">{selectedToAccount.name}:</span>
                    <span className="text-slate-400 line-through">
                      {formatCurrency(selectedToAccount.currentBalance, currency)}
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedToAccount.currentBalance + parsedAmount, currency)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
