/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GITHUB_DEPLOY_YML,
  CLASP_IGNORE_CONTENT,
  APPSSCRIPT_JSON_CONTENT,
  CLASP_JSON_EXAMPLE,
  downloadProjectAsZip,
} from '../services/appsScriptProject';
import { useFinance } from '../context/FinanceContext';
import {
  X,
  GitBranch,
  Copy,
  Check,
  Download,
  Key,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Terminal,
  RefreshCw,
  GitFork,
  FileCode,
  Zap,
} from 'lucide-react';

interface GitHubCicdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubCicdModal: React.FC<GitHubCicdModalProps> = ({ isOpen, onClose }) => {
  const { sheetMetadata } = useFinance();
  const [selectedTab, setSelectedTab] = useState<'workflow' | 'clasp' | 'manifest' | 'readme'>('workflow');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const getActiveCode = () => {
    switch (selectedTab) {
      case 'workflow':
        return GITHUB_DEPLOY_YML;
      case 'clasp':
        return CLASP_IGNORE_CONTENT;
      case 'manifest':
        return APPSSCRIPT_JSON_CONTENT;
      case 'readme':
        return CLASP_JSON_EXAMPLE;
      default:
        return GITHUB_DEPLOY_YML;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectAsZip();
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <GitBranch className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  GitHub CI/CD &amp; Google Apps Script Pipeline
                </h2>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Fork &amp; Push Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically push, version, and deploy code changes to Apps Script on every <code className="font-mono text-slate-700 dark:text-slate-300">git push origin main</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Zipping...' : 'Download GitHub Repo (.zip)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pipeline Architecture Diagram Strip */}
        <div className="p-4 bg-slate-950 text-white border-b border-slate-800 text-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[650px] gap-2">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-mono font-bold text-emerald-400">git push main</span>
                <p className="text-[10px] text-slate-400">Commit to GitHub repo</p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-mono font-bold text-amber-400">GitHub Actions</span>
                <p className="text-[10px] text-slate-400">Runs @google/clasp</p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-mono font-bold text-blue-400">clasp push &amp; deploy</span>
                <p className="text-[10px] text-slate-400">Creates version &amp; publishes</p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-mono font-bold text-emerald-400">Live Google Sheet</span>
                <p className="text-[10px] text-slate-400">Instantly updated for free</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Secret Setup Instructions */}
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300 mb-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Setup Secrets on GitHub (Required only once):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/50 dark:border-emerald-800/50 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">1. SCRIPT_ID</span>
                <span className="text-[10px] text-slate-400">Secret</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-snug">
                Open your Google Sheet → <b>Extensions &gt; Apps Script</b> → click Project Settings gear → copy <b>Script ID</b>.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/50 dark:border-emerald-800/50 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">2. CLASPRC_JSON</span>
                <span className="text-[10px] text-slate-400">Secret</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-snug">
                Run <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">npx @google/clasp login</code> locally. Copy the generated token in <code className="font-mono">~/.clasprc.json</code>.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/50 dark:border-emerald-800/50 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">3. Enable API</span>
                <span className="text-[10px] text-slate-400">Setting</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-snug">
                Visit <a href="https://script.google.com/home/usersettings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">script.google.com/home/usersettings <ExternalLink className="w-2.5 h-2.5" /></a> and turn <b>Apps Script API</b> to <b>ON</b>.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('workflow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedTab === 'workflow'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>.github/workflows/deploy.yml</span>
            </button>

            <button
              onClick={() => setSelectedTab('clasp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedTab === 'clasp'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-500" />
              <span>.claspignore</span>
            </button>

            <button
              onClick={() => setSelectedTab('manifest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedTab === 'manifest'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>appsscript.json</span>
            </button>

            <button
              onClick={() => setSelectedTab('readme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedTab === 'readme'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-purple-500" />
              <span>.clasp.json.example</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors shadow-2xs shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white dark:bg-emerald-600 hover:bg-slate-800'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>
        </div>

        {/* Code Viewport */}
        <div className="flex-1 p-4 bg-slate-950 overflow-auto text-xs font-mono text-slate-200 leading-relaxed selection:bg-emerald-800 select-all">
          <pre className="whitespace-pre">{getActiveCode()}</pre>
        </div>

        {/* Open-Source Forking Guide Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <b>For other users:</b> When someone forks this repository, they only need to set their own <code className="font-mono text-emerald-600">SCRIPT_ID</code> and <code className="font-mono text-emerald-600">CLASPRC_JSON</code> in secrets to get automatic sync!
            </span>
          </div>

          <button
            onClick={handleDownloadZip}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All CI/CD Files (.zip)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
