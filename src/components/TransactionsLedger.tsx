/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types/shongsar';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Download,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

interface TransactionsLedgerProps {
  onOpenNewTransaction: () => void;
}

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({ onOpenNewTransaction }) => {
  const { transactions, categories, accounts, currency, deleteTransaction, sheetMetadata } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Type match
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Account match
      if (selectedAccount !== 'all') {
        const matchesFrom = tx.fromAccountId === selectedAccount;
        const matchesTo = tx.toAccountId === selectedAccount;
        if (!matchesFrom && !matchesTo) return false;
      }

      // Member match
      if (selectedMember !== 'all' && tx.familyMember !== selectedMember) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(query);
        const notesMatch = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
        const category = categories.find(c => c.id === tx.categoryId);
        const catMatch = category ? category.name.toLowerCase().includes(query) : false;
        if (!descMatch && !notesMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedType, selectedAccount, selectedMember, searchQuery, categories]);

  // Aggregate stats of filtered transactions
  const filteredStats = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') incomeSum += tx.amount;
      if (tx.type === 'expense' || tx.type === 'debt_payment' || tx.type === 'investment_allocation') {
        expenseSum += tx.amount;
      }
    }

    return { incomeSum, expenseSum, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleConfirmDelete = async () => {
    if (deletingTxId) {
      await deleteTransaction(deletingTxId);
      setDeletingTxId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'From Account', 'To Account', 'Category', 'Description', 'Family Member', 'Notes'];
    const rows = filteredTransactions.map(tx => {
      const fromAcc = accounts.find(a => a.id === tx.fromAccountId)?.name || '';
      const toAcc = accounts.find(a => a.id === tx.toAccountId)?.name || '';
      const cat = categories.find(c => c.id === tx.categoryId)?.name || '';
      return [
        tx.id,
        tx.date,
        tx.type,
        tx.amount,
        tx.currency,
        `"${fromAcc}"`,
        `"${toAcc}"`,
        `"${cat}"`,
        `"${tx.description.replace(/"/g, '""')}"`,
        `"${tx.familyMember || ''}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shongsar_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Family Ledger & History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized live with 'shongsar' Google Spreadsheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* Search text */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, note, or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Accounts / Pots</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Family Member Filter */}
          <div>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Family Members</option>
              <option value="Shared Family">Shared Family</option>
              <option value="Bilash">Bilash</option>
              <option value="Spouse">Spouse</option>
              <option value="Children">Children</option>
              <option value="Parents">Parents</option>
            </select>
          </div>

        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Type:</span>
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'expense', label: 'Expenses' },
            { id: 'income', label: 'Incomes' },
            { id: 'transfer', label: 'Transfers' },
            { id: 'debt_payment', label: 'Debt Payments' },
            { id: 'investment_allocation', label: 'Investments' },
          ].map(typeItem => (
            <button
              key={typeItem.id}
              onClick={() => setSelectedType(typeItem.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedType === typeItem.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {typeItem.label}
            </button>
          ))}

          {/* Quick Filter Counts */}
          <span className="ml-auto text-[11px] text-slate-500 font-mono">
            {filteredStats.count} entries ({formatCurrency(filteredStats.expenseSum, currency)} spent)
          </span>
        </div>

      </div>

      {/* Transactions Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Notes</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account / Fund</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const category = categories.find(c => c.id === tx.categoryId);
                  const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
                  const toAcc = accounts.find(a => a.id === tx.toAccountId);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {formatDate(tx.date)}
                      </td>

                      {/* Description & Notes */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Category (Zero-pill text) */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {category?.name || 'General'}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        {tx.type === 'transfer' ? (
                          <div className="font-mono">
                            <span className="text-slate-500">{fromAcc?.name}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{toAcc?.name}</span>
                          </div>
                        ) : tx.type === 'income' ? (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            {toAcc?.name || 'Inflow'}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            {fromAcc?.name || 'Account'}
                          </span>
                        )}
                      </td>

                      {/* Family Member */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                        {tx.familyMember || 'Family'}
                      </td>

                      {/* Amount with Tabular Numerals */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums font-bold">
                        <span
                          className={
                            tx.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'transfer'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-900 dark:text-white'
                          }
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setDeletingTxId(tx.id)}
                          title="Delete entry from sheet"
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Delete Transaction */}
      <ConfirmationModal
        isOpen={Boolean(deletingTxId)}
        title="Delete Transaction?"
        message="Are you sure you want to remove this record? Removing this transaction will automatically recalculate and revert the associated account balances in both the application and your Google Sheet database."
        confirmLabel="Delete Transaction"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTxId(null)}
      />

    </div>
  );
};
