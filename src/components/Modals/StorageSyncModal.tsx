import React, { useState } from 'react';
import {
  X,
  HardDrive,
  Github,
  Flame,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  ShieldCheck,
  Key,
  GitCommit,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { StorageDestinationType, GitHubStorageConfig, FirebaseStorageConfig } from '../../types';
import { cloudSyncService } from '../../services/cloudSync';

interface StorageSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: () => void;
}

export const StorageSyncModal: React.FC<StorageSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncCompleted,
}) => {
  const [destination, setDestination] = useState<StorageDestinationType>(() =>
    cloudSyncService.getDestination()
  );
  const [ghConfig, setGhConfig] = useState<GitHubStorageConfig>(() =>
    cloudSyncService.getGitHubConfig()
  );
  const [fbConfig, setFbConfig] = useState<FirebaseStorageConfig>(() =>
    cloudSyncService.getFirebaseConfig()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDestinationSelect = (dest: StorageDestinationType) => {
    setDestination(dest);
    cloudSyncService.setDestination(dest);
  };

  const handleSaveGitHubConfig = () => {
    cloudSyncService.updateGitHubConfig(ghConfig);
    setSyncStatusMsg('GitHub sync parameters saved successfully.');
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  const handleSaveFirebaseConfig = () => {
    cloudSyncService.updateFirebaseConfig(fbConfig);
    setSyncStatusMsg('Firebase configuration saved successfully.');
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  const handleManualGitHubSync = async () => {
    setIsSyncing(true);
    const res = await cloudSyncService.syncToGitHub();
    setIsSyncing(false);
    setSyncStatusMsg(res.message);
    if (res.success && onSyncCompleted) {
      onSyncCompleted();
    }
  };

  const handleManualFirebaseSync = async () => {
    setIsSyncing(true);
    const res = await cloudSyncService.syncToFirebase();
    setIsSyncing(false);
    setSyncStatusMsg(res.message);
    if (res.success && onSyncCompleted) {
      onSyncCompleted();
    }
  };

  // Preview generated commit message
  const previewCommitMsg = cloudSyncService.formatCommitMessage(
    ghConfig.commitMessageTemplate || 'chore(qshell): update {filename} [{timestamp}]',
    {
      filename: 'main.py',
      filepath: '/root/workspace/main.py',
      action: 'modified',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      branch: ghConfig.branch || 'main',
      author: ghConfig.authorName || 'Qshell User',
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 px-5 bg-[#121214] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Workspace Storage & Cloud Sync</h2>
              <p className="text-xs text-zinc-400">
                Choose remote persistence destination between Firebase and GitHub Repository.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Storage Destination Cards */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
              1. Select Storage Destination
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* GitHub Option Card */}
              <div
                onClick={() => handleDestinationSelect('github')}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  destination === 'github'
                    ? 'bg-[#121214] border-[#007acc] ring-1 ring-[#007acc]'
                    : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-md bg-[#27272a] flex items-center justify-center text-white">
                      <Github className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white text-sm">GitHub Repository</span>
                  </div>
                  {destination === 'github' && (
                    <CheckCircle2 className="w-4 h-4 text-[#007acc]" />
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Direct GitHub repository synchronization with automated branch commits, pull, and push workflows.
                </p>
              </div>

              {/* Firebase Option Card */}
              <div
                onClick={() => handleDestinationSelect('firebase')}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  destination === 'firebase'
                    ? 'bg-[#121214] border-amber-500 ring-1 ring-amber-500'
                    : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                      <Flame className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white text-sm">Firebase Storage</span>
                  </div>
                  {destination === 'firebase' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cloud Firestore remote document storage for continuous workspace snapshot backups.
                </p>
              </div>
            </div>
          </div>

          {/* GitHub Sync Workflow Settings */}
          {destination === 'github' && (
            <div className="space-y-4 pt-2 border-t border-[#27272a] animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Github className="w-4 h-4 text-white" />
                  <span className="font-bold text-white text-sm">GitHub Sync Workflow</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  OAuth & Token Ready
                </span>
              </div>

              {/* OAuth / Permissions Prompt */}
              <div className="p-3 bg-[#121214] border border-[#27272a] rounded-md flex items-start space-x-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#007acc] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-blue-300">OAuth & Repository Permissions</div>
                  <p className="text-zinc-400 leading-relaxed">
                    Qshell requires read and write permissions (<code className="text-blue-300">repo</code>, <code className="text-blue-300">workflow</code>) to create commits and synchronize files with your target repository.
                  </p>
                </div>
              </div>

              {/* Target Repo & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Target Repository (owner/repo)</label>
                  <input
                    type="text"
                    value={ghConfig.repo}
                    onChange={e => setGhConfig({ ...ghConfig, repo: e.target.value })}
                    placeholder="username/qshell-project"
                    className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Branch</label>
                  <input
                    type="text"
                    value={ghConfig.branch}
                    onChange={e => setGhConfig({ ...ghConfig, branch: e.target.value })}
                    placeholder="main"
                    className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
                  />
                </div>
              </div>

              {/* Token or OAuth token */}
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Personal Access Token / OAuth Bearer</label>
                <input
                  type="password"
                  value={ghConfig.token}
                  onChange={e => setGhConfig({ ...ghConfig, token: e.target.value })}
                  placeholder="ghp_••••••••••••••••••••••••••••••••••••"
                  className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
                />
              </div>

              {/* Auto-commit on change Toggle */}
              <div className="p-3.5 bg-[#121214] border border-[#27272a] rounded-md flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">Auto-commit on change</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically trigger repository commits whenever files are saved or modified.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ghConfig.autoCommitOnChange}
                    onChange={e =>
                      setGhConfig({ ...ghConfig, autoCommitOnChange: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007acc]"></div>
                </label>
              </div>

              {/* Customizable Commit Message Template */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-300 font-semibold">
                    Customizable Commit Message Template
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    Tokens: {'{filename}'}, {'{timestamp}'}, {'{branch}'}, {'{action}'}
                  </span>
                </div>
                <input
                  type="text"
                  value={ghConfig.commitMessageTemplate}
                  onChange={e =>
                    setGhConfig({ ...ghConfig, commitMessageTemplate: e.target.value })
                  }
                  placeholder="chore(qshell): update {filename} [{timestamp}]"
                  className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
                />
                <div className="p-2.5 rounded-md bg-[#09090b] border border-[#27272a] text-[11px] font-mono flex items-center space-x-2">
                  <span className="text-zinc-500 shrink-0">Live Preview:</span>
                  <span className="text-emerald-400 truncate">{previewCommitMsg}</span>
                </div>
              </div>
            </div>
          )}

          {/* Firebase Storage Settings */}
          {destination === 'firebase' && (
            <div className="space-y-4 pt-2 border-t border-[#27272a] animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-sm">Firebase Firestore Persistence</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  Cloud Connected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Firebase Project ID</label>
                  <input
                    type="text"
                    value={fbConfig.projectId}
                    onChange={e => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    placeholder="qshell-prod-cloud"
                    className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Firestore Collection</label>
                  <input
                    type="text"
                    value={fbConfig.collection}
                    onChange={e => setFbConfig({ ...fbConfig, collection: e.target.value })}
                    placeholder="qshell_workspaces"
                    className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Workspace ID</label>
                <input
                  type="text"
                  value={fbConfig.workspaceId}
                  onChange={e => setFbConfig({ ...fbConfig, workspaceId: e.target.value })}
                  placeholder="dev_workspace_01"
                  className="w-full bg-[#121214] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3.5 bg-[#121214] border border-amber-800/30 rounded-md flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">Automatic Background Backup</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Stream workspace document changes to Firebase Firestore collection.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fbConfig.autoSync}
                    onChange={e => setFbConfig({ ...fbConfig, autoSync: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Sync Status Banner */}
          {syncStatusMsg && (
            <div className="p-3 rounded-md bg-blue-950/30 border border-[#007acc]/40 text-xs text-blue-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#121214] border-t border-[#27272a] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <span>Last Sync:</span>
            <span className="font-mono text-zinc-200">
              {destination === 'github'
                ? ghConfig.lastSyncedAt || 'Never'
                : fbConfig.lastSyncedAt || 'Never'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (destination === 'github') {
                  handleSaveGitHubConfig();
                  handleManualGitHubSync();
                } else {
                  handleSaveFirebaseConfig();
                  handleManualFirebaseSync();
                }
              }}
              disabled={isSyncing}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white shadow-sm transition-all ${
                destination === 'github'
                  ? 'bg-[#007acc] hover:bg-[#0062a3]'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Sync Now</span>
            </button>
            <button
              onClick={() => {
                if (destination === 'github') handleSaveGitHubConfig();
                else handleSaveFirebaseConfig();
                onClose();
              }}
              className="px-4 py-2 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-zinc-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
