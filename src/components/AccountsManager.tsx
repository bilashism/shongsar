/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types/shongsar';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Wallet,
  Landmark,
  Smartphone,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';

interface AccountsManagerProps {
  onOpenTransfer: (sourceAccountId?: string) => void;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({ onOpenTransfer }) => {
  const { accounts, currency, addAccount, updateAccount, deleteAccount } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setType('bank');
    setInstitution('');
    setInitialBalance('');
    setNotes('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setInstitution(acc.institution);
    setInitialBalance(String(acc.initialBalance));
    setNotes(acc.notes || '');
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedBalance = parseFloat(initialBalance) || 0;

    if (editingAccount) {
      await updateAccount({
        ...editingAccount,
        name: name.trim(),
        type,
        institution: institution.trim(),
        notes: notes.trim(),
      });
      setEditingAccount(null);
    } else {
      await addAccount({
        name: name.trim(),
        type,
        institution: institution.trim(),
        currency,
        initialBalance: parsedBalance,
        notes: notes.trim(),
      });
      setIsAddModalOpen(false);
    }

    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (deletingAccountId) {
      await deleteAccount(deletingAccountId);
      setDeletingAccountId(null);
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'cash':
        return <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'bank':
        return <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'mobile_banking':
        return <Smartphone className="w-5 h-5 text-pink-600 dark:text-pink-400" />;
      case 'savings_pot':
        return <PiggyBank className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'investment_account':
        return <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <CreditCard className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Linked Funds & Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Double-entry connected pots automatically synchronized as values change
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenTransfer()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs whitespace-nowrap"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Total Aggregated Summary */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Aggregated Across Funds</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalBalance, currency)}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          <span>Active Sources: </span>
          <span className="font-semibold text-slate-900 dark:text-white font-mono">{accounts.length} Accounts</span>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {acc.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {acc.institution} · {acc.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    title="Edit account details"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAccountId(acc.id)}
                    title="Delete account"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="mt-4">
                <div className="text-xs text-slate-400">Current Balance</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(acc.currentBalance, currency)}
                </div>
              </div>

              {acc.notes && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {acc.notes}
                </p>
              )}
            </div>

            {/* Quick action bar */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-mono">
                Updated {formatDate(acc.updatedAt.split('T')[0])}
              </span>
              <button
                onClick={() => onOpenTransfer(acc.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              >
                <span>Transfer from fund</span>
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Account Modal */}
      {(isAddModalOpen || editingAccount) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add New Financial Pot'}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingAccount(null);
                  resetForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Bank Salary, Household Cash"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="mobile_banking">Mobile Wallet (bKash/Nagad)</option>
                    <option value="savings_pot">Savings Pot / Reserve</option>
                    <option value="investment_account">Investment Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution / Place
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brac Bank, Physical Wallet"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {!editingAccount && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starting / Initial Balance ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Purpose (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 6-month emergency fund buffer"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  {editingAccount ? 'Save Changes' : 'Create Fund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal for delete account */}
      <ConfirmationModal
        isOpen={Boolean(deletingAccountId)}
        title="Delete Financial Pot?"
        message="Are you sure you want to remove this linked account? Existing transactions associated with this account will remain in your Google Sheets database."
        confirmLabel="Delete Account"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingAccountId(null)}
      />

    </div>
  );
};
