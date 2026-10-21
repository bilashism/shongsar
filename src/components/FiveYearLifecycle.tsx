/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getFiveYearCutoffDate, formatDate, formatCurrency } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Clock,
  Archive,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const FiveYearLifecycle: React.FC = () => {
  const {
    transactions,
    lifecycleSettings,
    updateLifecycleSettings,
    runFiveYearMaintenance,
    currency,
  } = useFinance();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<string | null>(null);

  const cutoffDate = getFiveYearCutoffDate();

  // Age distribution calculation
  const distribution = useMemo(() => {
    const now = new Date();
    const oneYrAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const threeYrsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().split('T')[0];

    let under1Yr = 0;
    let oneToThreeYrs = 0;
    let threeToFiveYrs = 0;
    let olderThan5Yrs = 0;

    for (const tx of transactions) {
      if (tx.date >= oneYrAgo) {
        under1Yr++;
      } else if (tx.date >= threeYrsAgo) {
        oneToThreeYrs++;
      } else if (tx.date >= cutoffDate) {
        threeToFiveYrs++;
      } else {
        olderThan5Yrs++;
      }
    }

    return {
      under1Yr,
      oneToThreeYrs,
      threeToFiveYrs,
      olderThan5Yrs,
      total: transactions.length,
    };
  }, [transactions, cutoffDate]);

  const handleToggleAutoRecycle = async () => {
    await updateLifecycleSettings({
      autoRecycle5Years: !lifecycleSettings.autoRecycle5Years,
    });
  };

  const handleToggleArchiveSheet = async () => {
    await updateLifecycleSettings({
      archiveToDedicatedSheet: !lifecycleSettings.archiveToDedicatedSheet,
    });
  };

  const handleExecuteMaintenance = async () => {
    setIsRunning(true);
    try {
      const count = await runFiveYearMaintenance();
      setLastActionResult(
        count > 0
          ? `Successfully processed and recycled ${count} transactions older than 5 years.`
          : 'No transactions older than 5 years found. Your active ledger is within the 5-year window.'
      );
    } catch (err: any) {
      setLastActionResult(`Error during lifecycle run: ${err.message}`);
    } finally {
      setIsRunning(false);
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          5-Year Historical Retention & Lifecycle Manager
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Automatic 5-year rolling ledger retention with sheet-native archiving
        </p>
      </div>

      {/* Primary Status Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
              <span>Rolling 5-Year Threshold Window</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              Active Retention Cutoff: {formatDate(cutoffDate)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial transactions dated before {formatDate(cutoffDate)} are candidates for recycling or archival.
            </p>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={isRunning || distribution.olderThan5Yrs === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Run 5-Year Cleanup ({distribution.olderThan5Yrs})</span>
          </button>
        </div>

        {lastActionResult && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{lastActionResult}</span>
          </div>
        )}
      </div>

      {/* Age Distribution Breakdown */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Active Ledger Age Distribution
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Under 1 Year</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {distribution.under1Yr}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Fresh activity</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">1 – 3 Years</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {distribution.oneToThreeYrs}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Standard archive</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">3 – 5 Years</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {distribution.threeToFiveYrs}
            </div>
            <span className="text-[10px] text-amber-600 font-medium">Approaching window</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Older than 5 Years</span>
            <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              {distribution.olderThan5Yrs}
            </div>
            <span className="text-[10px] text-rose-500 font-medium">Ready for recycle</span>
          </div>
        </div>
      </div>

      {/* Policy Settings Toggles */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Retention & Recycling Policy
        </h3>

        <div className="space-y-4">
          
          {/* Toggle 1: Auto-Recycle */}
          <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white block cursor-pointer">
                Recycle Records After 5 Years
              </label>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                When enabled, financial transactions exceeding 5 years of age are automatically purged from the active ledger, maintaining spreadsheet speed and agility.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoRecycle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                lifecycleSettings.autoRecycle5Years ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  lifecycleSettings.autoRecycle5Years ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Move to Archive Sheet vs Permanent Delete */}
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white block cursor-pointer">
                Preserve Recycled Records in Dedicated 'Archive_5Yr' Sheet
              </label>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Recommended for tax and lifetime family audit. Instead of permanent deletion, aged rows are transferred to the <span className="font-mono text-emerald-600">Archive_5Yr</span> tab in your Google Sheet.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleArchiveSheet}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                lifecycleSettings.archiveToDedicatedSheet ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  lifecycleSettings.archiveToDedicatedSheet ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>

        {/* Audit Stats */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Historical Records Recycled: {lifecycleSettings.archivedCount} rows</span>
          {lifecycleSettings.lastArchivedAt && (
            <span>Last Run: {formatDate(lifecycleSettings.lastArchivedAt.split('T')[0])}</span>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Execute 5-Year Data Recycling?"
        message={`This action will identify ${distribution.olderThan5Yrs} transaction(s) dated before ${formatDate(cutoffDate)}. ${
          lifecycleSettings.archiveToDedicatedSheet
            ? 'They will be safely moved to your Archive_5Yr sheet.'
            : 'They will be permanently deleted from your Google Sheet.'
        } Proceed?`}
        confirmLabel="Proceed with Recycling"
        isDestructive={!lifecycleSettings.archiveToDedicatedSheet}
        onConfirm={handleExecuteMaintenance}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

    </div>
  );
};
