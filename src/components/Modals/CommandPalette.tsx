import React, { useState, useEffect } from 'react';
import { Search, FileCode, Terminal, Sparkles, KeyRound, HardDrive, Columns, Code2 } from 'lucide-react';
import { vfsInstance } from '../../services/vfs';
import { PREINSTALLED_COMPILERS } from '../../data/compilers';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string) => void;
  onRunTerminalCommand: (command: string) => void;
  onOpenEnvModal: () => void;
  onOpenStorageModal: () => void;
  onOpenCompilersModal: () => void;
  onSetLayout: (layout: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  onRunTerminalCommand,
  onOpenEnvModal,
  onOpenStorageModal,
  onOpenCompilersModal,
  onSetLayout,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault();
        // Toggle or open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const files = vfsInstance.getAllFilesFlat();

  const fileMatches = files.filter(f =>
    f.path.toLowerCase().includes(query.toLowerCase()) || f.name.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    {
      id: 'cmd-compilers',
      name: 'Explore 30 Pre-configured Compilers',
      category: 'Runtimes',
      icon: Sparkles,
      action: () => { onOpenCompilersModal(); onClose(); },
    },
    {
      id: 'cmd-env',
      name: 'Manage Hidden & Custom Environment Variables',
      category: 'Environment',
      icon: KeyRound,
      action: () => { onOpenEnvModal(); onClose(); },
    },
    {
      id: 'cmd-sync',
      name: 'Configure Storage Destination (Firebase / GitHub Sync)',
      category: 'Storage',
      icon: HardDrive,
      action: () => { onOpenStorageModal(); onClose(); },
    },
    {
      id: 'cmd-layout-split',
      name: 'View: Split Editor & Terminal View',
      category: 'Layout',
      icon: Columns,
      action: () => { onSetLayout('split'); onClose(); },
    },
    {
      id: 'cmd-layout-editor',
      name: 'View: Qshell Editor Only (Fullscreen)',
      category: 'Layout',
      icon: Code2,
      action: () => { onSetLayout('editor-only'); onClose(); },
    },
    {
      id: 'cmd-layout-term',
      name: 'View: Qshell Root Terminal Only (Fullscreen)',
      category: 'Layout',
      icon: Terminal,
      action: () => { onSetLayout('terminal-only'); onClose(); },
    },
  ].filter(a => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4 select-none">
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg w-full max-w-xl shadow-2xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="h-12 px-4 bg-[#121214] border-b border-[#27272a] flex items-center space-x-3">
          <Search className="w-4 h-4 text-[#007acc] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or filename (e.g. main.py, compilers, git)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-sans"
          />
          <kbd className="px-1.5 py-0.5 bg-[#27272a] text-[10px] rounded text-zinc-400 font-mono border border-[#3f3f46]">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {actions.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Quick Actions
            </div>
          )}
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                onClick={a.action}
                className="flex items-center space-x-2.5 p-2 rounded-md hover:bg-[#27272a] hover:text-white cursor-pointer group transition-colors"
              >
                <Icon className="w-4 h-4 text-[#007acc] shrink-0" />
                <span className="flex-1 font-medium">{a.name}</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono">
                  {a.category}
                </span>
              </div>
            );
          })}

          {fileMatches.length > 0 && (
            <div className="px-2 pt-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-t border-[#27272a]">
              Workspace Files ({fileMatches.length})
            </div>
          )}
          {fileMatches.map(f => (
            <div
              key={f.path}
              onClick={() => {
                onSelectFile(f.path);
                onClose();
              }}
              className="flex items-center space-x-2.5 p-2 rounded-md hover:bg-[#27272a] hover:text-white cursor-pointer group transition-colors font-mono"
            >
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="flex-1 text-zinc-200">{f.name}</span>
              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">
                {f.path}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
