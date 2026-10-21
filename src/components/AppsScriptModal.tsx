/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  APPS_SCRIPT_PROJECT_FILES,
  AppsScriptFile,
  downloadProjectAsZip,
  downloadSingleFile,
} from '../services/appsScriptProject';
import { useFinance } from '../context/FinanceContext';
import {
  X,
  Copy,
  Check,
  Download,
  Folder,
  FileCode,
  Globe,
  Archive,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({ isOpen, onClose }) => {
  const { sheetMetadata } = useFinance();
  const [selectedFilePath, setSelectedFilePath] = useState<string>('backend/WebApp.gs');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const activeFile = APPS_SCRIPT_PROJECT_FILES.find(f => f.path === selectedFilePath) || APPS_SCRIPT_PROJECT_FILES[0];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
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

  const backendFiles = APPS_SCRIPT_PROJECT_FILES.filter(f => f.folder === 'backend');
  const frontendFiles = APPS_SCRIPT_PROJECT_FILES.filter(f => f.folder === 'frontend');
  const cicdFiles = APPS_SCRIPT_PROJECT_FILES.filter(f => f.folder === 'ci_cd' || f.folder === 'config');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Google Apps Script Project Files (Backend &amp; Frontend)
                </h2>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  100% Free Hosting
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organized into modular <span className="font-mono text-emerald-600">backend/</span> and <span className="font-mono text-blue-600">frontend/</span> folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Zipping...' : 'Download Project ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Folder Guide */}
        <div className="px-5 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <b>Tip for Apps Script:</b> When creating a file in Apps Script, name it <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-emerald-200">backend/Database</code> and Apps Script will automatically place it into the <code className="font-mono">backend</code> folder!
            </span>
          </div>

          {sheetMetadata && (
            <a
              href={sheetMetadata.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
            >
              <span>Open Spreadsheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Main Body: 2-Column Split (File Tree on Left, Code Viewer on Right) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: File Tree */}
          <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 overflow-y-auto space-y-4 shrink-0">
            
            {/* Backend Folder */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>backend / (Server Scripts)</span>
              </div>
              <div className="space-y-0.5 pl-2">
                {backendFiles.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                      selectedFilePath === file.path
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    {selectedFilePath === file.path && <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Frontend Folder */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <Folder className="w-3.5 h-3.5 text-blue-500" />
                <span>frontend / (Web App UI)</span>
              </div>
              <div className="space-y-0.5 pl-2">
                {frontendFiles.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                      selectedFilePath === file.path
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    {selectedFilePath === file.path && <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* CI/CD & Config Folder */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <Folder className="w-3.5 h-3.5 text-purple-500" />
                <span>CI/CD &amp; Config</span>
              </div>
              <div className="space-y-0.5 pl-2">
                {cicdFiles.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                      selectedFilePath === file.path
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    {selectedFilePath === file.path && <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Download Full Zip Button */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Preparing ZIP...' : 'Download All (.zip)'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Code Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            
            {/* Code Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-400 font-bold">{activeFile.path}</span>
                <span className="text-slate-500 hidden sm:inline">·</span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">{activeFile.description}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSingleFile(activeFile)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download {activeFile.filename}</span>
                </button>

                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Code Content Box */}
            <div className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed selection:bg-emerald-800 select-all">
              <pre className="whitespace-pre">{activeFile.content}</pre>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Free Hosting on Google Cloud &amp; Google Workspace infrastructure.</span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-emerald-600">
            <button onClick={handleDownloadZip} className="hover:underline flex items-center gap-1">
              <Archive className="w-3 h-3" />
              <span>Download shongsar_apps_script_project.zip</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
