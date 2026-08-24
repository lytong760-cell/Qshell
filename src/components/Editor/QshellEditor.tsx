import React, { useState, useEffect, useRef } from 'react';
import {
  Files,
  Search,
  GitBranch,
  Boxes,
  Settings,
  Play,
  Cloud,
  Save,
  Plus,
  FolderPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  FileCode,
  FileText,
  File,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Code,
  Shield,
  Layers,
  Flame,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';

import { EditorTab, VFSNode, ExecutionMode } from '../../types';
import { vfsInstance } from '../../services/vfs';
import { PREINSTALLED_COMPILERS } from '../../data/compilers';
import { cloudSyncService } from '../../services/cloudSync';

interface QshellEditorProps {
  onRunCodeInTerminal: (code: string, language: string, filePath: string) => void;
  activeFilePath?: string;
  onSelectFile?: (path: string) => void;
  executionMode: ExecutionMode;
}

export const QshellEditor: React.FC<QshellEditorProps> = ({
  onRunCodeInTerminal,
  activeFilePath,
  onSelectFile,
  executionMode,
}) => {
  const [activeActivity, setActiveActivity] = useState<'explorer' | 'search' | 'git' | 'compilers' | 'settings'>('explorer');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // Explorer state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '/root': true,
    '/root/workspace': true,
  });
  const [newFileInputPath, setNewFileInputPath] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderInputPath, setNewFolderInputPath] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ path: string; line: number; text: string }[]>([]);

  // Git state
  const [commitMessage, setCommitMessage] = useState('');
  const [gitStatus, setGitStatus] = useState<string>('Clean working tree');
  const [isCommitting, setIsCommitting] = useState(false);

  // Editor cursor state
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to VFS modifications so Explorer and Tabs update in real time
  const [, setVfsTick] = useState(0);
  useEffect(() => {
    return vfsInstance.subscribe(() => {
      setVfsTick(tick => tick + 1);
    });
  }, []);

  // Initial Load: check if any files exist in /root/workspace
  useEffect(() => {
    const wsNode = vfsInstance.getNode('/root/workspace');
    const files = wsNode ? vfsInstance.getAllFilesFlat(wsNode) : [];
    if (files.length > 0) {
      const first = files[0];
      setOpenTabs([{
        id: first.path,
        path: first.path,
        name: first.name,
        content: first.content,
        originalContent: first.content,
        isDirty: false,
        language: vfsInstance.detectLanguage(first.name),
      }]);
      setActiveTabId(first.path);
    }
  }, []);

  // When activeFilePath changes from external props (e.g. terminal `code <file>` or `git clone`)
  useEffect(() => {
    if (activeFilePath) {
      openFileByPath(activeFilePath);
    }
  }, [activeFilePath]);

  const activeTab = openTabs.find(t => t.id === activeTabId);

  // Open a file in the editor & automatically expand parent directories
  const openFileByPath = (path: string) => {
    const node = vfsInstance.getFile(path);
    if (!node) return;

    // Expand all parent directories in Explorer
    const parts = path.split('/').filter(Boolean);
    let accum = '';
    const newExpanded: Record<string, boolean> = { ...expandedFolders };
    for (let i = 0; i < parts.length - 1; i++) {
      accum += '/' + parts[i];
      newExpanded[accum] = true;
    }
    setExpandedFolders(newExpanded);

    const existing = openTabs.find(t => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: EditorTab = {
        id: path,
        path,
        name: node.name,
        content: node.content || '',
        originalContent: node.content || '',
        isDirty: false,
        language: node.language || vfsInstance.detectLanguage(node.name),
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    if (onSelectFile) {
      onSelectFile(path);
    }
  };

  // Close tab
  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  // Handle content changes
  const handleContentChange = (val: string) => {
    if (!activeTab) return;
    const isDirty = val !== activeTab.originalContent;
    setOpenTabs(prev =>
      prev.map(t => (t.id === activeTab.id ? { ...t, content: val, isDirty } : t))
    );
  };

  // Save current file & trigger Auto-Commit hook if configured
  const handleSaveFile = () => {
    if (!activeTab) return;
    vfsInstance.writeFile(activeTab.path, activeTab.content, activeTab.language);
    setOpenTabs(prev =>
      prev.map(t =>
        t.id === activeTab.id
          ? { ...t, originalContent: activeTab.content, isDirty: false }
          : t
      )
    );
    cloudSyncService.handleFileChange(activeTab.path, 'modified');
  };

  // Run code handler
  const handleRunCode = () => {
    if (!activeTab) return;
    handleSaveFile();
    onRunCodeInTerminal(activeTab.content, activeTab.language, activeTab.path);
  };

  // Handle key shortcuts in editor (Ctrl+S, Tab, etc.)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveFile();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef.current || !activeTab) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const val = activeTab.content;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      handleContentChange(newVal);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Track cursor position
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const textBefore = target.value.substring(0, target.selectionStart);
    const lines = textBefore.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Create new file
  const handleCreateFile = (parentDir: string) => {
    if (!newFileName.trim()) {
      setNewFileInputPath(null);
      return;
    }
    const cleanPath = `${parentDir}/${newFileName.trim()}`.replace(/\/+/g, '/');
    vfsInstance.writeFile(cleanPath, '');
    cloudSyncService.handleFileChange(cleanPath, 'created');
    setNewFileName('');
    setNewFileInputPath(null);
    openFileByPath(cleanPath);
  };

  // Create new folder
  const handleCreateFolder = (parentDir: string) => {
    if (!newFolderName.trim()) {
      setNewFolderInputPath(null);
      return;
    }
    const cleanPath = `${parentDir}/${newFolderName.trim()}`.replace(/\/+/g, '/');
    vfsInstance.createDirectory(cleanPath);
    setNewFolderName('');
    setNewFolderInputPath(null);
    setExpandedFolders(prev => ({ ...prev, [parentDir]: true, [cleanPath]: true }));
  };

  // Delete file or folder
  const handleDeleteNode = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete '${path}'?`)) {
      vfsInstance.remove(path, true);
      cloudSyncService.handleFileChange(path, 'deleted');
      setOpenTabs(prev => prev.filter(t => !t.path.startsWith(path)));
    }
  };

  // Search in files
  const performSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const files = vfsInstance.getAllFilesFlat();
    const results: { path: string; line: number; text: string }[] = [];
    files.forEach(f => {
      const lines = f.content.split('\n');
      lines.forEach((l, idx) => {
        if (l.toLowerCase().includes(q.toLowerCase())) {
          results.push({
            path: f.path,
            line: idx + 1,
            text: l.trim(),
          });
        }
      });
    });
    setSearchResults(results);
  };

  // Perform replace in all files
  const performReplaceAll = () => {
    if (!searchQuery.trim()) return;
    const files = vfsInstance.getAllFilesFlat();
    files.forEach(f => {
      if (f.content.includes(searchQuery)) {
        const updated = f.content.replaceAll(searchQuery, replaceQuery);
        vfsInstance.writeFile(f.path, updated);
      }
    });
    performSearch(searchQuery);
  };

  // Git Commit & Sync action
  const handleGitCommit = async () => {
    setIsCommitting(true);
    const result = await cloudSyncService.syncToGitHub(commitMessage || undefined);
    setIsCommitting(false);
    if (result.success) {
      setGitStatus(`Committed & pushed: ${result.commitHash}`);
      setCommitMessage('');
      setTimeout(() => setGitStatus('Clean working tree'), 4000);
    } else {
      setGitStatus(`Error: ${result.message}`);
    }
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang) {
      case 'python': return <span className="text-yellow-400 font-bold text-xs">Py</span>;
      case 'typescript': return <span className="text-blue-400 font-bold text-xs">TS</span>;
      case 'javascript': return <span className="text-yellow-300 font-bold text-xs">JS</span>;
      case 'c': case 'cpp': return <span className="text-cyan-400 font-bold text-xs">C++</span>;
      case 'rust': return <span className="text-orange-400 font-bold text-xs">Rs</span>;
      case 'go': return <span className="text-cyan-300 font-bold text-xs">Go</span>;
      case 'java': return <span className="text-red-400 font-bold text-xs">☕</span>;
      case 'markdown': return <FileText className="w-3.5 h-3.5 text-slate-300" />;
      case 'shell': return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Render file tree recursively
  const renderTree = (nodePath: string) => {
    const node = vfsInstance.getNode(nodePath);
    if (!node || node.type !== 'dir' || !node.children) return null;

    const entries = Object.values(node.children);

    return (
      <div className="pl-3 space-y-0.5 text-xs">
        {entries.map(child => {
          if (child.type === 'dir') {
            const isExpanded = !!expandedFolders[child.path];
            return (
              <div key={child.path} className="select-none">
                <div
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#202534] cursor-pointer text-slate-300 group"
                  onClick={() =>
                    setExpandedFolders(prev => ({ ...prev, [child.path]: !isExpanded }))
                  }
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-200 truncate">{child.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewFileInputPath(child.path);
                        setExpandedFolders(prev => ({ ...prev, [child.path]: true }));
                      }}
                      className="p-0.5 hover:text-white"
                      title="New File in this folder"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewFolderInputPath(child.path);
                        setExpandedFolders(prev => ({ ...prev, [child.path]: true }));
                      }}
                      className="p-0.5 hover:text-white"
                      title="New Subfolder"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline new file input inside folder */}
                {newFileInputPath === child.path && (
                  <div className="pl-5 py-1 flex items-center space-x-1">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="file.py"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateFile(child.path);
                        if (e.key === 'Escape') setNewFileInputPath(null);
                      }}
                      onBlur={() => handleCreateFile(child.path)}
                      className="bg-[#12151e] border border-indigo-500/80 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                    />
                  </div>
                )}

                {isExpanded && renderTree(child.path)}
              </div>
            );
          }

          // Render File item
          const isSelected = activeTab?.path === child.path;
          return (
            <div
              key={child.path}
              onClick={() => openFileByPath(child.path)}
              className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer group transition-colors select-none ${
                isSelected
                  ? 'bg-indigo-600/30 text-white font-medium border-l-2 border-indigo-500'
                  : 'text-slate-300 hover:bg-[#1f2433] hover:text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="shrink-0">{getLanguageIcon(child.language || '')}</span>
                <span className="truncate">{child.name}</span>
              </div>
              <button
                onClick={(e) => handleDeleteNode(e, child.path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-slate-500 transition-opacity"
                title="Delete file"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Syntax highlighting helper
  const getHighlightedCode = () => {
    if (!activeTab) return '';
    const lang = activeTab.language;
    const grammar = (Prism.languages as any)[lang] || Prism.languages.javascript || Prism.languages.markup;
    try {
      return Prism.highlight(activeTab.content || '', grammar, lang);
    } catch {
      return activeTab.content;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-zinc-200 overflow-hidden font-sans">
      {/* VS Code Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (VS Code left strip) */}
        <div className="w-12 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-2 space-y-3 shrink-0 z-10 select-none">
          <button
            id="activity-explorer"
            onClick={() => {
              if (activeActivity === 'explorer' && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveActivity('explorer');
                setSidebarOpen(true);
              }
            }}
            className={`p-2.5 rounded-md relative transition-colors ${
              activeActivity === 'explorer' && sidebarOpen
                ? 'text-white border-l-2 border-[#007acc] bg-[#27272a]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Explorer (Files)"
          >
            <Files className="w-5 h-5" />
          </button>

          <button
            id="activity-search"
            onClick={() => {
              if (activeActivity === 'search' && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveActivity('search');
                setSidebarOpen(true);
              }
            }}
            className={`p-2.5 rounded-md relative transition-colors ${
              activeActivity === 'search' && sidebarOpen
                ? 'text-white border-l-2 border-[#007acc] bg-[#27272a]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search & Replace"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            id="activity-git"
            onClick={() => {
              if (activeActivity === 'git' && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveActivity('git');
                setSidebarOpen(true);
              }
            }}
            className={`p-2.5 rounded-md relative transition-colors ${
              activeActivity === 'git' && sidebarOpen
                ? 'text-white border-l-2 border-[#007acc] bg-[#27272a]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Source Control (GitHub Sync)"
          >
            <GitBranch className="w-5 h-5" />
            {openTabs.some(t => t.isDirty) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#007acc]" />
            )}
          </button>

          <button
            id="activity-compilers"
            onClick={() => {
              if (activeActivity === 'compilers' && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveActivity('compilers');
                setSidebarOpen(true);
              }
            }}
            className={`p-2.5 rounded-md relative transition-colors ${
              activeActivity === 'compilers' && sidebarOpen
                ? 'text-white border-l-2 border-[#007acc] bg-[#27272a]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="30 Compilers & Extensions"
          >
            <Boxes className="w-5 h-5" />
          </button>

          <div className="flex-1"></div>

          <button
            id="activity-settings"
            onClick={() => {
              if (activeActivity === 'settings' && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveActivity('settings');
                setSidebarOpen(true);
              }
            }}
            className={`p-2.5 rounded-md relative transition-colors ${
              activeActivity === 'settings' && sidebarOpen
                ? 'text-white border-l-2 border-[#007acc] bg-[#27272a]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Editor Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Sidebar (Explorer, Search, Git, Compilers) */}
        {sidebarOpen && (
          <div className="w-64 bg-[#18181b] border-r border-[#27272a] flex flex-col shrink-0 select-none">
            {/* Sidebar Title */}
            <div className="h-9 px-3 flex items-center justify-between text-[11px] font-bold tracking-wider text-zinc-400 uppercase border-b border-[#27272a]">
              <span>
                {activeActivity === 'explorer' && 'Explorer'}
                {activeActivity === 'search' && 'Search & Replace'}
                {activeActivity === 'git' && 'Source Control'}
                {activeActivity === 'compilers' && 'Compilers (30 Toolchains)'}
                {activeActivity === 'settings' && 'Workspace Config'}
              </span>
              <div className="flex items-center space-x-1">
                {activeActivity === 'explorer' && (
                  <>
                    <button
                      onClick={() => setNewFileInputPath('/root/workspace')}
                      className="p-1 hover:text-white rounded"
                      title="New File in /root/workspace"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setNewFolderInputPath('/root/workspace')}
                      className="p-1 hover:text-white rounded"
                      title="New Folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:text-white rounded"
                  title="Collapse Sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {/* Explorer View */}
              {activeActivity === 'explorer' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 px-1 flex items-center justify-between">
                    <span>ROOT FILESYSTEM</span>
                  </div>

                  {/* Inline new root file input */}
                  {newFileInputPath === '/root/workspace' && (
                    <div className="pl-4 py-1 flex items-center space-x-1">
                      <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="newfile.ts"
                        value={newFileName}
                        onChange={e => setNewFileName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateFile('/root/workspace');
                          if (e.key === 'Escape') setNewFileInputPath(null);
                        }}
                        onBlur={() => handleCreateFile('/root/workspace')}
                        className="bg-[#121214] border border-[#007acc] rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                      />
                    </div>
                  )}

                  {/* Inline new root folder input */}
                  {newFolderInputPath === '/root/workspace' && (
                    <div className="pl-4 py-1 flex items-center space-x-1">
                      <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="folder-name"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateFolder('/root/workspace');
                          if (e.key === 'Escape') setNewFolderInputPath(null);
                        }}
                        onBlur={() => handleCreateFolder('/root/workspace')}
                        className="bg-[#121214] border border-amber-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                      />
                    </div>
                  )}

                  {renderTree('/')}
                </div>
              )}

              {/* Search View */}
              {activeActivity === 'search' && (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Search workspace..."
                      value={searchQuery}
                      onChange={e => performSearch(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#007acc]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Replace with..."
                      value={replaceQuery}
                      onChange={e => setReplaceQuery(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-md px-2.5 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#007acc]"
                    />
                    <button
                      onClick={performReplaceAll}
                      disabled={!searchQuery.trim()}
                      className="mt-1.5 w-full py-1 rounded-md bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-xs font-medium text-white transition-colors"
                    >
                      Replace All
                    </button>
                  </div>

                  <div className="pt-2 text-xs">
                    <div className="text-zinc-400 font-medium mb-1">
                      {searchResults.length} match(es) found
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {searchResults.map((res, idx) => (
                        <div
                          key={idx}
                          onClick={() => openFileByPath(res.path)}
                          className="p-1.5 rounded-md bg-[#121214] hover:bg-[#27272a] cursor-pointer"
                        >
                          <div className="text-blue-400 font-mono text-[11px] truncate">
                            {res.path}:{res.line}
                          </div>
                          <div className="text-zinc-300 truncate text-[11px] font-mono">
                            {res.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Source Control View */}
              {activeActivity === 'git' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 px-2 py-1.5 rounded-md bg-[#121214] border border-[#27272a] text-xs">
                    <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono font-medium">branch: main</span>
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      placeholder="Commit message (Enter message or use auto-template)..."
                      value={commitMessage}
                      onChange={e => setCommitMessage(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-md p-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#007acc] font-mono"
                    />
                    <button
                      onClick={handleGitCommit}
                      disabled={isCommitting}
                      className="mt-2 w-full py-1.5 rounded-md bg-[#007acc] hover:bg-[#0062a3] text-xs font-medium text-white flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                    >
                      {isCommitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Commit & Sync to GitHub</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-400 pt-2 border-t border-[#27272a]">
                    <div className="font-medium text-zinc-300 mb-1">Status:</div>
                    <div className="font-mono text-emerald-400">{gitStatus}</div>
                  </div>
                </div>
              )}

              {/* Compilers View */}
              {activeActivity === 'compilers' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-zinc-400">
                    Click any runtime to create a boilerplate file:
                  </div>
                  <div className="space-y-1">
                    {PREINSTALLED_COMPILERS.slice(0, 15).map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          const targetFile = `/root/workspace/sample_${c.id}.${c.extension}`;
                          vfsInstance.writeFile(targetFile, c.sampleCode, c.id);
                          openFileByPath(targetFile);
                        }}
                        className="p-1.5 rounded-md bg-[#121214] hover:bg-[#27272a] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-blue-300">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">.{c.extension}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings View */}
              {activeActivity === 'settings' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] space-y-2">
                    <div className="font-bold text-zinc-200">Editor Configuration</div>
                    <div>Tab Size: 2 Spaces</div>
                    <div>Font: JetBrains Mono / Monospace</div>
                    <div>Auto-Save: Enabled</div>
                    <div>Format On Save: Enabled</div>
                  </div>
                  <div className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] space-y-1">
                    <div className="font-bold text-zinc-200">Dual Execution Engine</div>
                    <div className="text-zinc-400">
                      Syncing between In-Browser VFS and Cloud Container.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Main Canvas */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          {/* Tabs Bar */}
          <div className="h-9 bg-[#18181b] flex items-center overflow-x-auto border-b border-[#27272a] select-none scrollbar-none">
            {openTabs.map(tab => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => openFileByPath(tab.path)}
                  className={`h-full flex items-center space-x-2 px-3 border-r border-[#27272a] cursor-pointer text-xs transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                      : 'bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200'
                  }`}
                >
                  <span>{getLanguageIcon(tab.language)}</span>
                  <span className="truncate max-w-[130px] font-mono">{tab.name}</span>
                  {tab.isDirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
                  )}
                  <button
                    onClick={e => closeTab(e, tab.id)}
                    className="p-0.5 hover:text-white rounded hover:bg-zinc-700/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Breadcrumb & Actions Bar */}
          {activeTab && (
            <div className="h-8 bg-[#1e1e1e] border-b border-[#27272a] flex items-center justify-between px-3 text-xs select-none">
              {/* Breadcrumb */}
              <div className="flex items-center space-x-1 text-zinc-400 font-mono text-[11px] truncate">
                {activeTab.path.split('/').filter(Boolean).map((seg, i, arr) => (
                  <React.Fragment key={i}>
                    <span className={i === arr.length - 1 ? 'text-zinc-200 font-medium' : ''}>{seg}</span>
                    {i < arr.length - 1 && <span className="text-zinc-600">/</span>}
                  </React.Fragment>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  id="editor-save-btn"
                  onClick={handleSaveFile}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs transition-colors"
                  title="Save file (Ctrl+S) - Triggers Auto-Commit"
                >
                  <Save className="w-3 h-3 text-blue-400" />
                  <span>Save</span>
                </button>

                <button
                  id="editor-run-btn"
                  onClick={handleRunCode}
                  className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
                  title="Run code directly in Qshell Root Terminal"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run in Qshell</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeTab.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 hover:text-white text-zinc-400 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Code Editor Body with Line Numbers & Syntax Highlight */}
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden relative font-mono text-sm leading-relaxed">
              {/* Line Numbers Gutter */}
              <div className="w-12 bg-[#1e1e1e] text-zinc-600 py-3 text-right pr-3 select-none shrink-0 border-r border-[#27272a]">
                {activeTab.content.split('\n').map((_, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed text-xs ${
                      cursorPos.line === idx + 1 ? 'text-zinc-200 font-bold' : ''
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>

              {/* Textarea Overlay */}
              <div className="flex-1 relative overflow-auto">
                <textarea
                  ref={textareaRef}
                  value={activeTab.content}
                  onChange={e => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onSelect={handleSelect}
                  onClick={handleSelect}
                  onKeyUp={handleSelect}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  className="absolute inset-0 w-full h-full p-3 bg-transparent text-zinc-100 font-mono text-xs leading-relaxed outline-none resize-none z-10 selection:bg-[#007acc]/40 tab-size-2 caret-blue-400"
                  style={{ tabSize: 2 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none p-6 text-center bg-[#18181b]/50">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-3.5 shadow-inner">
                <Code className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="text-sm font-semibold text-zinc-200">Qshell Workspace</div>
              <div className="text-xs text-zinc-400 mt-1 max-w-sm">
                The workspace is empty. Create a file from the explorer, run terminal commands, or clone a repository.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => {
                    const samplePath = '/root/workspace/main.py';
                    vfsInstance.writeFile(samplePath, '#!/usr/bin/env python3\nprint("Hello, Qshell!")\n');
                    openFileByPath(samplePath);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>New File (main.py)</span>
                </button>
                <button
                  onClick={() => {
                    setActiveActivity('compilers');
                    setSidebarOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                >
                  <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  <span>30 Compilers</span>
                </button>
              </div>
              <div className="mt-5 text-[11px] font-mono text-zinc-500 bg-zinc-900/90 px-3 py-1.5 rounded-md border border-zinc-800">
                Terminal hint: <span className="text-zinc-300">git clone &lt;repo_url&gt;</span> or <span className="text-zinc-300">touch test.py</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VS Code Bottom Status Bar */}
      <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 cursor-pointer hover:bg-white/10 px-1.5 py-0.5 rounded">
            <GitBranch className="w-3 h-3" />
            <span>main</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>0 errors, 0 warnings</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-white/80">
            <Shield className="w-3 h-3" />
            <span>Root Tier</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </div>
          <div className="hidden sm:block">Spaces: 2</div>
          <div>UTF-8</div>
          <div className="hidden sm:block">LF</div>
          <div className="font-semibold bg-white/20 px-1.5 py-0.5 rounded uppercase">
            {activeTab?.language || 'Plain Text'}
          </div>
        </div>
      </footer>
    </div>
  );
};
