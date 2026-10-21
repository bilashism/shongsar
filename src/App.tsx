/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { AccountsManager } from './components/AccountsManager';
import { TransactionsLedger } from './components/TransactionsLedger';
import { BudgetsManager } from './components/BudgetsManager';
import { DebtsInvestments } from './components/DebtsInvestments';
import { FiveYearLifecycle } from './components/FiveYearLifecycle';
import { NewTransactionModal } from './components/NewTransactionModal';
import { TransferModal } from './components/TransferModal';
import { AppsScriptModal } from './components/AppsScriptModal';
import { GitHubCicdModal } from './components/GitHubCicdModal';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  TrendingUp,
  Clock,
  Plus,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useFinance();

  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<string | undefined>();
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [isGitHubCicdModalOpen, setIsGitHubCicdModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleOpenTransfer = (sourceId?: string) => {
    setTransferSourceAccountId(sourceId);
    setIsTransferModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Bar Navigation */}
      <Navbar
        onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
        onOpenGitHubCicd={() => setIsGitHubCicdModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
        {activeTab === 'overview' && (
          <OverviewDashboard
            onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
            onOpenTransfer={() => handleOpenTransfer()}
            onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
            onOpenGitHubCicd={() => setIsGitHubCicdModalOpen(true)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsManager onOpenTransfer={handleOpenTransfer} />
        )}

        {activeTab === 'transactions' && (
          <TransactionsLedger onOpenNewTransaction={() => setIsNewTxModalOpen(true)} />
        )}

        {activeTab === 'budgets' && (
          <BudgetsManager />
        )}

        {activeTab === 'debts_investments' && (
          <DebtsInvestments />
        )}

        {activeTab === 'lifecycle' && (
          <FiveYearLifecycle />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
            activeTab === 'overview' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
            activeTab === 'accounts' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Funds</span>
        </button>

        <button
          onClick={() => setIsNewTxModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-4 w-10 h-10 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
            activeTab === 'transactions' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium transition-colors ${
            activeTab === 'budgets' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Envelopes</span>
        </button>
      </nav>

      {/* Global Modals */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultSourceAccountId={transferSourceAccountId}
      />

      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
      />

      <GitHubCicdModal
        isOpen={isGitHubCicdModalOpen}
        onClose={() => setIsGitHubCicdModalOpen(false)}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400">
        <p>Shongsar (সংসার) — Family Wealth &amp; Budget Engine · Connected to Google Sheets Database</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
