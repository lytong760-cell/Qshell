import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { QshellEditor } from './components/Editor/QshellEditor';
import { QshellTerminal } from './components/Terminal/QshellTerminal';
import { EnvVarsModal } from './components/Modals/EnvVarsModal';
import { StorageSyncModal } from './components/Modals/StorageSyncModal';
import { RuntimeManagerModal } from './components/Modals/RuntimeManagerModal';
import { CommandPalette } from './components/Modals/CommandPalette';
import { ExecutionMode, StorageDestinationType, WorkspaceLayout } from './types';
import { cloudSyncService } from './services/cloudSync';

export default function App() {
  const [layout, setLayout] = useState<WorkspaceLayout>('split');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('dual');
  const [storageDestination, setStorageDestination] = useState<StorageDestinationType>(() =>
    cloudSyncService.getDestination()
  );

  // Modals state
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isCompilersModalOpen, setIsCompilersModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Cross-component communication
  const [editorActiveFilePath, setEditorActiveFilePath] = useState<string>('');
  const [terminalExternalCommand, setTerminalExternalCommand] = useState<{
    code: string;
    language: string;
    filePath: string;
    trigger: number;
  } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | undefined>(
    cloudSyncService.getGitHubConfig().lastSyncedAt
  );

  // Listen to sync updates
  useEffect(() => {
    const unsub = cloudSyncService.subscribe((type, data) => {
      if (type === 'destination_changed') {
        setStorageDestination(data);
      } else if (type === 'github_config_updated') {
        setLastSyncedTime(data.lastSyncedAt);
        setIsSyncing(data.status === 'syncing');
      } else if (type === 'firebase_config_updated') {
        setLastSyncedTime(data.lastSyncedAt);
        setIsSyncing(data.status === 'syncing');
      }
    });
    return unsub;
  }, []);

  // Global Keyboard Shortcuts (Ctrl+P / Ctrl+K for Palette, Ctrl+Shift+E for Editor, Ctrl+` for Terminal)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setLayout(prev => (prev === 'terminal-only' ? 'split' : 'terminal-only'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Handler: Run code from Editor in Terminal
  const handleRunCodeInTerminal = (code: string, language: string, filePath: string) => {
    if (layout === 'editor-only') {
      setLayout('split');
    }
    setTerminalExternalCommand({
      code,
      language,
      filePath,
      trigger: Date.now(),
    });
  };

  // Handler: Open file in editor (from Terminal or Palette)
  const handleOpenFileInEditor = (path: string) => {
    setEditorActiveFilePath(path);
    if (layout === 'terminal-only') {
      setLayout('split');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden select-none font-sans">
      {/* Top Bar Header */}
      <TopBar
        layout={layout}
        setLayout={setLayout}
        executionMode={executionMode}
        setExecutionMode={setExecutionMode}
        onOpenEnvModal={() => setIsEnvModalOpen(true)}
        onOpenStorageModal={() => setIsStorageModalOpen(true)}
        onOpenCompilersModal={() => setIsCompilersModalOpen(true)}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
        storageDestination={storageDestination}
        lastSyncedTime={lastSyncedTime}
        isSyncing={isSyncing}
      />

      {/* Main Workspace View */}
      <main className="flex-1 flex overflow-hidden relative divide-x divide-[#27272a]">
        {/* Editor Pane */}
        {(layout === 'split' || layout === 'editor-only') && (
          <div
            className={`h-full flex flex-col transition-all duration-150 ${
              layout === 'editor-only' ? 'w-full' : 'w-1/2'
            }`}
          >
            <QshellEditor
              onRunCodeInTerminal={handleRunCodeInTerminal}
              activeFilePath={editorActiveFilePath}
              onSelectFile={path => setEditorActiveFilePath(path)}
              executionMode={executionMode}
            />
          </div>
        )}

        {/* Terminal Pane */}
        {(layout === 'split' || layout === 'terminal-only') && (
          <div
            className={`h-full flex flex-col transition-all duration-150 ${
              layout === 'terminal-only' ? 'w-full' : 'w-1/2'
            }`}
          >
            <QshellTerminal
              executionMode={executionMode}
              onOpenEditorFile={handleOpenFileInEditor}
              externalCommand={terminalExternalCommand}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <EnvVarsModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
      />

      <StorageSyncModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        onSyncCompleted={() => {
          setLastSyncedTime(new Date().toLocaleTimeString());
        }}
      />

      <RuntimeManagerModal
        isOpen={isCompilersModalOpen}
        onClose={() => setIsCompilersModalOpen(false)}
        onSelectCompilerFile={handleOpenFileInEditor}
        onRunCompilerInTerminal={handleRunCodeInTerminal}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectFile={handleOpenFileInEditor}
        onRunTerminalCommand={cmd => {
          setTerminalExternalCommand({
            code: '',
            language: '',
            filePath: cmd,
            trigger: Date.now(),
          });
        }}
        onOpenEnvModal={() => setIsEnvModalOpen(true)}
        onOpenStorageModal={() => setIsStorageModalOpen(true)}
        onOpenCompilersModal={() => setIsCompilersModalOpen(true)}
        onSetLayout={setLayout}
      />
    </div>
  );
}
