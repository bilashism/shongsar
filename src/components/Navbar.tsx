/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../utils/formatters';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  Code2, 
  LogOut, 
  ChevronDown,
  GitBranch,
} from 'lucide-react';

interface NavbarProps {
  onOpenAppsScript: () => void;
  onOpenGitHubCicd?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAppsScript, onOpenGitHubCicd }) => {
  const {
    user,
    sheetMetadata,
    syncStatus,
    syncError,
    currency,
    setCurrency,
    activeTab,
    setActiveTab,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleManualSync,
  } = useFinance();

  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-emerald-700 transition-colors">
              শ
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Shongsar
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">
                সংসার · FAMILY WEALTH
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single line, 4-6 links) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'overview'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'accounts'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Linked Funds
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'budgets'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Budget Envelopes
          </button>
          <button
            onClick={() => setActiveTab('debts_investments')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'debts_investments'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Debts & Assets
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'lifecycle'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            5-Yr Retention
          </button>
        </nav>

        {/* Zone 3: Primary Action & Account Sync */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {SUPPORTED_CURRENCIES[currency]?.symbol || currency}
              </span>
              <span>{currency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Currency
                </div>
                {Object.values(SUPPORTED_CURRENCIES).map(curr => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      setCurrency(curr.code);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                      currency === curr.code
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{curr.name}</span>
                    <span className="font-mono text-slate-400">{curr.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Apps Script Launcher Button */}
          <button
            onClick={onOpenAppsScript}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            title="Inspect & Export 100% Free Google Apps Script Project"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Apps Script</span>
          </button>

          {/* GitHub CI/CD Launcher Button */}
          {onOpenGitHubCicd && (
            <button
              onClick={onOpenGitHubCicd}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              title="GitHub Actions CI/CD Pipeline & Clasp sync"
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">GitHub CI/CD</span>
              <span className="sm:hidden">CI/CD</span>
            </button>
          )}

          {/* Google Sheets Link & Sync State */}
          {user ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                {sheetMetadata && (
                  <a
                    href={sheetMetadata.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">shongsar</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={syncStatus === 'syncing'}
                  title="Sync with Google Sheets"
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-600' : ''}`} />
                </button>

                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
              </div>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || 'Family Account'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="px-4 py-2 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Database:</span>
                      <span className="font-semibold text-emerald-600">Google Sheet ('shongsar')</span>
                    </div>
                    {sheetMetadata?.lastSyncedAt && (
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span>Synced:</span>
                        <span className="font-mono">{new Date(sheetMetadata.lastSyncedAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleDisconnectGoogle();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Google Account</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.37 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.63 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>Connect Google</span>
            </button>
          )}

        </div>

      </div>

      {/* Sync Error Bar if any */}
      {syncError && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <span>{syncError}</span>
          <button
            onClick={handleManualSync}
            className="underline font-semibold hover:text-amber-950"
          >
            Retry Connection
          </button>
        </div>
      )}
    </header>
  );
};
