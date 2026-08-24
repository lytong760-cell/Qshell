import React from 'react';
import {
  Terminal,
  Code2,
  Columns,
  Maximize2,
  HardDrive,
  Github,
  KeyRound,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Download,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { ExecutionMode, StorageDestinationType, WorkspaceLayout } from '../types';
import { cloudSyncService } from '../services/cloudSync';
import { vfsInstance } from '../services/vfs';

interface TopBarProps {
  layout: WorkspaceLayout;
  setLayout: (layout: WorkspaceLayout) => void;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  onOpenEnvModal: () => void;
  onOpenStorageModal: () => void;
  onOpenCompilersModal: () => void;
  onOpenCommandPalette: () => void;
  storageDestination: StorageDestinationType;
  lastSyncedTime?: string;
  isSyncing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  layout,
  setLayout,
  executionMode,
  setExecutionMode,
  onOpenEnvModal,
  onOpenStorageModal,
  onOpenCompilersModal,
  onOpenCommandPalette,
  storageDestination,
  lastSyncedTime,
  isSyncing,
}) => {
  const ghConfig = cloudSyncService.getGitHubConfig();
  const fbConfig = cloudSyncService.getFirebaseConfig();

  const handleExportZip = async () => {
    try {
      const blob = await vfsInstance.exportAsZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qshell-workspace-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export zip:', e);
    }
  };

  return (
    <header className="h-12 bg-[#121214] border-b border-[#27272a] flex items-center justify-between px-3 text-sm select-none z-30 shrink-0 text-zinc-200">
      {/* Brand & Dual Engine Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-[#007acc] flex items-center justify-center shadow-sm">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="font-bold tracking-tight text-white text-base">Qshell</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-medium border border-blue-500/20">
                v3.4
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Dual Root Terminal & IDE
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#27272a] hidden md:block"></div>

        {/* 30 Pre-configured Compilers Button */}
        <button
          id="topbar-compilers-btn"
          onClick={onOpenCompilersModal}
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs text-zinc-300 transition-colors"
          title="Inspect 30 Pre-configured Compilers & Runtimes"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium">30 Compilers</span>
          <span className="px-1 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-mono">
            Active
          </span>
        </button>
      </div>

      {/* Center: Dual Execution Mode Switcher */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-[#000000] p-0.5 rounded-lg border border-[#27272a] text-xs">
          <button
            id="exec-mode-browser"
            onClick={() => setExecutionMode('browser')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              executionMode === 'browser'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Execute strictly inside in-browser virtual environment"
          >
            <Cpu className="w-3 h-3" />
            <span className="hidden sm:inline">Browser VFS</span>
          </button>
          <button
            id="exec-mode-dual"
            onClick={() => setExecutionMode('dual')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              executionMode === 'dual'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Dual Execution: Browser fast-path + Synchronized Cloud Backend"
          >
            <Layers className="w-3 h-3 text-amber-300" />
            <span>Dual Sync</span>
          </button>
          <button
            id="exec-mode-cloud"
            onClick={() => setExecutionMode('cloud')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              executionMode === 'cloud'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Execute directly on Cloud Container host"
          >
            <HardDrive className="w-3 h-3" />
            <span className="hidden sm:inline">Cloud Host</span>
          </button>
        </div>

        {/* Command Palette Trigger */}
        <button
          id="cmd-palette-btn"
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-zinc-400 hover:text-zinc-200 hover:border-[#3f3f46] transition-colors"
        >
          <span>Search files / commands</span>
          <kbd className="px-1.5 py-0.5 bg-[#09090b] text-[10px] rounded text-zinc-400 font-mono border border-[#27272a]">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Right Controls: Storage Sync, Layout, Env, Settings */}
      <div className="flex items-center space-x-2">
        {/* Storage Destination Indicator */}
        <button
          id="topbar-storage-sync-btn"
          onClick={onOpenStorageModal}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
            storageDestination === 'github'
              ? 'bg-[#18181b] border-[#27272a] text-zinc-200 hover:bg-[#27272a]'
              : 'bg-[#18181b] border-amber-900/40 text-amber-300 hover:bg-[#27272a]'
          }`}
          title={`Sync destination: ${storageDestination === 'github' ? 'GitHub Repo' : 'Firebase'}. Click to configure.`}
        >
          {storageDestination === 'github' ? (
            <Github className="w-3.5 h-3.5 text-white" />
          ) : (
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-mono text-[11px] max-w-[100px] truncate hidden sm:inline">
            {storageDestination === 'github' ? (ghConfig.repo || 'GitHub') : 'Firebase'}
          </span>
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          )}
        </button>

        {/* Environment Variables Button */}
        <button
          id="topbar-env-btn"
          onClick={onOpenEnvModal}
          className="p-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 transition-colors"
          title="Hidden & Custom Environment Variables"
        >
          <KeyRound className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Export Zip */}
        <button
          id="topbar-export-btn"
          onClick={handleExportZip}
          className="p-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 transition-colors hidden sm:block"
          title="Export Workspace as ZIP"
        >
          <Download className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#27272a]"></div>

        {/* Layout View Toggles */}
        <div className="flex items-center bg-[#000000] p-0.5 rounded-lg border border-[#27272a]">
          <button
            id="layout-editor-only"
            onClick={() => setLayout('editor-only')}
            className={`p-1.5 rounded-md transition-colors ${
              layout === 'editor-only' ? 'bg-[#007acc] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Qshell Editor Fullscreen"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            id="layout-split"
            onClick={() => setLayout('split')}
            className={`p-1.5 rounded-md transition-colors ${
              layout === 'split' ? 'bg-[#007acc] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Split View (Editor + Terminal Side-by-Side)"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            id="layout-terminal-only"
            onClick={() => setLayout('terminal-only')}
            className={`p-1.5 rounded-md transition-colors ${
              layout === 'terminal-only' ? 'bg-[#007acc] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Qshell Terminal Fullscreen"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
