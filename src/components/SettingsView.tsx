import React, { useState, useRef } from "react";
import {
  Settings,
  Moon,
  Sun,
  Type,
  TrendingUp,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle,
  Info,
  Laptop,
  Smartphone,
  Share
} from "lucide-react";
import { AppSettings } from "../types";
import { exportUserData, importUserData, clearAllProgress } from "../utils";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClearHistoryOnly: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstallPWA: () => void;
}

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClearHistoryOnly,
  isInstallable,
  isInstalled,
  onInstallPWA,
}: SettingsViewProps) {
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleToggleDarkMode = () => {
    onUpdateSettings({ ...settings, isDarkMode: !settings.isDarkMode });
  };

  const handleChangeTheme = (themeName: AppSettings["theme"]) => {
    onUpdateSettings({ ...settings, theme: themeName });
  };

  const handleChangeFont = (fontName: AppSettings["questionFont"]) => {
    onUpdateSettings({ ...settings, questionFont: fontName });
  };

  const handleChangeFontSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) });
  };

  const handleChangeTarget = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, dailyTarget: parseInt(e.target.value) });
  };

  const handleExport = () => {
    const dataStr = exportUserData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-portal-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = importUserData(text);
      if (success) {
        setImportStatus({ type: "success", message: "Data imported successfully! Reloading..." });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setImportStatus({ type: "error", message: "Failed to parse backup JSON file. Ensure file is valid." });
      }
    };
    reader.readAsText(file);
  };

  const handleFullReset = () => {
    clearAllProgress();
    setShowResetConfirm(false);
    window.location.reload();
  };

  const handleClearHistory = () => {
    onClearHistoryOnly();
    setShowClearHistoryConfirm(false);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto" id="settings-container">
      {/* Top Heading */}
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="text-indigo-600 animate-spin-slow" size={24} />
          <span>Portal Customization</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Customize UI aesthetics, font scales, and local backup files for your study hub.
        </p>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Dark Mode toggle row */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/40 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Aesthetic Tone</h3>
            <p className="text-xs text-slate-400">Toggle between high-contrast Dark and Soft Light view systems</p>
          </div>
          <button
            onClick={handleToggleDarkMode}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer select-none"
          >
            {settings.isDarkMode ? (
              <>
                <Sun size={14} className="text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Color presets selection */}
        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/40">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Color Presets</h3>
            <p className="text-xs text-slate-400">Apply a professional visual skin to dashboard headers and primary buttons</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "slate", name: "Slate Dark", colorBg: "bg-slate-700" },
              { id: "amber", name: "Warm Amber", colorBg: "bg-amber-500" },
              { id: "emerald", name: "Emerald Mint", colorBg: "bg-emerald-500" },
              { id: "ocean", name: "Ocean Blue", colorBg: "bg-sky-500" },
              { id: "rose", name: "Classic Rose", colorBg: "bg-rose-500" },
            ].map((theme) => {
              const isActive = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleChangeTheme(theme.id as AppSettings["theme"])}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                      : "border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/10 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.colorBg}`}></span>
                  <span>{theme.name}</span>
                  {isActive && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Typography family presets */}
        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/40">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Question Text Font</h3>
            <p className="text-xs text-slate-400">Choose a font style that promotes high readability during intensive tests</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "sans", name: "Modern Sans (Inter)", fontClass: "font-sans" },
              { id: "serif", name: "Editorial Serif (Playfair)", fontClass: "font-serif" },
              { id: "mono", name: "Technical Mono (JetBrains)", fontClass: "font-mono" },
            ].map((font) => {
              const isActive = settings.questionFont === font.id;
              return (
                <button
                  key={font.id}
                  onClick={() => handleChangeFont(font.id as AppSettings["questionFont"])}
                  className={`flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-bold transition cursor-pointer ${font.fontClass} ${
                    isActive
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                      : "border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/10 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Type size={14} />
                  <span>{font.name}</span>
                  {isActive && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size Selector Slider */}
        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Global Text Scale</h3>
              <p className="text-xs text-slate-400">Adjust the font size of the questions and answers inside tests</p>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
              {settings.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={settings.fontSize}
            onChange={handleChangeFontSize}
            className="w-full accent-indigo-600 cursor-ew-resize bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg"
          />
        </div>

        {/* Daily Progress Goal target */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Daily Target Goals</h3>
              <p className="text-xs text-slate-400">Establish a baseline question quota to fulfill every 24 hours</p>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded flex items-center gap-1">
              <TrendingUp size={12} />
              <span>{settings.dailyTarget} Questions</span>
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={settings.dailyTarget}
            onChange={handleChangeTarget}
            className="w-full accent-indigo-600 cursor-ew-resize bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg"
          />
        </div>
      </div>

      {/* PWA App Installation & Offline Support Card */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Mobile & Desktop App</h3>
            <p className="text-xs text-slate-400">Install the portal on your home screen or desktop dock for direct launcher access and full offline exam practice.</p>
          </div>
          {isInstalled ? (
            <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-full">
              <Check size={11} />
              <span>Installed / Active</span>
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-full">
              <Info size={11} />
              <span>Web Portal</span>
            </span>
          )}
        </div>

        {/* Action / Instructions */}
        {isInstalled ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex items-start gap-3">
            <Check className="text-emerald-500 shrink-0 mt-0.5" size={16} />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Running Standalone App Mode</p>
              <p className="text-[11px] text-slate-400">You are successfully running the native app version! Subject questions, assets, and bookmarks will automatically cache so you can study completely offline without an active internet connection.</p>
            </div>
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 rounded-2xl flex items-start gap-3">
              <Smartphone className="text-indigo-500 shrink-0 mt-0.5 animate-bounce" size={16} />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Direct Installation Available</p>
                <p className="text-[11px] text-slate-400">Your device supports native app installation. Clicking the button below will register the portal directly into your system app drawer or desktop launcher.</p>
              </div>
            </div>
            <button
              onClick={onInstallPWA}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer transition duration-150"
            >
              <Laptop size={14} />
              <span>Install Modular Exam App</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Manual Installation Instructions:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* iOS Safari */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Smartphone size={14} className="text-slate-500" />
                  <span>iOS (Apple Safari)</span>
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal pl-4 leading-relaxed">
                  <li>Tap the <strong className="text-slate-500 inline-flex items-center gap-0.5 font-bold"><Share size={12} /> Share</strong> button in Safari</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> at the top right to complete installation</li>
                </ol>
              </div>

              {/* Android or Custom Desktop browsers */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Laptop size={14} className="text-slate-500" />
                  <span>Android & Other Browsers</span>
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal pl-4 leading-relaxed">
                  <li>Click the <strong>three-dots icon</strong> (settings menu) in Chrome/Edge</li>
                  <li>Select <strong>Install app...</strong> or <strong>Add to Home screen</strong></li>
                  <li>Confirm installation to add directly to your app launcher</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Backup Suite (Import/Export) */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Backup & Sync Data</h3>
        <p className="text-xs text-slate-400">Save your bookmarks, preferences, and comprehensive attempt logs locally as a portable JSON backup file.</p>
        
        {importStatus && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            importStatus.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20" 
              : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20"
          }`}>
            <Info size={14} />
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer transition duration-150"
          >
            <Download size={14} />
            <span>Export Portal Data (.json)</span>
          </button>

          {/* Import button */}
          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer transition duration-150"
          >
            <Upload size={14} />
            <span>Import Portal Data (.json)</span>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Dangerous Operations (Resets) */}
      <div className="bg-rose-50/30 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-950/50 rounded-3xl p-6 space-y-4">
        <div className="space-y-0.5">
          <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400">Dangerous Operations</h3>
          <p className="text-xs text-slate-400">Deleting data is permanent. Please proceed with caution.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Clear history but keep bookmarks */}
          <button
            onClick={() => setShowClearHistoryConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-150 dark:border-rose-950/50 hover:bg-rose-50/50 cursor-pointer transition duration-150"
          >
            <RotateCcw size={14} />
            <span>Wipe Exam Attempt Logs</span>
          </button>

          {/* Clear EVERYTHING */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer transition duration-150 shadow-sm"
          >
            <Trash2 size={14} />
            <span>Reset All Progress (Full Wipe)</span>
          </button>
        </div>
      </div>

      {/* Clear History Confirm Modal */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Wipe Attempt Logs?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to clear your full history of exam attempts? Your custom settings and bookmarked questions will be safely kept.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowClearHistoryConfirm(false)}
                className="py-3 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer border border-slate-100 dark:border-slate-800"
              >
                Keep Logs
              </button>
              <button
                onClick={handleClearHistory}
                className="py-3 px-4 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 cursor-pointer shadow-md"
              >
                Wipe Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Full Wipe & Reset?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-rose-600 font-semibold">
                WARNING: This will permanently wipe all exam attempts, bookmarks, settings, and progress. This operation is completely irreversible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-3 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer border border-slate-100 dark:border-slate-800"
              >
                Keep My Progress
              </button>
              <button
                onClick={handleFullReset}
                className="py-3 px-4 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 cursor-pointer shadow-md"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
