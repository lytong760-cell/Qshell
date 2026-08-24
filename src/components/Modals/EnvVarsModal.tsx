import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Plus, Trash2, ShieldCheck, Download, Lock, Check } from 'lucide-react';
import { EnvVariable } from '../../types';
import { shellEngine } from '../../services/shellEngine';

interface EnvVarsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnvVarsModal: React.FC<EnvVarsModalProps> = ({ isOpen, onClose }) => {
  const [envList, setEnvList] = useState<EnvVariable[]>(() => shellEngine.getEnvList());
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [filter, setFilter] = useState<'all' | 'hidden' | 'custom' | 'system'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    shellEngine.setEnvVar(newKey.trim().toUpperCase(), newValue, newIsSecret, false, 'User custom variable');
    setEnvList(shellEngine.getEnvList());
    setNewKey('');
    setNewValue('');
    setNewIsSecret(false);
  };

  const handleRemoveVar = (key: string) => {
    shellEngine.removeEnvVar(key);
    setEnvList(shellEngine.getEnvList());
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportEnv = () => {
    const lines = envList.map(e => `${e.key}=${e.value}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredList = envList.filter(item => {
    if (filter === 'hidden') return item.isHidden;
    if (filter === 'custom') return !item.isSystem;
    if (filter === 'system') return item.isSystem;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 px-5 bg-[#121214] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Environment & Hidden Variables</h2>
              <p className="text-xs text-zinc-400">
                Manage Qshell system internals, custom secrets, and runtime parameters.
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

        {/* Filter Tabs & Export */}
        <div className="px-5 py-2.5 bg-[#141416] border-b border-[#27272a] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'all' ? 'bg-[#007acc] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({envList.length})
            </button>
            <button
              onClick={() => setFilter('hidden')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'hidden' ? 'bg-[#007acc] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Qshell Hidden ({envList.filter(e => e.isHidden).length})
            </button>
            <button
              onClick={() => setFilter('custom')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'custom' ? 'bg-[#007acc] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Custom Secrets ({envList.filter(e => !e.isSystem).length})
            </button>
          </div>

          <button
            onClick={handleExportEnv}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .env</span>
          </button>
        </div>

        {/* List of Variables */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-xs">
          {filteredList.map(item => {
            const isVisible = showSecrets[item.key] || (!item.isSecret && !item.isHidden);
            return (
              <div
                key={item.key}
                className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] flex items-center justify-between hover:border-[#3f3f46] transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-blue-400">{item.key}</span>
                      {item.isHidden && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          HIDDEN
                        </span>
                      )}
                      {item.isSystem && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-[#27272a]">
                          SYSTEM
                        </span>
                      )}
                      {item.isSecret && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          SECRET
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="px-2.5 py-1 rounded bg-[#09090b] border border-[#27272a] text-zinc-300 max-w-[280px] truncate">
                    {isVisible ? item.value : '••••••••••••••••••••'}
                  </div>

                  {(item.isSecret || item.isHidden) && (
                    <button
                      onClick={() => toggleSecretVisibility(item.key)}
                      className="p-1 text-zinc-400 hover:text-white"
                      title={isVisible ? 'Hide value' : 'Reveal value'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {!item.isSystem && (
                    <button
                      onClick={() => handleRemoveVar(item.key)}
                      className="p-1 text-zinc-400 hover:text-rose-400"
                      title="Delete variable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Variable Form */}
        <form
          onSubmit={handleAddVar}
          className="p-4 bg-[#121214] border-t border-[#27272a] flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            placeholder="KEY_NAME"
            value={newKey}
            onChange={e => setNewKey(e.target.value.toUpperCase())}
            className="flex-1 min-w-[140px] bg-[#18181b] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
          />
          <input
            type="text"
            placeholder="value..."
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="flex-1 min-w-[160px] bg-[#18181b] border border-[#27272a] rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#007acc]"
          />
          <label className="flex items-center space-x-1.5 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={e => setNewIsSecret(e.target.checked)}
              className="rounded bg-[#18181b] border-[#27272a] text-[#007acc] focus:ring-0"
            />
            <span>Secret</span>
          </label>
          <button
            type="submit"
            className="flex items-center space-x-1 px-4 py-1.5 rounded-md bg-[#007acc] hover:bg-[#0062a3] text-xs font-medium text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variable</span>
          </button>
        </form>
      </div>
    </div>
  );
};
