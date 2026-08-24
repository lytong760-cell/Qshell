import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  Settings2,
  Play,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  Activity,
  Code2,
} from 'lucide-react';
import { ExecutionMode, TerminalPreferences, TerminalTab, TerminalThemeId } from '../../types';
import { DEFAULT_TERMINAL_PREFS, TERMINAL_THEMES } from '../../data/terminalThemes';
import { XtermTerminalTab } from './XtermTerminalTab';

interface QshellTerminalProps {
  executionMode: ExecutionMode;
  onOpenEditorFile?: (path: string) => void;
  externalCommand?: { code: string; language: string; filePath: string; trigger: number } | null;
}

export const QshellTerminal: React.FC<QshellTerminalProps> = ({
  executionMode,
  onOpenEditorFile,
  externalCommand,
}) => {
  // Tabs State
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: 'root@qshell: ~',
      cwd: '/root/workspace',
      user: 'root',
      history: ['python3 main.py', 'compilers', 'neofetch', 'env'],
      historyIndex: -1,
      lines: [],
      created: Date.now(),
      active: true,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Split View State
  const [isSplit, setIsSplit] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Terminal Customization & Preferences
  const [preferences, setPreferences] = useState<TerminalPreferences>(() => {
    try {
      const saved = localStorage.getItem('qshell_terminal_prefs');
      if (saved) return { ...DEFAULT_TERMINAL_PREFS, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_TERMINAL_PREFS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Persist preferences
  const updatePreferences = (updates: Partial<TerminalPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('qshell_terminal_prefs', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Add new tab
  const handleNewTab = (customTitle?: string) => {
    const newId = `tab-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      title: customTitle || `bash (sh-${tabs.length + 1})`,
      cwd: '/root/workspace',
      user: 'root',
      history: [],
      historyIndex: -1,
      lines: [],
      created: Date.now(),
      active: true,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);

    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
    if (splitTabId === tabId) {
      setIsSplit(false);
      setSplitTabId(null);
    }
  };

  // Update tab properties
  const handleUpdateTab = (tabId: string, updates: Partial<TerminalTab>) => {
    setTabs(prev => prev.map(t => (t.id === tabId ? { ...t, ...updates } : t)));
  };

  // Split Pane Toggle
  const handleToggleSplit = () => {
    if (isSplit) {
      setIsSplit(false);
      setSplitTabId(null);
    } else {
      let secondary = tabs.find(t => t.id !== activeTabId);
      if (!secondary) {
        // Create new tab for split
        const newId = `tab-${Date.now()}`;
        const newTab: TerminalTab = {
          id: newId,
          title: `bash (split-2)`,
          cwd: '/root/workspace',
          user: 'root',
          history: [],
          historyIndex: -1,
          lines: [],
          created: Date.now(),
          active: true,
        };
        setTabs(prev => [...prev, newTab]);
        setSplitTabId(newId);
      } else {
        setSplitTabId(secondary.id);
      }
      setIsSplit(true);
    }
  };

  const primaryTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const secondaryTab = tabs.find(t => t.id === splitTabId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121214] text-zinc-100 font-mono select-none overflow-hidden relative">
      {/* Top Header Bar with Tabs & Controls */}
      <div className="h-9 bg-[#121214] border-b border-[#27272a] flex items-center justify-between px-2 shrink-0 z-20 text-xs">
        {/* Terminal Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none max-w-[65%]">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-t-md cursor-pointer transition-colors text-xs shrink-0 ${
                  isActive
                    ? 'bg-[#18181b] text-white border-t-2 border-[#007acc] font-medium'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[150px]">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={e => handleCloseTab(e, tab.id)}
                    className="p-0.5 hover:text-rose-400 rounded text-zinc-500 hover:bg-[#27272a]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => handleNewTab()}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#27272a] transition-colors"
            title="Open new terminal tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Action Tools: Split, Preferences, Status */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Quick Runtimes / Compilers tag */}
          <div className="hidden lg:flex items-center space-x-1 px-2 py-0.5 rounded bg-[#18181b] text-[10px] text-zinc-300 border border-[#27272a]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>30 Runtimes Ready</span>
          </div>

          {/* Split Pane Button */}
          <button
            onClick={handleToggleSplit}
            className={`p-1.5 rounded-md transition-colors ${
              isSplit
                ? 'bg-[#007acc] text-white'
                : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
            }`}
            title={isSplit ? 'Close split terminal' : 'Split terminal side-by-side'}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Preferences Settings Popover Button */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 rounded-md transition-colors ${
                isSettingsOpen
                  ? 'bg-[#27272a] text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
              }`}
              title="Terminal Customization & Themes"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>

            {/* Preferences Modal / Menu */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl p-4 space-y-3.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2 font-semibold text-white">
                  <div className="flex items-center space-x-2">
                    <Settings2 className="w-4 h-4 text-[#007acc]" />
                    <span>Terminal Preferences</span>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 hover:text-white text-zinc-400 rounded hover:bg-[#27272a]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="text-zinc-400 text-[11px] font-medium block mb-1.5">
                    Terminal Color Theme
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={e =>
                      updatePreferences({ theme: e.target.value as TerminalThemeId })
                    }
                    className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#007acc]"
                  >
                    {Object.values(TERMINAL_THEMES).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 text-[11px] font-medium block mb-1.5">
                      Font Size
                    </label>
                    <select
                      value={preferences.fontSize}
                      onChange={e =>
                        updatePreferences({ fontSize: Number(e.target.value) })
                      }
                      className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#007acc]"
                    >
                      {[11, 12, 13, 14, 15, 16, 18].map(s => (
                        <option key={s} value={s}>
                          {s}px
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[11px] font-medium block mb-1.5">
                      Cursor Style
                    </label>
                    <select
                      value={preferences.cursorStyle}
                      onChange={e =>
                        updatePreferences({
                          cursorStyle: e.target.value as 'block' | 'underline' | 'bar',
                        })
                      }
                      className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#007acc]"
                    >
                      <option value="block">Block █</option>
                      <option value="underline">Underline  </option>
                      <option value="bar">Bar |</option>
                    </select>
                  </div>
                </div>

                {/* Cursor Blink */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-300 text-xs">Blinking Cursor</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.cursorBlink}
                      onChange={e =>
                        updatePreferences({ cursorBlink: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007acc]"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Viewport(s) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Primary Active Tab Terminal */}
        <div className={`flex-1 h-full ${isSplit ? 'w-1/2 border-r border-[#27272a]' : 'w-full'}`}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`w-full h-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}
            >
              <XtermTerminalTab
                tab={tab}
                isActive={tab.id === activeTabId}
                executionMode={executionMode}
                preferences={preferences}
                onUpdateTab={handleUpdateTab}
                onOpenEditorFile={onOpenEditorFile}
                onRunActiveFileTrigger={tab.id === activeTabId ? externalCommand : null}
              />
            </div>
          ))}
        </div>

        {/* Secondary Split Pane (if split is active) */}
        {isSplit && secondaryTab && (
          <div className="w-1/2 h-full">
            <XtermTerminalTab
              tab={secondaryTab}
              isActive={true}
              executionMode={executionMode}
              preferences={preferences}
              onUpdateTab={handleUpdateTab}
              onOpenEditorFile={onOpenEditorFile}
              onRunActiveFileTrigger={null}
            />
          </div>
        )}
      </div>

      {/* Terminal Bottom Status Bar */}
      <div className="h-6 bg-[#121214] border-t border-[#27272a] px-3 flex items-center justify-between text-[11px] text-zinc-400 font-sans shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-zinc-300">xterm.js VT100 Engine</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            Target: <strong className="text-zinc-200">{executionMode === 'browser' ? 'Browser VFS' : executionMode === 'cloud' ? 'Cloud Linux Sandbox' : 'Dual Engine (VFS + Cloud)'}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-zinc-500 font-mono">Theme: {TERMINAL_THEMES[preferences.theme]?.name}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 font-mono">{preferences.fontSize}px</span>
        </div>
      </div>
    </div>
  );
};
