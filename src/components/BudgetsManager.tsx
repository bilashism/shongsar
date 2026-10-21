/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Category } from '../types/shongsar';
import { formatCurrency } from '../utils/formatters';
import {
  Calendar,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  X,
  Target,
  Sparkles,
} from 'lucide-react';

export const BudgetsManager: React.FC = () => {
  const {
    categories,
    budgets,
    transactions,
    currency,
    selectedMonth,
    setSelectedMonth,
    updateBudget,
    addCategory,
  } = useFinance();

  const [editingBudgetCategory, setEditingBudgetCategory] = useState<Category | null>(null);
  const [allocationInput, setAllocationInput] = useState<string>('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatDefault, setNewCatDefault] = useState('');

  // Calculate spent amounts for the selected month
  const categoryBudgets = useMemo(() => {
    const monthExpenses = transactions.filter(
      t => t.date.startsWith(selectedMonth) && t.type === 'expense'
    );

    return categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const spent = monthExpenses
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);

        const existingBudget = budgets.find(b => b.categoryId === cat.id && b.month === selectedMonth);
        const allocated = existingBudget ? existingBudget.allocatedAmount : cat.defaultMonthlyBudget;
        const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
        const remaining = allocated - spent;

        return {
          category: cat,
          budgetId: existingBudget?.id,
          spent,
          allocated,
          percentage,
          remaining,
          isOver: spent > allocated,
        };
      });
  }, [categories, budgets, transactions, selectedMonth]);

  const totalAllocated = categoryBudgets.reduce((sum, c) => sum + c.allocated, 0);
  const totalSpent = categoryBudgets.reduce((sum, c) => sum + c.spent, 0);
  const overallPercentage = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const handleOpenEditBudget = (cat: Category, currentAllocated: number) => {
    setEditingBudgetCategory(cat);
    setAllocationInput(String(currentAllocated));
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetCategory) return;

    const parsedAllocated = parseFloat(allocationInput) || 0;
    const existing = budgets.find(
      b => b.categoryId === editingBudgetCategory.id && b.month === selectedMonth
    );

    await updateBudget({
      id: existing?.id || `b_${Date.now()}`,
      month: selectedMonth,
      categoryId: editingBudgetCategory.id,
      allocatedAmount: parsedAllocated,
      spentAmount: existing?.spentAmount || 0,
    });

    setEditingBudgetCategory(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await addCategory({
      name: newCatName.trim(),
      type: newCatType,
      icon: 'Tag',
      color: '#059669',
      defaultMonthlyBudget: parseFloat(newCatDefault) || 0,
    });

    setIsAddCategoryOpen(false);
    setNewCatName('');
    setNewCatDefault('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Family Budget Envelopes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Zero-based monthly category allocations with active spend guardrails
          </p>
        </div>

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
            onClick={() => setIsAddCategoryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Aggregate Envelope Progress Overview */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Overall Monthly Budget Envelope ({selectedMonth})</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalSpent, currency)}
              <span className="text-sm font-normal text-slate-400 ml-2">
                of {formatCurrency(totalAllocated, currency)} allocated
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500">Net Envelope Buffer</span>
            <div
              className={`text-lg font-bold font-mono tabular-nums ${
                totalAllocated - totalSpent >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(totalAllocated - totalSpent, currency)}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overallPercentage > 100
                ? 'bg-rose-500'
                : overallPercentage > 85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{overallPercentage}% of total budget consumed</span>
          <span>{categoryBudgets.length} Category Envelopes</span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryBudgets.map(item => (
          <div
            key={item.category.id}
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
              item.isOver
                ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-800 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.category.color }} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.category.name}
                </h3>
              </div>

              <button
                onClick={() => handleOpenEditBudget(item.category, item.allocated)}
                title="Adjust category target"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Spent vs Allocated */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Spent</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(item.spent, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Target Envelope</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {formatCurrency(item.allocated, currency)}
                </span>
              </div>
            </div>

            {/* Category Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.isOver
                    ? 'bg-rose-500'
                    : item.percentage >= 85
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>

            {/* Footnote status */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-400">{item.percentage}% used</span>
              <span
                className={`font-mono font-medium ${
                  item.isOver ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.isOver
                  ? `Exceeded by ${formatCurrency(Math.abs(item.remaining), currency)}`
                  : `${formatCurrency(item.remaining, currency)} left`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Adjust Budget Target Modal */}
      {editingBudgetCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Adjust Envelope Target
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingBudgetCategory.name} for {selectedMonth}
                </p>
              </div>
              <button
                onClick={() => setEditingBudgetCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Allocation ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={allocationInput}
                  onChange={e => setAllocationInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBudgetCategory(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Family Category
              </h3>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Vacation, Zakat"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={newCatType}
                  onChange={e => setNewCatType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="expense">Expense Category</option>
                  <option value="income">Income Stream</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Monthly Target ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={newCatDefault}
                  onChange={e => setNewCatDefault(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
