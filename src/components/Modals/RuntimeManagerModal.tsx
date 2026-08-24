import React, { useState } from 'react';
import { X, Sparkles, Search, Play, FileCode, CheckCircle2, Terminal, Code2, Layers, Cpu } from 'lucide-react';
import { PREINSTALLED_COMPILERS } from '../../data/compilers';
import { CompilerRuntime } from '../../types';
import { vfsInstance } from '../../services/vfs';

interface RuntimeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompilerFile: (filePath: string) => void;
  onRunCompilerInTerminal: (code: string, language: string, filePath: string) => void;
}

export const RuntimeManagerModal: React.FC<RuntimeManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectCompilerFile,
  onRunCompilerInTerminal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCompiler, setSelectedCompiler] = useState<CompilerRuntime>(PREINSTALLED_COMPILERS[0]);

  if (!isOpen) return null;

  const categories = [
    'All',
    'Web & Scripting',
    'Compiled & Native',
    'Functional & Modern',
    'Data & Scientific',
    'System',
  ];

  const filtered = PREINSTALLED_COMPILERS.filter(c => {
    const matchCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.command.toLowerCase().includes(search.toLowerCase()) ||
      c.extension.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenInEditor = (compiler: CompilerRuntime) => {
    const targetPath = `/root/workspace/sample_${compiler.id}.${compiler.extension}`;
    vfsInstance.writeFile(targetPath, compiler.sampleCode, compiler.id);
    onSelectCompilerFile(targetPath);
    onClose();
  };

  const handleQuickRun = (compiler: CompilerRuntime) => {
    const targetPath = `/root/workspace/sample_${compiler.id}.${compiler.extension}`;
    vfsInstance.writeFile(targetPath, compiler.sampleCode, compiler.id);
    onRunCompilerInTerminal(compiler.sampleCode, compiler.id, targetPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 px-5 bg-[#121214] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-base">30 Pre-configured Compilers & Runtimes</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  30/30 Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Execute code instantly with full toolchains, compilers, interpreters, and interactive REPLs.
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

        {/* Filter bar */}
        <div className="p-4 bg-[#141416] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#007acc] text-white font-medium shadow-sm'
                    : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name or command..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#121214] border border-[#27272a] rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#007acc]"
            />
          </div>
        </div>

        {/* Catalog Grid & Detail */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* List Left */}
          <div className="w-full md:w-1/2 overflow-y-auto p-4 space-y-2 border-r border-[#27272a]">
            <div className="grid grid-cols-1 gap-2">
              {filtered.map(compiler => {
                const isSelected = selectedCompiler.id === compiler.id;
                return (
                  <div
                    key={compiler.id}
                    onClick={() => setSelectedCompiler(compiler)}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#121214] border-[#007acc] ring-1 ring-[#007acc] text-white shadow-sm'
                        : 'bg-[#121214] border-[#27272a] text-zinc-300 hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{compiler.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono border border-[#27272a]">
                          v{compiler.version}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                        .{compiler.extension}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 line-clamp-1 mb-2">
                      {compiler.description}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-[#27272a]">
                      <span>CLI: <code className="text-blue-400">{compiler.command}</code></span>
                      <span className="text-[10px] text-zinc-500">{compiler.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Right */}
          <div className="w-full md:w-1/2 p-5 bg-[#121214] flex flex-col justify-between overflow-y-auto">
            {selectedCompiler && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-lg">{selectedCompiler.name}</h3>
                    <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      v{selectedCompiler.version}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {selectedCompiler.description}
                  </p>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-md space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>CLI Executable:</span>
                    <span className="text-blue-400 font-bold">{selectedCompiler.command}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Run Command:</span>
                    <span className="text-emerald-400">{selectedCompiler.runCommand}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Interactive REPL:</span>
                    <span className={selectedCompiler.replSupported ? 'text-emerald-400' : 'text-zinc-500'}>
                      {selectedCompiler.replSupported ? 'Supported (Type command to start)' : 'Batch Exec Only'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-400 mb-1.5">Boilerplate Sample Code:</div>
                  <pre className="p-3 bg-[#09090b] border border-[#27272a] rounded-md text-xs font-mono text-zinc-300 overflow-x-auto max-h-48 leading-relaxed">
                    <code>{selectedCompiler.sampleCode}</code>
                  </pre>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center space-x-2 border-t border-[#27272a]">
              <button
                onClick={() => handleOpenInEditor(selectedCompiler)}
                className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-zinc-200 transition-colors"
              >
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>Open in Qshell Editor</span>
              </button>
              <button
                onClick={() => handleQuickRun(selectedCompiler)}
                className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Execute in Terminal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
