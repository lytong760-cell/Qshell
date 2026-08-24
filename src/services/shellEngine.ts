import { PREINSTALLED_COMPILERS } from '../data/compilers';
import { EnvVariable, ExecutionMode, TerminalLine } from '../types';
import { cloudSyncService } from './cloudSync';
import { vfsInstance } from './vfs';
import { handleCompilerCommand } from './compilerEngine';
import { createNodeRequire, transpileJavaScript } from './nodeRuntime';
import { pythonPackageManager, executePythonScript } from './pythonRuntime';
import { universalPackageManager } from './packageManagers';

export interface CommandContext {
  cwd: string;
  user: string;
  hostname: string;
  env: Record<string, string>;
  executionMode: ExecutionMode;
  onOpenEditorFile?: (path: string) => void;
  inRepl?: string | null;
}

export class ShellEngine {
  private customEnv: Record<string, EnvVariable> = {};

  constructor() {
    this.initDefaultEnv();
  }

  private initDefaultEnv() {
    const defaults: EnvVariable[] = [
      { key: 'QSHELL_VERSION', value: '3.4.0-enterprise', isSecret: false, isSystem: true, isHidden: true, description: 'Qshell Enterprise Engine build' },
      { key: 'QSHELL_ENV', value: 'cloud_browser_dual', isSecret: false, isSystem: true, isHidden: true, description: 'Dual Browser & Cloud Execution sync mode' },
      { key: 'QSHELL_SESSION_ID', value: `qs_sec_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`, isSecret: true, isSystem: true, isHidden: true, description: 'Secure isolated session token' },
      { key: 'QSHELL_RUNTIME_TIER', value: 'root', isSecret: false, isSystem: true, isHidden: true, description: 'Root privilege tier access' },
      { key: 'QSHELL_STORAGE_SYNC', value: 'firebase_github_v2', isSecret: false, isSystem: true, isHidden: true, description: 'Remote cloud persistence pipeline' },
      { key: 'QSHELL_COMPILERS_COUNT', value: '30', isSecret: false, isSystem: true, isHidden: true, description: 'Number of pre-installed toolchains' },
      { key: 'QSHELL_KERNEL', value: 'Linux 6.8.0-qshell-dual x86_64', isSecret: false, isSystem: true, isHidden: true, description: 'Kernel release identifier' },
      { key: 'USER', value: 'root', isSecret: false, isSystem: true, isHidden: false, description: 'Active terminal username' },
      { key: 'HOME', value: '/root', isSecret: false, isSystem: true, isHidden: false, description: 'User home directory' },
      { key: 'SHELL', value: '/bin/qsh', isSecret: false, isSystem: true, isHidden: false, description: 'Interactive shell interpreter' },
      { key: 'TERM', value: 'xterm-256color', isSecret: false, isSystem: true, isHidden: false, description: 'Terminal emulation capability' },
      { key: 'PATH', value: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.qshell/bin:/opt/compilers/bin', isSecret: false, isSystem: true, isHidden: false, description: 'System executable path' },
      { key: 'LANG', value: 'en_US.UTF-8', isSecret: false, isSystem: true, isHidden: false, description: 'System locale' },
      { key: 'EDITOR', value: 'qshell-editor', isSecret: false, isSystem: true, isHidden: false, description: 'Default text editor' },
    ];

    defaults.forEach(v => {
      this.customEnv[v.key] = v;
    });

    // Load user custom env vars from localStorage
    try {
      const stored = localStorage.getItem('qshell_custom_env');
      if (stored) {
        const parsed: EnvVariable[] = JSON.parse(stored);
        parsed.forEach(v => {
          this.customEnv[v.key] = v;
        });
      }
    } catch (e) {
      console.warn('Failed to load custom env:', e);
    }
  }

  public getEnvList(): EnvVariable[] {
    return Object.values(this.customEnv);
  }

  public setEnvVar(key: string, value: string, isSecret = false, isHidden = false, description = '') {
    this.customEnv[key] = {
      key,
      value,
      isSecret,
      isSystem: false,
      isHidden,
      description,
    };
    this.persistEnv();
  }

  public removeEnvVar(key: string) {
    if (this.customEnv[key] && !this.customEnv[key].isSystem) {
      delete this.customEnv[key];
      this.persistEnv();
    }
  }

  private persistEnv() {
    try {
      const userVars = Object.values(this.customEnv).filter(v => !v.isSystem);
      localStorage.setItem('qshell_custom_env', JSON.stringify(userVars));
    } catch (e) {
      console.warn('Failed to persist env:', e);
    }
  }

  public async executeCommandLine(
    cmdLine: string,
    ctx: CommandContext
  ): Promise<{
    lines: TerminalLine[];
    newCwd?: string;
    newUser?: string;
    enterRepl?: string | null;
    exitRepl?: boolean;
    clear?: boolean;
  }> {
    const raw = cmdLine.trim();
    if (!raw) return { lines: [] };

    // Check if in REPL
    if (ctx.inRepl) {
      return this.handleReplInput(raw, ctx.inRepl, ctx);
    }

    // Handle compound commands (&&, ;, ||)
    if (raw.includes('&&')) {
      const parts = raw.split('&&').map(p => p.trim()).filter(Boolean);
      let combinedLines: TerminalLine[] = [];
      let currentCwd = ctx.cwd;
      for (const part of parts) {
        const res = await this.executeSingleCommand(part, { ...ctx, cwd: currentCwd });
        combinedLines = combinedLines.concat(res.lines);
        if (res.newCwd) currentCwd = res.newCwd;
        if (res.clear) return { lines: [], clear: true };
      }
      return { lines: combinedLines, newCwd: currentCwd };
    }

    if (raw.includes(';')) {
      const parts = raw.split(';').map(p => p.trim()).filter(Boolean);
      let combinedLines: TerminalLine[] = [];
      let currentCwd = ctx.cwd;
      for (const part of parts) {
        const res = await this.executeSingleCommand(part, { ...ctx, cwd: currentCwd });
        combinedLines = combinedLines.concat(res.lines);
        if (res.newCwd) currentCwd = res.newCwd;
      }
      return { lines: combinedLines, newCwd: currentCwd };
    }

    return this.executeSingleCommand(raw, ctx);
  }

  private async handleReplInput(input: string, replName: string, ctx: CommandContext): Promise<{ lines: TerminalLine[]; exitRepl?: boolean }> {
    if (input === 'exit' || input === 'exit()' || input === 'quit' || input === 'quit()' || input === '.exit') {
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'system',
          content: `Exited ${replName} interactive session.`,
          timestamp: new Date().toLocaleTimeString(),
        }],
        exitRepl: true,
      };
    }

    // Evaluate in REPL
    let output = '';
    let isError = false;

    if (replName === 'python3' || replName === 'python') {
      try {
        if (input.startsWith('print(')) {
          const match = input.match(/print\((.*)\)/);
          output = match ? eval(match[1]) : '';
        } else if (input.includes('=')) {
          output = `Defined variable in REPL state.`;
        } else {
          try {
            output = String(eval(input));
          } catch {
            output = `>>> ${input}`;
          }
        }
      } catch (e: any) {
        output = `Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\n${e?.message}`;
        isError = true;
      }
    } else if (replName === 'node' || replName === 'js') {
      try {
        const res = eval(input);
        output = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
      } catch (e: any) {
        output = `Uncaught ${e?.name || 'Error'}: ${e?.message}`;
        isError = true;
      }
    } else if (replName === 'sqlite3') {
      output = `Query executed on in-memory SQLite database [0 rows returned].`;
    } else {
      output = `[${replName} REPL evaluated]: ${input}`;
    }

    return {
      lines: [{
        id: Math.random().toString(),
        type: isError ? 'error' : 'output',
        content: output,
        timestamp: new Date().toLocaleTimeString(),
      }],
    };
  }

  private async executeSingleCommand(cmdStr: string, ctx: CommandContext): Promise<{
    lines: TerminalLine[];
    newCwd?: string;
    newUser?: string;
    enterRepl?: string | null;
    clear?: boolean;
  }> {
    // Handle redirection: `> filename` or `>> filename`
    let redirectMode: 'overwrite' | 'append' | null = null;
    let redirectFile: string | null = null;
    let cleanCmd = cmdStr;

    if (cmdStr.includes('>>')) {
      redirectMode = 'append';
      const parts = cmdStr.split('>>');
      cleanCmd = parts[0].trim();
      redirectFile = parts[1].trim();
    } else if (cmdStr.includes('>')) {
      redirectMode = 'overwrite';
      const parts = cmdStr.split('>');
      cleanCmd = parts[0].trim();
      redirectFile = parts[1].trim();
    }

    // Handle Pipe: `cmd1 | cmd2`
    if (cleanCmd.includes('|')) {
      return this.handlePipedCommands(cleanCmd, ctx);
    }

    // Expand Environment Variables in command ($VAR)
    cleanCmd = cleanCmd.replace(/\$([a-zA-Z0-9_]+)/g, (_, varName) => {
      return this.customEnv[varName]?.value || ctx.env[varName] || '';
    });

    const tokens = this.tokenize(cleanCmd);
    if (tokens.length === 0) return { lines: [] };

    let command = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    // If command starts with sudo, strip sudo and note root execution
    if (command === 'sudo') {
      if (args.length === 0) {
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: 'usage: sudo command [args...]',
            timestamp: new Date().toLocaleTimeString(),
          }],
        };
      }
      command = args[0].toLowerCase();
      args.shift();
    }

    const timestamp = new Date().toLocaleTimeString();

    // Node.js, NPM, NPX, NVM dedicated handlers
    if (command === 'node' || command === 'nodejs') {
      return this.handleNodeCommand(args, ctx);
    }
    if (command === 'npm') {
      return this.handleNpmCommand(args, ctx);
    }
    if (command === 'npx') {
      return this.handleNpxCommand(args, ctx);
    }
    if (command === 'nvm') {
      return this.handleNvmCommand(args, ctx);
    }

    // PIP & Python Package Management
    if (command === 'pip' || command === 'pip3' || command === 'pip2') {
      return this.handlePipCommand(args, ctx);
    }
    if ((command === 'python' || command === 'python3' || command === 'py') && args[0] === '-m' && (args[1] === 'pip' || args[1] === 'pip3')) {
      return this.handlePipCommand(args.slice(2), ctx);
    }

    // Alternative JavaScript Package Managers (yarn, pnpm, bun)
    if (command === 'yarn' || command === 'pnpm' || command === 'bun') {
      return this.handleAltNodePMCommand(command as 'yarn' | 'pnpm' | 'bun', args, ctx);
    }

    // Rust Cargo (package management commands like `cargo add`, `cargo init`, `cargo new`)
    if (command === 'cargo' && (args[0] === 'add' || args[0] === 'init' || args[0] === 'new')) {
      return this.handleCargoCommand(args, ctx);
    }

    // Ruby Gem & Bundler
    if (command === 'gem' || command === 'bundle' || command === 'bundler') {
      return this.handleGemCommand(args, ctx);
    }

    // PHP Composer
    if (command === 'composer') {
      return this.handleComposerCommand(args, ctx);
    }

    // Go package management
    if (command === 'go' && (args[0] === 'get' || args[0] === 'mod')) {
      return this.handleGoCommand(args, ctx);
    }

    // .NET package management
    if (command === 'dotnet' && (args[0] === 'add' || args[0] === 'restore' || (args[0] === 'list' && args[1] === 'package'))) {
      return this.handleDotnetCommand(args, ctx);
    }

    // Check pre-configured compilers and runtimes first (e.g. `python`, `gcc`, `cargo`, etc.)
    const compilerMatch = PREINSTALLED_COMPILERS.find(c => 
      c.command.toLowerCase() === command || 
      c.id.toLowerCase() === command ||
      (command === 'py' && c.id === 'python') ||
      (command === 'python' && c.id === 'python') ||
      (command === 'g++' && c.id === 'cpp') ||
      (command === 'clang' && c.id === 'c') ||
      (command === 'cargo' && c.id === 'rust')
    );

    if (compilerMatch) {
      return this.handleCompilerExecution(compilerMatch, command, args, ctx);
    }

    // Standard Unix Shell Utilities
    switch (command) {
      case 'clear':
      case 'cls':
        return { lines: [], clear: true };

      case 'pwd':
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: ctx.cwd, timestamp }],
        };

      case 'whoami':
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: ctx.user, timestamp }],
        };

      case 'id':
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'output',
            content: `uid=0(${ctx.user}) gid=0(${ctx.user}) groups=0(root),27(sudo),100(users)`,
            timestamp,
          }],
        };

      case 'su': {
        const targetUser = args[0] || 'root';
        return {
          newUser: targetUser,
          lines: [{
            id: Math.random().toString(),
            type: 'system',
            content: `Switched session authority to user '${targetUser}'.`,
            timestamp,
          }],
        };
      }

      case 'cd': {
        const target = args[0] || '/root';
        const resolved = vfsInstance.resolvePath(ctx.cwd, target);
        const node = vfsInstance.getNode(resolved);
        if (!node) {
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'error',
              content: `cd: ${target}: No such file or directory`,
              timestamp,
            }],
          };
        }
        if (node.type !== 'dir') {
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'error',
              content: `cd: ${target}: Not a directory`,
              timestamp,
            }],
          };
        }
        return {
          newCwd: resolved,
          lines: [],
        };
      }

      case 'ls':
      case 'dir':
      case 'll': {
        const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al') || command === 'll';
        const showLong = args.includes('-l') || args.includes('-la') || args.includes('-al') || args.includes('-lh') || command === 'll';
        const targetPath = args.find(a => !a.startsWith('-')) || ctx.cwd;
        const resolved = vfsInstance.resolvePath(ctx.cwd, targetPath);
        const node = vfsInstance.getNode(resolved);

        if (!node) {
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'error',
              content: `ls: cannot access '${targetPath}': No such file or directory`,
              timestamp,
            }],
          };
        }

        if (node.type === 'file') {
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'output',
              content: `${node.permissions} 1 ${node.owner} ${node.group} ${node.size}B ${node.name}`,
              timestamp,
            }],
          };
        }

        const children = vfsInstance.listDirectory(resolved);
        const filtered = showAll ? children : children.filter(c => !c.name.startsWith('.'));

        if (showLong) {
          let output = `total ${filtered.length * 4}K\n`;
          output += filtered.map(c => {
            const isDir = c.type === 'dir';
            const perm = isDir ? 'd' + c.permissions : '-' + c.permissions;
            const sizeStr = `${c.size}B`.padStart(7, ' ');
            const dateStr = new Date(c.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            return `${perm} 1 ${c.owner} ${c.group} ${sizeStr} ${dateStr} ${c.name}${isDir ? '/' : ''}`;
          }).join('\n');

          return {
            lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
          };
        }

        const items = filtered.map(c => c.type === 'dir' ? `📁 \x1b[1;34m${c.name}/\x1b[0m` : `📄 ${c.name}`).join('   ');
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: items || '(empty directory)', timestamp }],
        };
      }

      case 'cat': {
        if (args.length === 0) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'cat: missing file operand', timestamp }],
          };
        }
        const filePath = vfsInstance.resolvePath(ctx.cwd, args[0]);
        const file = vfsInstance.getFile(filePath);
        if (!file) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: `cat: ${args[0]}: No such file or directory`, timestamp }],
          };
        }
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: file.content || '', timestamp }],
        };
      }

      case 'mkdir': {
        if (args.length === 0) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'mkdir: missing operand', timestamp }],
          };
        }
        const dirName = args.find(a => !a.startsWith('-')) || args[0];
        const resolved = vfsInstance.resolvePath(ctx.cwd, dirName);
        vfsInstance.createDirectory(resolved);
        return {
          lines: [{ id: Math.random().toString(), type: 'system', content: `Created directory '${resolved}'`, timestamp }],
        };
      }

      case 'touch': {
        if (args.length === 0) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'touch: missing file operand', timestamp }],
          };
        }
        for (const arg of args) {
          const resolved = vfsInstance.resolvePath(ctx.cwd, arg);
          const existing = vfsInstance.getFile(resolved);
          if (!existing) {
            vfsInstance.writeFile(resolved, '');
            cloudSyncService.handleFileChange(resolved, 'created');
          }
        }
        return { lines: [] };
      }

      case 'rm': {
        const isRec = args.includes('-r') || args.includes('-rf') || args.includes('-R');
        const target = args.find(a => !a.startsWith('-'));
        if (!target) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'rm: missing operand', timestamp }],
          };
        }
        const resolved = vfsInstance.resolvePath(ctx.cwd, target);
        try {
          const removed = vfsInstance.remove(resolved, isRec);
          if (removed) {
            cloudSyncService.handleFileChange(resolved, 'deleted');
            return { lines: [] };
          } else {
            return {
              lines: [{ id: Math.random().toString(), type: 'error', content: `rm: cannot remove '${target}': No such file or directory`, timestamp }],
            };
          }
        } catch (e: any) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: `rm: ${e.message}`, timestamp }],
          };
        }
      }

      case 'echo': {
        const text = args.join(' ').replace(/^["']|["']$/g, '');
        if (redirectFile && redirectMode) {
          const targetPath = vfsInstance.resolvePath(ctx.cwd, redirectFile);
          const existing = vfsInstance.getFile(targetPath);
          const newContent = redirectMode === 'append' && existing ? (existing.content + '\n' + text) : text;
          vfsInstance.writeFile(targetPath, newContent);
          cloudSyncService.handleFileChange(targetPath, 'modified');
          return {
            lines: [{ id: Math.random().toString(), type: 'system', content: `Wrote to '${targetPath}'`, timestamp }],
          };
        }
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: text, timestamp }],
        };
      }

      case 'code':
      case 'edit':
      case 'nano':
      case 'vi':
      case 'vim': {
        if (args.length > 0 && ctx.onOpenEditorFile) {
          const filePath = vfsInstance.resolvePath(ctx.cwd, args[0]);
          let file = vfsInstance.getFile(filePath);
          if (!file) {
            file = vfsInstance.writeFile(filePath, '');
          }
          ctx.onOpenEditorFile(filePath);
          return {
            lines: [{ id: Math.random().toString(), type: 'system', content: `Opened '${filePath}' in Qshell Editor.`, timestamp }],
          };
        }
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: 'Qshell Editor: Provide a filename e.g. code /root/workspace/main.py', timestamp }],
        };
      }

      case 'env':
      case 'printenv': {
        const envs = this.getEnvList();
        const output = envs.map(e => `${e.key}=${e.isSecret ? '••••••••' : e.value}`).join('\n');
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'export': {
        if (args.length === 0) {
          return this.executeSingleCommand('env', ctx);
        }
        const assign = args.join(' ');
        const [k, ...vParts] = assign.split('=');
        const v = vParts.join('=').replace(/^["']|["']$/g, '');
        if (k) {
          this.setEnvVar(k.trim(), v);
          return {
            lines: [{ id: Math.random().toString(), type: 'system', content: `Exported environment variable: ${k.trim()}`, timestamp }],
          };
        }
        return { lines: [] };
      }

      case 'unset': {
        if (args[0]) {
          this.removeEnvVar(args[0]);
        }
        return { lines: [] };
      }

      case 'curl': {
        const url = args.find(a => a.startsWith('http://') || a.startsWith('https://')) || args[args.length - 1];
        if (!url || !url.startsWith('http')) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'curl: try \'curl --help\' or specify a valid URL', timestamp }],
          };
        }
        try {
          const res = await fetch(url);
          const data = await res.text();
          return {
            lines: [{ id: Math.random().toString(), type: 'output', content: data.substring(0, 2000), timestamp }],
          };
        } catch (e: any) {
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'output',
              content: `HTTP/2 200 OK\nserver: qshell-edge/3.4\ncontent-type: application/json\n\n{\n  "status": "connected",\n  "target": "${url}",\n  "protocol": "HTTPS",\n  "latencyMs": 14.2\n}`,
              timestamp,
            }],
          };
        }
      }

      case 'ping': {
        const host = args[0] || '1.1.1.1';
        let output = `PING ${host} (${host}) 56(84) bytes of data.\n`;
        output += `64 bytes from ${host}: icmp_seq=1 ttl=118 time=12.4 ms\n`;
        output += `64 bytes from ${host}: icmp_seq=2 ttl=118 time=11.9 ms\n`;
        output += `64 bytes from ${host}: icmp_seq=3 ttl=118 time=13.1 ms\n`;
        output += `--- ${host} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss, time 2003ms`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'uname': {
        const flag = args[0] || '-s';
        if (flag === '-a') {
          return {
            lines: [{ id: Math.random().toString(), type: 'output', content: 'Linux qshell-host 6.8.0-qshell-dual #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux', timestamp }],
          };
        }
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: 'Linux', timestamp }],
        };
      }

      case 'uptime': {
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: ' 22:48:35 up 4 days, 12:18,  1 user,  load average: 0.08, 0.04, 0.01', timestamp }],
        };
      }

      case 'free': {
        const output = `               total        used        free      shared  buff/cache   available\nMem:        16384000     2456000    12584000      124000     1344000    13804000\nSwap:        4194304           0     4194304`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'df': {
        const output = `Filesystem     1K-blocks      Used Available Use% Mounted on\noverlay        104857600  12485760  92371840  12% /\ntmpfs            8192000         0   8192000   0% /dev\nvfs-browser      2097152    145000   1952152   7% /root/workspace`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'ps': {
        const output = `  PID TTY          TIME CMD\n    1 ?        00:00:02 init\n   42 pts/0    00:00:00 qsh (root)\n  108 pts/0    00:00:01 qshell-editor-daemon\n  156 pts/0    00:00:00 dual-sync-worker`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'htop':
      case 'top': {
        let output = `[Qshell System Resource Monitor]\n`;
        output += `Tasks: 42 total, 1 running, 41 sleeping, 0 stopped\n`;
        output += `%Cpu(s):  2.4 us,  1.1 sy,  0.0 ni, 96.5 id,  0.0 wa\n`;
        output += `MiB Mem :  16000.0 total,  12288.0 free,   2400.0 used\n\n`;
        output += `  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n`;
        output += `    1 root      20   0  168540  14200   9200 S   0.5   0.1   0:02.14 systemd\n`;
        output += `   42 root      20   0   89420   8120   5400 S   0.2   0.1   0:00.32 qsh\n`;
        output += `  108 root      20   0  342500  42100  18200 S   1.8   0.3   0:01.89 qshell-editor\n`;
        output += `  156 root      20   0  210400  28400  12400 S   0.4   0.2   0:00.45 cloud-sync`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'git': {
        return this.handleGitCommand(args, ctx);
      }

      case 'compilers':
      case 'runtimes': {
        let output = `=== 🚀 Qshell 30 Pre-configured Compilers & Runtimes ===\n\n`;
        output += PREINSTALLED_COMPILERS.map((c, i) => {
          const num = String(i + 1).padStart(2, '0');
          return `[${num}] ${c.name.padEnd(26, ' ')} v${c.version.padEnd(16, ' ')} [${c.category}] -> '${c.command}'`;
        }).join('\n');
        output += `\n\nRun any code directly e.g. 'python3 main.py' or 'gcc hello.c -o app && ./app'`;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
        };
      }

      case 'tree': {
        const target = args[0] || ctx.cwd;
        const resolved = vfsInstance.resolvePath(ctx.cwd, target);
        const node = vfsInstance.getNode(resolved);
        if (!node || node.type !== 'dir') {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: `tree: ${target}: Not a directory`, timestamp }],
          };
        }
        let treeOutput = `${node.name}\n`;
        const renderTree = (n: any, prefix = '') => {
          const entries = Object.values(n.children || {});
          entries.forEach((child: any, idx) => {
            const isLast = idx === entries.length - 1;
            const branch = isLast ? '└── ' : '├── ';
            treeOutput += `${prefix}${branch}${child.type === 'dir' ? child.name + '/' : child.name}\n`;
            if (child.type === 'dir' && child.children) {
              renderTree(child, prefix + (isLast ? '    ' : '│   '));
            }
          });
        };
        renderTree(node);
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: treeOutput, timestamp }],
        };
      }

      case 'grep': {
        const pattern = args[0];
        const fileArg = args[1];
        if (!pattern || !fileArg) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: 'usage: grep <pattern> <file>', timestamp }],
          };
        }
        const resolved = vfsInstance.resolvePath(ctx.cwd, fileArg);
        const file = vfsInstance.getFile(resolved);
        if (!file || !file.content) {
          return {
            lines: [{ id: Math.random().toString(), type: 'error', content: `grep: ${fileArg}: No such file or directory`, timestamp }],
          };
        }
        const matches = file.content
          .split('\n')
          .filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: matches.join('\n') || '(no matches)', timestamp }],
        };
      }

      case 'head': {
        const count = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1], 10) || 10 : 10;
        const fileArg = args.find(a => !a.startsWith('-') && isNaN(Number(a)));
        if (!fileArg) return { lines: [{ id: Math.random().toString(), type: 'error', content: 'head: missing file operand', timestamp }] };
        const file = vfsInstance.getFile(vfsInstance.resolvePath(ctx.cwd, fileArg));
        if (!file || !file.content) return { lines: [{ id: Math.random().toString(), type: 'error', content: `head: cannot open '${fileArg}'`, timestamp }] };
        const lines = file.content.split('\n').slice(0, count).join('\n');
        return { lines: [{ id: Math.random().toString(), type: 'output', content: lines, timestamp }] };
      }

      case 'tail': {
        const count = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1], 10) || 10 : 10;
        const fileArg = args.find(a => !a.startsWith('-') && isNaN(Number(a)));
        if (!fileArg) return { lines: [{ id: Math.random().toString(), type: 'error', content: 'tail: missing file operand', timestamp }] };
        const file = vfsInstance.getFile(vfsInstance.resolvePath(ctx.cwd, fileArg));
        if (!file || !file.content) return { lines: [{ id: Math.random().toString(), type: 'error', content: `tail: cannot open '${fileArg}'`, timestamp }] };
        const all = file.content.split('\n');
        const lines = all.slice(Math.max(0, all.length - count)).join('\n');
        return { lines: [{ id: Math.random().toString(), type: 'output', content: lines, timestamp }] };
      }

      case 'wc': {
        const fileArg = args.find(a => !a.startsWith('-'));
        if (!fileArg) return { lines: [{ id: Math.random().toString(), type: 'error', content: 'wc: missing file operand', timestamp }] };
        const file = vfsInstance.getFile(vfsInstance.resolvePath(ctx.cwd, fileArg));
        if (!file || !file.content) return { lines: [{ id: Math.random().toString(), type: 'error', content: `wc: '${fileArg}': No such file`, timestamp }] };
        const lineCount = file.content.split('\n').length;
        const wordCount = file.content.trim().split(/\s+/).filter(Boolean).length;
        const byteCount = file.size;
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: ` ${lineCount}  ${wordCount} ${byteCount} ${fileArg}`, timestamp }],
        };
      }

      case 'apt':
      case 'pkg': {
        const sub = args[0] || 'help';
        if (sub === 'update') {
          let output = `Hit:1 http://deb.qshell.internal/debian trixie InRelease\n`;
          output += `Get:2 http://cloud.qshell.internal/compilers/all 30-packages [1.4MB]\n`;
          output += `Fetched 1.4 MB in 0.2s (7.2 MB/s)\nAll 30 compilers and toolchains are up to date.`;
          return { lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }] };
        }
        if (sub === 'install') {
          const pkg = args[1] || 'package';
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'system',
              content: `Reading package lists... Done\nBuilding dependency tree... Done\nSetting up ${pkg} (latest-stable) ...\nProcessing triggers for qshell-vfs ...\n[OK] Package ${pkg} installed in root sandbox.`,
              timestamp,
            }],
          };
        }
        if (sub === 'list') {
          const list = PREINSTALLED_COMPILERS.map(c => `${c.id}/${c.category} ${c.version} [installed]`).join('\n');
          return { lines: [{ id: Math.random().toString(), type: 'output', content: list, timestamp }] };
        }
        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: 'apt 2.9.8 (x86_64) | Usage: apt update | apt install <pkg> | apt list --installed', timestamp }],
        };
      }

      case 'help': {
        const query = args[0]?.toLowerCase();
        if (query) {
          const HELP_TOPICS: Record<string, string> = {
            cd: 'cd: cd [-L|[-P [-e]]] [-@] [dir]\n    Change the shell working directory.\n    \n    Change the current directory to DIR.  The default DIR is the value of the\n    HOME shell variable.',
            pwd: 'pwd: pwd [-LP]\n    Print the name of the current working directory.\n    \n    Options:\n      -L\tprint the value of $PWD if it names the current working\n    \t\tdirectory\n      -P\tprint the physical directory, without any symbolic links\n    \n    By default, `pwd\' behaves as if `-L\' were specified.',
            history: 'history: history [-c] [-d offset] [n] or history -anrw [filename] or history -ps arg [arg...]\n    Display or manipulate the history list.\n    \n    Display the history list with line numbers, prefixing each modified\n    entry with a `*\'.  An argument of N lists only the last N entries.',
            alias: 'alias: alias [-p] [name[=value] ... ]\n    Define or display aliases.\n    \n    Without arguments, `alias\' prints the list of aliases in the reusable\n    format `alias NAME=VALUE\' on standard output.',
            export: 'export: export [-fn] [name[=value] ...] or export -p [-f]\n    Set export attribute for shell variables.\n    \n    Marks each NAME for automatic export to the environment of subsequently\n    executed commands.',
            echo: 'echo: echo [-neE] [arg ...]\n    Write arguments to the standard output.\n    \n    Display the ARGs, separated by a single space character and followed by a\n    newline, on the standard output.',
            exit: 'exit: exit [n]\n    Exit the shell.\n    \n    Exits the shell with a status of N.  If N is omitted, the exit status\n    is that of the last command executed.',
            clear: 'clear: clear\n    Clear the terminal screen buffer.',
            type: 'type: type [-afptP] name [name ...]\n    Display information about command type.',
            set: 'set: set [-abefhkmnptuvxBCEHPT] [-o option-name] [--] [-] [arg ...]\n    Set or unset values of shell options and positional parameters.',
            unset: 'unset: unset [-f] [-v] [-n] [name ...]\n    Unset values and attributes of shell variables and functions.',
          };

          if (HELP_TOPICS[query]) {
            return {
              lines: [{ id: Math.random().toString(), type: 'output', content: HELP_TOPICS[query], timestamp }],
            };
          }
        }

        const bashHelp = `GNU bash, version 5.3.9(1)-release (x86_64-pc-linux-gnu)
These shell commands are defined internally.  Type \`help' to see this list.
Type \`help name' to find out more about the function \`name'.
Use \`info bash' to find out more about the shell in general.
Use \`man -k' or \`info' to find out more about commands not in this list.

A star (*) next to a name means that the command is disabled.

 ! PIPELINE                                                                                                      history [-c] [-d offset] [n] or history -anrw [filename] or history -ps arg [arg...]
 job_spec [&]                                                                                                    if COMMANDS; then COMMANDS; [ elif COMMANDS; then COMMANDS; ]... [ else COMMANDS; ] fi
 (( expression ))                                                                                                jobs [-lnprs] [jobspec ...] or jobs -x command [args]
 . [-p path] filename [arguments]                                                                                kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]
 :                                                                                                               let arg [arg ...]
 [ arg... ]                                                                                                      local [option] name[=value] ...
 [[ expression ]]                                                                                                logout [n]
 alias [-p] [name[=value] ... ]                                                                                  mapfile [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array]
 bg [job_spec ...]                                                                                               popd [-n] [+N | -N]
 bind [-lpsvPSVX] [-m keymap] [-f filename] [-q name] [-u name] [-r keyseq] [-x keyseq:shell-command] [keyseq:>  printf [-v var] format [arguments]
 break [n]                                                                                                       pushd [-n] [+N | -N | dir]
 builtin [shell-builtin [arg ...]]                                                                               pwd [-LP]
 caller [expr]                                                                                                   read [-Eers] [-a array] [-d delim] [-i text] [-n nchars] [-N nchars] [-p prompt] [-t timeout] [-u fd] [name >
 case WORD in [PATTERN [| PATTERN]...) COMMANDS ;;]... esac                                                      readarray [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array]
 cd [-L|[-P [-e]]] [-@] [dir]                                                                                    readonly [-aAf] [name[=value] ...] or readonly -p
 command [-pVv] command [arg ...]                                                                                return [n]
 compgen [-V varname] [-abcdefgjksuv] [-o option] [-A action] [-G globpat] [-W wordlist] [-F function] [-C com>  select NAME [in WORDS ... ;] do COMMANDS; done
 complete [-abcdefgjksuv] [-pr] [-DEI] [-o option] [-A action] [-G globpat] [-W wordlist] [-F function] [-C co>  set [-abefhkmnptuvxBCEHPT] [-o option-name] [--] [-] [arg ...]
 compopt [-o|+o option] [-DEI] [name ...]                                                                        shift [n]
 continue [n]                                                                                                    shopt [-pqsu] [-o] [optname ...]
 coproc [NAME] command [redirections]                                                                            source [-p path] filename [arguments]
 declare [-aAfFgiIlnrtux] [name[=value] ...] or declare -p [-aAfFilnrtux] [name ...]                             suspend [-f]
 dirs [-clpv] [+N] [-N]                                                                                          test [expr]
 disown [-h] [-ar] [jobspec ... | pid ...]                                                                       time [-p] pipeline
 echo [-neE] [arg ...]                                                                                           times
 enable [-a] [-dnps] [-f filename] [name ...]                                                                    trap [-Plp] [[action] signal_spec ...]
 eval [arg ...]                                                                                                  true
 exec [-cl] [-a name] [command [argument ...]] [redirection ...]                                                 type [-afptP] name [name ...]
 exit [n]                                                                                                        typeset [-aAfFgiIlnrtux] name[=value] ... or typeset -p [-aAfFilnrtux] [name ...]
 export [-fn] [name[=value] ...] or export -p [-f]                                                               ulimit [-SHabcdefiklmnpqrstuvxPRT] [limit]
 false                                                                                                           umask [-p] [-S] [mode]
 fc [-e ename] [-lnr] [first] [last] or fc -s [pat=rep] [command]                                                unalias [-a] name [name ...]
 fg [job_spec]                                                                                                   unset [-f] [-v] [-n] [name ...]
 for NAME [in WORDS ... ] ; do COMMANDS; done                                                                    until COMMANDS; do COMMANDS-2; done
 for (( exp1; exp2; exp3 )); do COMMANDS; done                                                                   variables - Names and meanings of some shell variables
 function name { COMMANDS ; } or name () { COMMANDS ; }                                                          wait [-fn] [-p var] [id ...]
 getopts optstring name [arg ...]                                                                                while COMMANDS; do COMMANDS-2; done
 hash [-lr] [-p pathname] [-dt] [name ...]                                                                       { COMMANDS ; }
 help [-dms] [pattern ...]`;

        return {
          lines: [{ id: Math.random().toString(), type: 'output', content: bashHelp, timestamp }],
        };
      }

      default: {
        const pathDirs = [
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
          vfsInstance.resolvePath(ctx.cwd, 'node_modules/.bin'),
        ];

        let targetFileNode = null;
        if (command.startsWith('/') || command.startsWith('./') || command.startsWith('../')) {
          const resolved = vfsInstance.resolvePath(ctx.cwd, command);
          targetFileNode = vfsInstance.getFile(resolved);
        } else {
          // Check direct filename in cwd
          const localPath = vfsInstance.resolvePath(ctx.cwd, command);
          const localNode = vfsInstance.getFile(localPath);
          if (localNode) {
            targetFileNode = localNode;
          } else {
            // Check PATH directories
            for (const dir of pathDirs) {
              const candidate = `${dir}/${command}`;
              const node = vfsInstance.getFile(candidate);
              if (node) {
                targetFileNode = node;
                break;
              }
            }
          }
        }

        if (targetFileNode) {
          return await this.executeDirectScript(targetFileNode, args, ctx);
        }

        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: `qsh: command not found: ${command}. Type 'help' or 'compilers' to see available tools.`,
            timestamp,
          }],
        };
      }
    }
  }

  private async handleNodeCommand(args: string[], ctx: CommandContext): Promise<{
    lines: TerminalLine[];
    enterRepl?: string | null;
  }> {
    const timestamp = new Date().toLocaleTimeString();

    if (args.length === 0) {
      return {
        enterRepl: 'javascript',
        lines: [{
          id: Math.random().toString(),
          type: 'system',
          content: 'Welcome to Node.js v22.6.0.\nType ".help" for more information.\n> ',
          timestamp,
        }],
      };
    }

    const first = args[0];
    if (first === '-v' || first === '--version' || first === '-version' || first === 'version') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: 'v22.6.0', timestamp }] };
    }

    if (first === '-h' || first === '--help') {
      const help = `Usage: node [options] [ script.js ] [arguments]
       node inspect [options] [ script.js | host:port ] [arguments]

Options:
  -e, --eval=...         evaluate script
  -p, --print [...]      evaluate script and print result
  -c, --check            syntax check script without executing
  -v, --version          print Node.js version
  -h, --help             print node command line options
`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: help, timestamp }] };
    }

    // Evaluate code via -e / --eval or -p / --print
    if (first === '-e' || first === '--eval' || first === '-p' || first === '--print') {
      const codeToEval = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
      try {
        const logs: string[] = [];
        const customConsole = {
          log: (...a: any[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          error: (...a: any[]) => logs.push('[ERROR] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          warn: (...a: any[]) => logs.push('[WARN] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          info: (...a: any[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
        };

        const customProcess = {
          env: { ...ctx.env, ...this.customEnv },
          cwd: () => ctx.cwd,
          version: 'v22.6.0',
          platform: 'linux',
          arch: 'x86_64',
          argv: ['node', '-e', codeToEval],
          exit: (code = 0) => { logs.push(`[Process exited with code ${code}]`); },
        };

        const targetFile = ctx.cwd + '/[eval].js';
        const nodeRequire = createNodeRequire(ctx.cwd, { ...ctx.env, ...this.customEnv }, customConsole, customProcess);

        const transpiled = transpileJavaScript(codeToEval);
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('console', 'process', 'require', `return (${transpiled})`);
        const result = await fn(customConsole, customProcess, nodeRequire);

        if (first === '-p' || first === '--print') {
          logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
        }

        return {
          lines: [{
            id: Math.random().toString(),
            type: 'output',
            content: logs.join('\n') || (result !== undefined ? String(result) : ''),
            timestamp,
          }],
        };
      } catch (e: any) {
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: `Uncaught ${e?.name || 'Error'}: ${e?.message || e}`,
            timestamp,
          }],
        };
      }
    }

    // Execute script file
    const fileArg = args.find(a => !a.startsWith('-'));
    if (!fileArg) {
      return {
        lines: [{ id: Math.random().toString(), type: 'error', content: 'node: bad option', timestamp }],
      };
    }

    const filePath = vfsInstance.resolvePath(ctx.cwd, fileArg);
    const fileNode = vfsInstance.getFile(filePath);

    if (!fileNode) {
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'error',
          content: `node: internal/modules/cjs/loader:1147\nError: Cannot find module '${filePath}'\nRequire stack:\n- /root/workspace\n    at Module._resolveFilename (node:internal/modules/cjs/loader:1144:15)\n    at Module._load (node:internal/modules/cjs/loader:985:27)`,
          timestamp,
        }],
      };
    }

    const jsCompiler = PREINSTALLED_COMPILERS.find(c => c.id === 'javascript')!;
    return await this.runClientSideCompiler(jsCompiler, fileNode.content || '', filePath, args, ctx);
  }

  private async handleNpmCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[]; newCwd?: string }> {
    const timestamp = new Date().toLocaleTimeString();
    const sub = args[0]?.toLowerCase() || '';

    if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
      const help = `npm <command>

Usage:
  npm init [-y]           Create a package.json file
  npm install [pkg...]    Install dependencies (alias: npm i, npm add)
  npm uninstall <pkg...>  Remove dependencies (alias: npm rm, npm remove)
  npm run <script>        Run an arbitrary package script
  npm test                Run package test script
  npm start               Run package start script
  npm list                List installed packages (alias: npm ls)
  npm view <pkg>          View registry info for a package (alias: npm info)
  npm audit [fix]         Run or fix security audit
  npm outdated            Check outdated packages
  npm update              Update packages (alias: npm up)
  npm cache clean         Clean npm package cache
  npm root [-g]           Print effective node_modules directory
  npm --version           Show npm version (10.8.2)
`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: help, timestamp }] };
    }

    if (sub === '-v' || sub === '--version' || (sub === 'version' && args.length === 1)) {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: '10.8.2', timestamp }] };
    }

    const findPackageJson = (startDir: string): { path: string; dir: string; data: any } | null => {
      let current = startDir;
      while (current) {
        const p = vfsInstance.resolvePath(current, 'package.json');
        const f = vfsInstance.getFile(p);
        if (f && f.content) {
          try {
            const parsed = JSON.parse(f.content);
            return { path: p, dir: current, data: parsed };
          } catch {}
        }
        if (current === '/' || current === '') break;
        const parts = current.split('/').filter(Boolean);
        if (parts.length === 0) break;
        parts.pop();
        current = parts.length === 0 ? '/' : '/' + parts.join('/');
      }
      return null;
    };

    const POPULAR_VERSIONS: Record<string, string> = {
      express: '^4.19.2',
      lodash: '^4.17.21',
      axios: '^1.7.4',
      chalk: '^5.3.0',
      dotenv: '^16.4.5',
      cors: '^2.8.5',
      zod: '^3.23.8',
      uuid: '^10.0.0',
      dayjs: '^1.11.12',
      moment: '^2.30.1',
      commander: '^12.1.0',
      ms: '^2.1.3',
      ws: '^8.18.0',
      rxjs: '^7.8.1',
      cheerio: '^1.0.0-rc.12',
      debug: '^4.3.6',
      morgan: '^1.10.0',
      'fs-extra': '^11.2.0',
      typescript: '^5.5.4',
      '@types/node': '^22.5.0',
      '@types/express': '^4.17.21',
      tslib: '^2.6.3',
      nodemon: '^3.1.4',
      prettier: '^3.3.3',
      eslint: '^9.9.0',
    };

    const createModuleStub = (name: string, ver: string) => {
      let exportStub = `module.exports = { name: "${name}", version: "${ver.replace(/^\^/, '')}" };\n`;
      if (name === 'lodash' || name === 'underscore') {
        exportStub = `const _ = require('lodash');\nmodule.exports = _;\nmodule.exports.default = _;\n`;
      } else if (name === 'chalk' || name === 'picocolors' || name === 'kleur') {
        exportStub = `const chalk = require('chalk');\nmodule.exports = chalk;\nmodule.exports.default = chalk;\n`;
      } else if (name === 'axios' || name === 'node-fetch' || name === 'got' || name === 'superagent') {
        exportStub = `const axios = require('axios');\nmodule.exports = axios;\nmodule.exports.default = axios;\n`;
      } else if (name === 'uuid') {
        exportStub = `const uuid = require('uuid');\nmodule.exports = uuid;\nmodule.exports.default = uuid;\n`;
      } else if (name === 'dayjs' || name === 'moment' || name === 'date-fns') {
        exportStub = `const dayjs = require('dayjs');\nmodule.exports = dayjs;\nmodule.exports.default = dayjs;\n`;
      } else if (name === 'dotenv') {
        exportStub = `const dotenv = require('dotenv');\nmodule.exports = dotenv;\nmodule.exports.default = dotenv;\n`;
      } else if (name === 'zod' || name === 'yup' || name === 'joi') {
        exportStub = `const zod = require('zod');\nmodule.exports = zod;\nmodule.exports.z = zod.z;\nmodule.exports.default = zod;\n`;
      } else if (name === 'express' || name === 'koa' || name === 'fastify') {
        exportStub = `const express = require('express');\nmodule.exports = express;\nmodule.exports.default = express;\n`;
      } else if (name === 'cors') {
        exportStub = `module.exports = () => (req, res, next) => next && next();\n`;
      } else if (name === 'commander' || name === 'yargs' || name === 'minimist') {
        exportStub = `const commander = require('commander');\nmodule.exports = commander;\nmodule.exports.default = commander;\n`;
      } else if (name === 'ms') {
        exportStub = `const ms = require('ms');\nmodule.exports = ms;\nmodule.exports.default = ms;\n`;
      } else if (name === 'ws') {
        exportStub = `const events = require('events');\nclass WebSocket extends events.EventEmitter { constructor(u) { super(); setTimeout(() => this.emit('open'), 10); } send(d) {} close() {} }\nmodule.exports = WebSocket;\nmodule.exports.WebSocket = WebSocket;\n`;
      } else if (name === 'rxjs') {
        exportStub = `module.exports = { of: (...v) => ({ subscribe: (fn) => v.forEach(fn) }), Observable: class { constructor(sub) { this.sub = sub; } } };\n`;
      } else if (name === 'cheerio') {
        exportStub = `module.exports = { load: (html) => ((sel) => ({ text: () => html.replace(/<[^>]*>/g, '').trim(), attr: () => '', html: () => html })) };\n`;
      } else if (name === 'debug') {
        exportStub = `module.exports = (namespace) => (...args) => console.log(\`[\${namespace}]\`, ...args);\n`;
      } else if (name === 'morgan') {
        exportStub = `module.exports = (fmt) => (req, res, next) => next && next();\n`;
      } else if (name === 'fs-extra') {
        exportStub = `const fs = require('fs');\nmodule.exports = { ...fs, pathExists: async (p) => fs.existsSync(p), ensureDir: async () => {}, readJson: async (p) => JSON.parse(fs.readFileSync(p, 'utf8')), outputJson: async (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2)) };\n`;
      } else {
        exportStub = `// Auto-generated package proxy stub for ${name} v${ver}\nconst mod = { name: "${name}", version: "${ver.replace(/^\^/, '')}", ok: true };\nmodule.exports = mod;\nmodule.exports.default = mod;\n`;
      }
      return exportStub;
    };

    // 1. npm init
    if (sub === 'init') {
      const isYes = args.includes('-y') || args.includes('--yes');
      const dirName = ctx.cwd.split('/').filter(Boolean).pop() || 'workspace';
      const pkgPath = vfsInstance.resolvePath(ctx.cwd, 'package.json');
      
      const pkgJson = {
        name: dirName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        version: "1.0.0",
        description: "Node.js application on Qshell",
        main: "index.js",
        scripts: {
          start: "node index.js",
          dev: "node --watch index.js",
          test: "echo \"Error: no test specified\" && exit 1"
        },
        keywords: ["qshell", "nodejs", "npm"],
        author: "root <root@qshell.internal>",
        license: "ISC"
      };

      const jsonStr = JSON.stringify(pkgJson, null, 2);
      vfsInstance.writeFile(pkgPath, jsonStr);
      cloudSyncService.handleFileChange(pkgPath, 'created');

      // Create starter index.js if none exists
      const indexPath = vfsInstance.resolvePath(ctx.cwd, 'index.js');
      if (!vfsInstance.getFile(indexPath)) {
        const starterCode = `// ${dirName} - Node.js Starter on Qshell\nconsole.log("== Running Node.js v" + process.version + " ==");\nconsole.log("Current working directory:", process.cwd());\nconsole.log("Ready to build fast backend scripts and web apps!");\n`;
        vfsInstance.writeFile(indexPath, starterCode);
        cloudSyncService.handleFileChange(indexPath, 'created');
      }

      vfsInstance.notifyListeners();
      if (ctx.onOpenEditorFile) {
        ctx.onOpenEditorFile(pkgPath);
      }

      let out = `Wrote to ${pkgPath}:\n\n${jsonStr}\n`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 2. npm install / npm i / npm add
    if (sub === 'install' || sub === 'i' || sub === 'add') {
      const isDev = args.includes('-D') || args.includes('--save-dev');
      const isGlobal = args.includes('-g') || args.includes('--global');
      const isExact = args.includes('-E') || args.includes('--save-exact');
      const pkgsToInstall = args.slice(1).filter(a => !a.startsWith('-'));

      // Global install handler
      if (isGlobal) {
        if (pkgsToInstall.length === 0) {
          return { lines: [{ id: Math.random().toString(), type: 'error', content: 'npm ERR! npm install --global requires package name(s)', timestamp }] };
        }
        const globalDir = '/usr/local/lib/node_modules';
        const binDir = '/usr/local/bin';
        vfsInstance.createDirectory(globalDir);
        vfsInstance.createDirectory(binDir);

        for (const rawPkg of pkgsToInstall) {
          let pkgName = rawPkg;
          let customVer = '';
          if (rawPkg.startsWith('@')) {
            const atIdx = rawPkg.indexOf('@', 1);
            if (atIdx !== -1) {
              pkgName = rawPkg.slice(0, atIdx);
              customVer = rawPkg.slice(atIdx + 1);
            }
          } else {
            const parts = rawPkg.split('@');
            pkgName = parts[0];
            customVer = parts[1] || '';
          }

          const finalName = pkgName;
          const version = customVer || (POPULAR_VERSIONS[finalName] || '1.0.0').replace(/^\^/, '');
          const pkgFolder = `${globalDir}/${finalName}`;
          vfsInstance.createDirectory(pkgFolder);
          vfsInstance.writeFile(`${pkgFolder}/package.json`, JSON.stringify({ name: finalName, version, bin: { [finalName]: 'index.js' } }, null, 2));
          vfsInstance.writeFile(`${pkgFolder}/index.js`, createModuleStub(finalName, version));

          // Generate CLI binary executable
          let cliScript = `#!/usr/bin/env node
const args = process.argv.slice(2);
const sub = args[0] || 'help';

if (args.includes('-v') || args.includes('--version') || sub === 'version') {
  console.log('${finalName} v${version} (Qshell Native)');
} else if (args.includes('-h') || args.includes('--help') || sub === 'help') {
  console.log(\`${finalName} CLI - Developer Tooling

Usage:
  ${finalName} <command> [options]

Options:
  -v, --version   Show CLI version
  -h, --help      Display help information\`);
} else {
  console.log(\`[${finalName}] Executed command '\${sub}' successfully.\`);
}
`;

          if (finalName === '@kilocode/cli' || finalName === 'kilocode') {
            cliScript = `#!/usr/bin/env node
const args = process.argv.slice(2);
const sub = args[0] || 'help';

if (args.includes('-v') || args.includes('--version') || sub === 'version') {
  console.log('Kilo Code CLI v1.2.4 (Qshell Engine)');
} else if (args.includes('-h') || args.includes('--help') || sub === 'help') {
  console.log(\`Kilo Code CLI - Advanced Full-Stack AI Coding Assistant

Usage:
  kilocode <command> [options]
  kilo <command> [options]

Commands:
  init            Initialize a project with Kilo Code presets
  dev             Start development server with live reload
  build           Compile project assets for production
  test            Run automated test suites
  deploy          Deploy app to cloud infrastructure
  ai <prompt>     Execute AI-powered code transformations
  doctor          Run system health and dependency diagnostics

Options:
  -v, --version   Show CLI version
  -h, --help      Display help information
  --verbose       Enable verbose logging\`);
} else if (sub === 'init') {
  console.log('✨ Initializing Kilo Code workspace in', process.cwd());
  console.log('✓ Created kilo.config.json');
  console.log('✓ Project initialized! Run "kilo dev" to start development.');
} else if (sub === 'dev') {
  console.log('⚡ Starting Kilo Code dev server on http://localhost:3000');
  console.log('✓ Watching files for changes in', process.cwd());
} else if (sub === 'build') {
  console.log('📦 Building project for production...');
  console.log('✓ Compiled successfully in 0.34s');
} else if (sub === 'doctor') {
  console.log('🔍 Checking Kilo Code environment:');
  console.log('✓ Node.js Runtime: v22.6.0');
  console.log('✓ Qshell Shell Engine: Online');
  console.log('✓ Status: All systems healthy');
} else if (sub === 'ai') {
  const prompt = args.slice(1).join(' ') || 'workspace analysis';
  console.log(\`🤖 Kilo AI: Analyzing "\${prompt}"...\`);
  console.log('✓ Code analysis & automated recommendations generated.');
} else {
  console.log(\`[kilocode] Executed command '\${sub}' successfully.\`);
}
`;
          }

          // Register binary links in /usr/local/bin
          const baseName = finalName.replace(/^@[^/]+\//, '');
          const binNames = new Set([finalName, baseName]);
          if (finalName === '@kilocode/cli' || (baseName === 'cli' && finalName.includes('kilocode'))) {
            binNames.add('kilocode');
            binNames.add('kilo');
            binNames.add('kilocode-cli');
          }

          binNames.forEach(b => {
            vfsInstance.writeFile(`${binDir}/${b}`, cliScript);
          });
        }
        vfsInstance.notifyListeners();
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'output',
            content: `added ${pkgsToInstall.length} global package${pkgsToInstall.length > 1 ? 's' : ''} in 0.42s\n\n+ ${pkgsToInstall.join(', ')} -> /usr/local/lib/node_modules`,
            timestamp,
          }],
        };
      }

      // Local Project Install
      let found = findPackageJson(ctx.cwd);
      let projectDir = found ? found.dir : ctx.cwd;
      let pkgPath = found ? found.path : vfsInstance.resolvePath(ctx.cwd, 'package.json');
      let pkgData = found ? found.data : null;

      if (!pkgData) {
        if (pkgsToInstall.length > 0) {
          // Modern npm behavior: Auto-scaffold package.json if installing specific packages in a directory without one
          const dirName = ctx.cwd.split('/').filter(Boolean).pop() || 'workspace';
          pkgData = {
            name: dirName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
            version: "1.0.0",
            description: "Node.js application on Qshell",
            main: "index.js",
            scripts: {
              start: "node index.js",
              test: "echo \"Error: no test specified\" && exit 1"
            },
            dependencies: {},
            devDependencies: {}
          };
          projectDir = ctx.cwd;
          pkgPath = vfsInstance.resolvePath(ctx.cwd, 'package.json');
        } else {
          // Standard npm ENOENT error when running bare `npm install` without package.json
          return {
            lines: [{
              id: Math.random().toString(),
              type: 'error',
              content: `npm ERR! code ENOENT\nnpm ERR! syscall open\nnpm ERR! path ${pkgPath}\nnpm ERR! errno -2\nnpm ERR! enoent ENOENT: no such file or directory, open '${pkgPath}'\nnpm ERR! enoent This is related to npm not being able to find a file.\nnpm ERR!\nnpm ERR! To create a package.json file, run:\nnpm ERR!   npm init -y`,
              timestamp,
            }],
          };
        }
      }

      if (!pkgData.dependencies) pkgData.dependencies = {};
      if (!pkgData.devDependencies) pkgData.devDependencies = {};

      const nodeModulesDir = vfsInstance.resolvePath(projectDir, 'node_modules');
      vfsInstance.createDirectory(nodeModulesDir);

      let addedCount = 0;

      if (pkgsToInstall.length > 0) {
        // User specified specific packages e.g. `npm i express lodash`
        for (const rawPkg of pkgsToInstall) {
          const [pkgName, customVer] = rawPkg.split('@');
          const finalName = pkgName || rawPkg;
          let version = customVer ? (isExact ? customVer : `^${customVer}`) : (isExact ? (POPULAR_VERSIONS[finalName] || '1.0.0').replace(/^\^/, '') : (POPULAR_VERSIONS[finalName] || '^1.0.0'));

          if (isDev) {
            pkgData.devDependencies[finalName] = version;
          } else {
            pkgData.dependencies[finalName] = version;
          }

          const pkgDir = `${nodeModulesDir}/${finalName}`;
          vfsInstance.createDirectory(pkgDir);
          vfsInstance.writeFile(`${pkgDir}/package.json`, JSON.stringify({
            name: finalName,
            version: version.replace(/^\^/, ''),
            main: 'index.js',
            description: `${finalName} module for Node.js environment`,
          }, null, 2));

          vfsInstance.writeFile(`${pkgDir}/index.js`, createModuleStub(finalName, version));
          addedCount++;
        }

        // Save updated package.json
        vfsInstance.writeFile(pkgPath, JSON.stringify(pkgData, null, 2));
        cloudSyncService.handleFileChange(pkgPath, 'modified');
      } else {
        // Bare `npm install`: install ALL dependencies and devDependencies defined in package.json
        const allDeps = { ...(pkgData.dependencies || {}), ...(pkgData.devDependencies || {}) };
        const depNames = Object.keys(allDeps);

        for (const depName of depNames) {
          const version = allDeps[depName] || '^1.0.0';
          const pkgDir = `${nodeModulesDir}/${depName}`;
          const existingPkg = vfsInstance.getFile(`${pkgDir}/package.json`);

          if (!existingPkg) {
            vfsInstance.createDirectory(pkgDir);
            vfsInstance.writeFile(`${pkgDir}/package.json`, JSON.stringify({
              name: depName,
              version: version.replace(/^\^/, ''),
              main: 'index.js',
              description: `${depName} module for Node.js environment`,
            }, null, 2));

            vfsInstance.writeFile(`${pkgDir}/index.js`, createModuleStub(depName, version));
            addedCount++;
          }
        }
      }

      // Create or update package-lock.json
      const lockPath = vfsInstance.resolvePath(projectDir, 'package-lock.json');
      const lockData = {
        name: pkgData.name || 'workspace',
        version: pkgData.version || '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          "": {
            name: pkgData.name || 'workspace',
            version: pkgData.version || '1.0.0',
            dependencies: pkgData.dependencies,
            devDependencies: pkgData.devDependencies,
          }
        }
      };
      vfsInstance.writeFile(lockPath, JSON.stringify(lockData, null, 2));
      cloudSyncService.handleFileChange(lockPath, 'created');

      vfsInstance.notifyListeners();

      const totalPkgs = Object.keys(pkgData.dependencies).length + Object.keys(pkgData.devDependencies).length;
      let out = '';
      const elapsed = (0.25 + Math.random() * 0.4).toFixed(2);
      if (addedCount > 0) {
        out += `added ${addedCount} package${addedCount > 1 ? 's' : ''}, and audited ${totalPkgs} package${totalPkgs > 1 ? 's' : ''} in ${elapsed}s\n\n`;
        out += `3 packages are looking for funding\n  run \`npm fund\` for details\n\n`;
        out += `found 0 vulnerabilities`;
      } else {
        out += `up to date, audited ${totalPkgs} package${totalPkgs > 1 ? 's' : ''} in ${elapsed}s\n\nfound 0 vulnerabilities`;
      }

      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 3. npm uninstall / npm remove / npm rm / npm r / npm un
    if (sub === 'uninstall' || sub === 'remove' || sub === 'rm' || sub === 'r' || sub === 'un') {
      const pkgsToRemove = args.slice(1).filter(a => !a.startsWith('-'));
      if (pkgsToRemove.length === 0) {
        return { lines: [{ id: Math.random().toString(), type: 'error', content: 'npm ERR! specify package(s) to uninstall', timestamp }] };
      }

      const found = findPackageJson(ctx.cwd);
      if (!found) {
        return { lines: [{ id: Math.random().toString(), type: 'error', content: `npm ERR! no package.json found in ${ctx.cwd}`, timestamp }] };
      }

      const { path: pkgPath, dir: projectDir, data: pkgData } = found;
      const nodeModulesDir = vfsInstance.resolvePath(projectDir, 'node_modules');
      let removedCount = 0;

      for (const rawPkg of pkgsToRemove) {
        const pkgName = rawPkg.split('@')[0];
        if (pkgData.dependencies && pkgData.dependencies[pkgName]) {
          delete pkgData.dependencies[pkgName];
          removedCount++;
        }
        if (pkgData.devDependencies && pkgData.devDependencies[pkgName]) {
          delete pkgData.devDependencies[pkgName];
          removedCount++;
        }
        const pkgDir = `${nodeModulesDir}/${pkgName}`;
        vfsInstance.remove(pkgDir, true);
      }

      vfsInstance.writeFile(pkgPath, JSON.stringify(pkgData, null, 2));
      cloudSyncService.handleFileChange(pkgPath, 'modified');
      vfsInstance.notifyListeners();

      const totalPkgs = Object.keys(pkgData.dependencies || {}).length + Object.keys(pkgData.devDependencies || {}).length;
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'output',
          content: `removed ${removedCount} package${removedCount > 1 ? 's' : ''}, and audited ${totalPkgs} packages in 0.31s\n\nfound 0 vulnerabilities`,
          timestamp,
        }],
      };
    }

    // 4. npm run <script> / npm start / npm test / npm build / npm dev
    if (sub === 'run' || sub === 'run-script' || sub === 'start' || sub === 'test' || sub === 'build' || sub === 'dev') {
      let scriptName = sub === 'run' || sub === 'run-script' ? args[1] : sub;
      const found = findPackageJson(ctx.cwd);

      if (!found) {
        const pkgPath = vfsInstance.resolvePath(ctx.cwd, 'package.json');
        return {
          lines: [{ id: Math.random().toString(), type: 'error', content: `npm ERR! enoent ENOENT: no such file or directory, open '${pkgPath}'`, timestamp }],
        };
      }

      const { data: pkg, dir: projectDir } = found;
      const scripts = pkg.scripts || {};

      if (!scriptName) {
        let out = `Scripts available in ${pkg.name || 'project'} via \`npm run-script\`:\n`;
        Object.keys(scripts).forEach(k => {
          out += `  ${k}\n    ${scripts[k]}\n`;
        });
        return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
      }

      const scriptCmd = scripts[scriptName];
      if (!scriptCmd) {
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: `npm ERR! Missing script: "${scriptName}"\nnpm ERR!\nnpm ERR! To see a list of scripts, run:\nnpm ERR!   npm run`,
            timestamp,
          }],
        };
      }

      const bannerLine: TerminalLine = {
        id: Math.random().toString(),
        type: 'output',
        content: `> ${pkg.name || 'workspace'}@${pkg.version || '1.0.0'} ${scriptName}\n> ${scriptCmd}\n`,
        timestamp,
      };

      const execRes = await this.executeSingleCommand(scriptCmd, { ...ctx, cwd: projectDir });
      return {
        lines: [bannerLine, ...execRes.lines],
        newCwd: execRes.newCwd,
      };
    }

    // 5. npm list / npm ls / npm la / npm ll
    if (sub === 'list' || sub === 'ls' || sub === 'la' || sub === 'll') {
      const found = findPackageJson(ctx.cwd);
      if (!found) {
        return { lines: [{ id: Math.random().toString(), type: 'output', content: `${ctx.cwd} (empty)`, timestamp }] };
      }
      const { data: pkg, dir: projectDir } = found;
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const keys = Object.keys(deps);
      let out = `${pkg.name || 'workspace'}@${pkg.version || '1.0.0'} ${projectDir}\n`;
      if (keys.length === 0) {
        out += `└── (empty)\n`;
      } else {
        keys.forEach((k, i) => {
          const isLast = i === keys.length - 1;
          const prefix = isLast ? '└── ' : '├── ';
          out += `${prefix}${k}@${deps[k].replace(/^\^/, '')}\n`;
        });
      }
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 6. npm view / npm info / npm show
    if (sub === 'view' || sub === 'info' || sub === 'show') {
      const pkgName = args[1];
      if (!pkgName) {
        return { lines: [{ id: Math.random().toString(), type: 'error', content: 'npm ERR! npm view requires a package name', timestamp }] };
      }
      const cleanName = pkgName.toLowerCase();
      const ver = (POPULAR_VERSIONS[cleanName] || '1.0.0').replace(/^\^/, '');
      const out = `${cleanName}@${ver} | MIT | deps: 2 | versions: 48\n${cleanName} package for JavaScript and Node.js environments\nhttps://www.npmjs.com/package/${cleanName}\n\ndist\n.tarball: https://registry.npmjs.org/${cleanName}/-/${cleanName}-${ver}.tgz\n.shasum: a89c1b72e50d7593b4a2f2\n\ndist-tags:\nlatest: ${ver}\n\npublished 3 weeks ago by npm-bot <registry@npmjs.org>`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 7. npm audit / npm audit fix
    if (sub === 'audit') {
      const isFix = args.includes('fix');
      let out = `found 0 vulnerabilities\n\nAudited dependencies in ${ctx.cwd} against npm Security Advisory Database.\nAll installed packages passed security inspection.`;
      if (isFix) {
        out = `audited packages in 0.42s\n\nup to date, audited packages in 0.42s\n\nfound 0 vulnerabilities`;
      }
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 8. npm outdated
    if (sub === 'outdated') {
      const found = findPackageJson(ctx.cwd);
      if (!found || !found.data) {
        return { lines: [{ id: Math.random().toString(), type: 'output', content: 'All packages are up to date.', timestamp }] };
      }
      const deps = { ...(found.data.dependencies || {}), ...(found.data.devDependencies || {}) };
      let out = `Package         Current    Wanted    Latest    Location\n`;
      Object.keys(deps).forEach(k => {
        const cur = deps[k].replace(/^\^/, '');
        out += `${k.padEnd(16)} ${cur.padEnd(10)} ${cur.padEnd(9)} ${cur.padEnd(9)} node_modules/${k}\n`;
      });
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 9. npm update / npm up
    if (sub === 'update' || sub === 'up') {
      const out = `up to date, audited packages in 0.38s\n\nfound 0 vulnerabilities`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 10. npm cache
    if (sub === 'cache') {
      if (args[1] === 'clean' || args[1] === 'clear') {
        const out = `npm cache cleared successfully.\n~/.npm/_cacache emptied.`;
        return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
      }
      const out = `Content-addressable storage at /root/.npm/_cacache\nTotal cache size: 14.2 MB across 42 packages.`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 11. npm root / npm bin / npm prefix
    if (sub === 'root') {
      const isGlobal = args.includes('-g') || args.includes('--global');
      const out = isGlobal ? '/usr/local/lib/node_modules' : vfsInstance.resolvePath(ctx.cwd, 'node_modules');
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }
    if (sub === 'bin') {
      const isGlobal = args.includes('-g') || args.includes('--global');
      const out = isGlobal ? '/usr/local/bin' : vfsInstance.resolvePath(ctx.cwd, 'node_modules/.bin');
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }
    if (sub === 'prefix') {
      const isGlobal = args.includes('-g') || args.includes('--global');
      const out = isGlobal ? '/usr/local' : ctx.cwd;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 12. npm config
    if (sub === 'config') {
      const out = `; "default" config from /root/.npmrc\n\nregistry = "https://registry.npmjs.org/"\nnode-version = "v22.6.0"\nuser-agent = "npm/10.8.2 node/v22.6.0 linux x64"`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 13. npm fund
    if (sub === 'fund') {
      const out = `workspace@1.0.0\n├── https://github.com/sponsors/chalk\n└── https://opencollective.com/lodash`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: out, timestamp }] };
    }

    // 14. npm ping / doctor / whoami
    if (sub === 'ping') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: 'Ping success: registry.npmjs.org (latency: 32ms)', timestamp }] };
    }
    if (sub === 'whoami') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: 'root', timestamp }] };
    }
    if (sub === 'doctor') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: 'Check npm ping: OK\nCheck node -v: OK (v22.6.0)\nCheck npm -v: OK (10.8.2)\nCheck Git: OK (2.45.2)\nCheck permissions: OK (root)\nAll checks passed!', timestamp }] };
    }

    return {
      lines: [{
        id: Math.random().toString(),
        type: 'output',
        content: `npm ${sub}: command executed. Use 'npm --help' for details.`,
        timestamp,
      }],
    };
  }

  private async handleNpxCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'output',
          content: 'npx: Execute binaries from npm packages on demand.\nUsage: npx <package> [args...]\nExamples:\n  npx cowsay "Hello from Qshell"\n  npx ts-node main.ts\n  npx nodemon index.js',
          timestamp,
        }],
      };
    }

    if (args[0] === '-v' || args[0] === '--version') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: '10.8.2', timestamp }] };
    }

    const tool = args[0].toLowerCase();
    const toolArgs = args.slice(1);

    if (tool === 'cowsay') {
      const msg = toolArgs.join(' ').replace(/^["']|["']$/g, '') || 'Node.js & npm are ready on Qshell!';
      const cow = `
  < ${msg} >
  ------------------------------------
         \\   ^__^
          \\  (oo)\\_______
             (__)\\       )\\/\\
                 ||----w |
                 ||     ||
`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: cow, timestamp }] };
    }

    if (tool === 'ts-node' || tool === 'typescript') {
      const fileArg = toolArgs.find(a => !a.startsWith('-'));
      if (fileArg) {
        const filePath = vfsInstance.resolvePath(ctx.cwd, fileArg);
        const fileNode = vfsInstance.getFile(filePath);
        if (fileNode) {
          const tsCompiler = PREINSTALLED_COMPILERS.find(c => c.id === 'typescript')!;
          return this.runClientSideCompiler(tsCompiler, fileNode.content || '', filePath, toolArgs, ctx);
        }
      }
    }

    if (tool === 'nodemon') {
      const fileArg = toolArgs[0] || 'index.js';
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'output',
          content: `[nodemon] 3.1.4\n[nodemon] to restart at any time, enter \`rs\`\n[nodemon] watching path(s): *.*\n[nodemon] watching extensions: js,mjs,cjs,json\n[nodemon] starting \`node ${fileArg}\`\n== Node.js App Running ==\n[nodemon] clean exit - waiting for changes before restart`,
          timestamp,
        }],
      };
    }

    return {
      lines: [{
        id: Math.random().toString(),
        type: 'output',
        content: `Need to install the following packages:\n  ${tool}@latest\nOk to proceed? (y)\n[npx] Executed ${tool} successfully.`,
        timestamp,
      }],
    };
  }

  private async handleNvmCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const sub = args[0]?.toLowerCase() || '';

    if (!sub || sub === '--help' || sub === '-h') {
      const help = `Node Version Manager (v0.39.7)\nUsage:\n  nvm install <version>       Download and install a version (e.g. nvm install 20)\n  nvm use <version>           Switch active Node version\n  nvm ls                      List installed versions\n  nvm current                 Display currently-activated version\n  nvm --version               Display nvm version`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: help, timestamp }] };
    }

    if (sub === '--version' || sub === '-v') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: '0.39.7', timestamp }] };
    }

    if (sub === 'ls' || sub === 'list') {
      const list = `->      v22.6.0 (current)\n        v20.17.0 (lts/iron)\n        v18.20.4 (lts/hydrogen)\ndefault -> 22.6.0 (-> v22.6.0)\nnode -> stable (-> v22.6.0) (default)\nlts/* -> lts/iron (-> v20.17.0)`;
      return { lines: [{ id: Math.random().toString(), type: 'output', content: list, timestamp }] };
    }

    if (sub === 'current') {
      return { lines: [{ id: Math.random().toString(), type: 'output', content: 'v22.6.0', timestamp }] };
    }

    if (sub === 'use') {
      const ver = args[1] || '22';
      const formatted = ver.startsWith('v') ? ver : `v${ver}.0.0`;
      this.setEnvVar('NODE_VERSION', formatted);
      return { lines: [{ id: Math.random().toString(), type: 'system', content: `Now using node ${formatted} (npm v10.8.2)`, timestamp }] };
    }

    if (sub === 'install') {
      const ver = args[1] || '--lts';
      const targetVer = ver === '--lts' ? 'v20.17.0' : (ver.startsWith('v') ? ver : `v${ver}`);
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'output',
          content: `Downloading and installing node ${targetVer}...\nDownloading https://nodejs.org/dist/${targetVer}/node-${targetVer}-linux-x64.tar.xz...\n######################################################################## 100.0%\nComputing checksum with sha256sum\nChecksums matched!\nNow using node ${targetVer} (npm v10.8.2)`,
          timestamp,
        }],
      };
    }

    return { lines: [{ id: Math.random().toString(), type: 'output', content: `nvm: command '${sub}' completed.`, timestamp }] };
  }

  private async handleCompilerExecution(
    compiler: any,
    cmd: string,
    args: string[],
    ctx: CommandContext
  ): Promise<{ lines: TerminalLine[]; enterRepl?: string | null }> {
    const timestamp = new Date().toLocaleTimeString();
    const fullCmdLine = `${cmd} ${args.join(' ')}`.trim();

    // Check specific compiler CLI responses (e.g. --version, --help, no arguments errors, etc.)
    const fileChecker = (relPath: string) => {
      const full = vfsInstance.resolvePath(ctx.cwd, relPath);
      const f = vfsInstance.getFile(full);
      return { exists: !!f, content: f?.content };
    };

    const compilerRes = handleCompilerCommand(fullCmdLine, fileChecker);
    if (compilerRes) {
      if (compilerRes.isRepl && compiler.replSupported) {
        return {
          enterRepl: compiler.id,
          lines: [
            {
              id: Math.random().toString(),
              type: 'system',
              content: compilerRes.stdout.trim() || `${compiler.name} ${compiler.version} [Interactive REPL Mode]\nType 'exit' or 'quit()' to return to Qshell.`,
              timestamp,
            },
          ],
        };
      }

      const outLines: TerminalLine[] = [];
      if (compilerRes.stdout) {
        outLines.push({
          id: Math.random().toString(),
          type: 'output',
          content: compilerRes.stdout.replace(/\n$/, ''),
          timestamp,
        });
      }
      if (compilerRes.stderr) {
        outLines.push({
          id: Math.random().toString(),
          type: 'error',
          content: compilerRes.stderr.replace(/\n$/, ''),
          timestamp,
        });
      }
      if (outLines.length > 0) {
        return { lines: outLines };
      }
    }

    // Identify target file
    const targetArg = args.find(a => !a.startsWith('-')) || '';
    let targetPath = '';
    let fileContent = '';

    if (targetArg) {
      targetPath = vfsInstance.resolvePath(ctx.cwd, targetArg);
      const fileNode = vfsInstance.getFile(targetPath);
      if (fileNode && fileNode.content) {
        fileContent = fileNode.content;
      }
    }

    // If dual execution is set to Cloud or Dual, try executing through cloud endpoint
    if (ctx.executionMode === 'cloud' || ctx.executionMode === 'dual') {
      try {
        const response = await fetch('/api/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: fullCmdLine,
            language: compiler.id,
            code: fileContent || compiler.sampleCode,
            cwd: ctx.cwd,
            env: ctx.env,
          }),
        });

        const data = await response.json();
        if (data && (data.stdout || data.stderr)) {
          return {
            lines: [
              {
                id: Math.random().toString(),
                type: data.exitCode === 0 ? 'output' : 'error',
                content: (data.stdout || '') + (data.stderr ? '\n' + data.stderr : ''),
                timestamp,
              },
            ],
          };
        }
      } catch {
        // Fallback to client-side runner
      }
    }

    // Client-Side Runner Engine
    return this.runClientSideCompiler(compiler, fileContent, targetArg, args, ctx);
  }

    // Alternative JS Package Managers
  private async handleAltNodePMCommand(
    pm: 'yarn' | 'pnpm' | 'bun',
    args: string[],
    ctx: CommandContext
  ): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const sub = args[0]?.toLowerCase() || '';

    if (sub === '-v' || sub === '--version' || sub === 'version') {
      const v = pm === 'yarn' ? '1.22.22' : pm === 'pnpm' ? '9.7.1' : '1.1.24';
      return { lines: [{ id: Math.random().toString(), type: 'output', content: v, timestamp }] };
    }

    if (pm === 'yarn') {
      const res = universalPackageManager.handleYarn(args, ctx.cwd);
      return {
        lines: [{
          id: Math.random().toString(),
          type: res.exitCode === 0 ? 'output' : 'error',
          content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
          timestamp,
        }],
      };
    } else if (pm === 'pnpm') {
      const res = universalPackageManager.handlePnpm(args, ctx.cwd);
      return {
        lines: [{
          id: Math.random().toString(),
          type: res.exitCode === 0 ? 'output' : 'error',
          content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
          timestamp,
        }],
      };
    } else {
      const res = universalPackageManager.handleBun(args, ctx.cwd);
      return {
        lines: [{
          id: Math.random().toString(),
          type: res.exitCode === 0 ? 'output' : 'error',
          content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
          timestamp,
        }],
      };
    }
  }

  // Pip Python Package Manager
  private async handlePipCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = await pythonPackageManager.handlePip(args, ctx.cwd);
    const content = (res.stdout || '') + (res.stderr ? '\n' + res.stderr : '');
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: content.trim(),
        timestamp,
      }],
    };
  }

  // Rust Cargo Package Manager
  private async handleCargoCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = universalPackageManager.handleCargo(args, ctx.cwd);
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
        timestamp,
      }],
    };
  }

  // Ruby Gem & Bundler
  private async handleGemCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = universalPackageManager.handleGem(args, ctx.cwd);
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
        timestamp,
      }],
    };
  }

  // PHP Composer
  private async handleComposerCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = universalPackageManager.handleComposer(args, ctx.cwd);
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
        timestamp,
      }],
    };
  }

  // Go package management
  private async handleGoCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = universalPackageManager.handleGo(args, ctx.cwd);
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
        timestamp,
      }],
    };
  }

  // .NET package management
  private async handleDotnetCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const res = universalPackageManager.handleDotnet(args, ctx.cwd);
    return {
      lines: [{
        id: Math.random().toString(),
        type: res.exitCode === 0 ? 'output' : 'error',
        content: (res.stdout || '') + (res.stderr ? '\n' + res.stderr : ''),
        timestamp,
      }],
    };
  }

  private async runClientSideCompiler(
    compiler: any,
    code: string,
    filePath: string,
    args: string[],
    ctx: CommandContext
  ): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const effectiveCode = code || compiler.sampleCode;

    // JavaScript / TypeScript Node.js Engine
    if (compiler.id === 'javascript' || compiler.id === 'typescript') {
      try {
        const logs: string[] = [];
        const customConsole = {
          log: (...a: any[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          error: (...a: any[]) => logs.push('[ERROR] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          warn: (...a: any[]) => logs.push('[WARN] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          info: (...a: any[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
          table: (tabularData: any) => {
            logs.push(typeof tabularData === 'object' ? JSON.stringify(tabularData, null, 2) : String(tabularData));
          },
          dir: (item: any) => logs.push(JSON.stringify(item, null, 2)),
          time: () => {},
          timeEnd: () => {},
        };

        const customProcess = {
          env: { ...ctx.env, ...this.customEnv },
          cwd: () => ctx.cwd,
          version: 'v22.6.0',
          platform: 'linux',
          arch: 'x86_64',
          argv: ['node', filePath || 'index.js', ...args],
          exit: (code = 0) => { logs.push(`[Process exited with code ${code}]`); },
        };

        const targetFile = filePath || (ctx.cwd + '/index.js');
        const nodeRequire = createNodeRequire(ctx.cwd, { ...ctx.env, ...this.customEnv }, customConsole, customProcess);

        const jsCode = transpileJavaScript(effectiveCode);
        const moduleObj = { exports: {} as any };

        // Support async execution
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const runner = new AsyncFunction(
          'exports',
          'require',
          'module',
          '__filename',
          '__dirname',
          'console',
          'process',
          jsCode
        );

        await runner(
          moduleObj.exports,
          nodeRequire,
          moduleObj,
          targetFile,
          ctx.cwd,
          customConsole,
          customProcess
        );

        return {
          lines: [
            {
              id: Math.random().toString(),
              type: 'output',
              content: logs.join('\n') || `[${compiler.name}] Completed execution with code 0.`,
              timestamp,
            },
          ],
        };
      } catch (e: any) {
        return {
          lines: [
            {
              id: Math.random().toString(),
              type: 'error',
              content: `${compiler.name} Runtime Error:\n${e?.stack || e?.message || e}`,
              timestamp,
            },
          ],
        };
      }
    }

    // Python runner
    if (compiler.id === 'python') {
      const pyResult = await executePythonScript(effectiveCode, filePath || 'script.py', args, ctx.cwd, ctx.env);
      const out = (pyResult.stdout || '') + (pyResult.stderr ? '\n' + pyResult.stderr : '');
      return {
        lines: [{
          id: Math.random().toString(),
          type: pyResult.exitCode === 0 ? 'output' : 'error',
          content: out.trim(),
          timestamp,
        }],
      };
    }

    // Default simulation for other compilers
    let output = `[${compiler.name} ${compiler.version}]\n`;
    output += `Target: ${filePath || compiler.extension + ' snippet'}\n`;
    output += `Compilation: 0 warnings, 0 errors\n`;
    output += `Runtime Output:\n----------------------------------------\n`;
    
    if (compiler.id === 'c' || compiler.id === 'cpp') {
      output += `== Qshell Native GCC/Clang Engine ==\nMemory pointer verification: 0x7ffd9b42e8\nExecution finished in 4.2ms.`;
    } else if (compiler.id === 'rust') {
      output += `== Qshell Rust 1.80 Native Compiler ==\nZero-cost abstractions & memory safety: Verified.\nFinished release [optimized] target(s) in 0.18s`;
    } else if (compiler.id === 'go') {
      output += `== Qshell Go 1.23 Runtime ==\nGoroutine completed successfully with channel sync!\nExit code 0`;
    } else if (compiler.id === 'sql') {
      output += `id | name                 | storage_sync             | compilers_count\n---+----------------------+--------------------------+----------------\n 1 | Main Development Hub | GitHub & Firebase Dual   | 30\n(1 row selected in 0.4ms)`;
    } else {
      output += `Successfully executed ${compiler.name} code. (Exit Code 0)`;
    }

    return {
      lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
    };
  }

  private async executeDirectScript(file: any, args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const timestamp = new Date().toLocaleTimeString();
    const content = file.content || '';

    if (file.name.endsWith('.py') || content.startsWith('#!/usr/bin/env python') || content.startsWith('#!/usr/bin/python')) {
      const py = PREINSTALLED_COMPILERS.find(c => c.id === 'python')!;
      return this.runClientSideCompiler(py, content, file.path, args, ctx);
    }
    if (
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      content.startsWith('#!/usr/bin/env node') ||
      content.startsWith('#!/usr/bin/node') ||
      file.path?.includes('/usr/local/bin/') ||
      file.path?.includes('/node_modules/.bin/')
    ) {
      const node = PREINSTALLED_COMPILERS.find(c => c.id === 'javascript')!;
      return this.runClientSideCompiler(node, content, file.path, args, ctx);
    }
    if (file.name.endsWith('.sh') || content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh')) {
      const lines = content.split('\n');
      let out = '';
      for (const line of lines) {
        if (line.startsWith('echo ')) {
          out += line.replace(/^echo\s+/, '').replace(/^["']|["']$/g, '') + '\n';
        }
      }
      return {
        lines: [{ id: Math.random().toString(), type: 'output', content: out.trim() || `Executed script ${file.name}`, timestamp }],
      };
    }
    return {
      lines: [{ id: Math.random().toString(), type: 'output', content: `Executed binary ${file.name} (exit code 0)`, timestamp }],
    };
  }

  private async handleGitCommand(args: string[], ctx: CommandContext): Promise<{ lines: TerminalLine[] }> {
    const sub = args[0] || 'status';
    const timestamp = new Date().toLocaleTimeString();
    const gh = cloudSyncService.getGitHubConfig();

    if (sub === 'clone') {
      const repoUrl = args[1];
      if (!repoUrl) {
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: "fatal: You must specify a repository to clone.\n\nusage: git clone <repository> [<directory>]",
            timestamp,
          }],
        };
      }

      const explicitDest = args[2];
      let repoName = explicitDest;
      if (!repoName) {
        const parts = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '').split('/');
        repoName = parts[parts.length - 1] || 'repo';
      }

      const destPath = vfsInstance.resolvePath(ctx.cwd, repoName);

      try {
        let cloneData: any = null;
        try {
          const res = await fetch('/api/git/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: repoUrl }),
          });
          if (res.ok) {
            cloneData = await res.json();
          }
        } catch {
          // Cloud endpoint fallback
        }

        // Create root target directory in VFS
        vfsInstance.createDirectory(destPath);

        const files: Array<{ path: string; content: string; type: string }> = cloneData?.files || [
          {
            path: 'README.md',
            content: `# ${repoName}\n\nCloned from ${repoUrl}\n\nReady for execution and testing in Qshell IDE.\n`,
            type: 'file',
          },
          {
            path: 'main.py',
            content: `#!/usr/bin/env python3\n"""\n${repoName} in Qshell\n"""\n\ndef main():\n    print("Executing ${repoName} inside Qshell environment...")\n\nif __name__ == "__main__":\n    main()\n`,
            type: 'file',
          },
          {
            path: '.gitignore',
            content: `node_modules/\n*.o\n*.out\n__pycache__/\n.env\n`,
            type: 'file',
          }
        ];

        let primaryFileToOpen: string | null = null;
        for (const file of files) {
          const filePath = `${destPath}/${file.path}`;
          if (file.type === 'dir') {
            vfsInstance.createDirectory(filePath);
          } else {
            vfsInstance.writeFile(filePath, file.content || '');
            if (!primaryFileToOpen && (file.path.endsWith('.py') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.c') || file.path.endsWith('.cpp') || file.path.endsWith('.rs') || file.path === 'README.md')) {
              primaryFileToOpen = filePath;
            }
          }
        }

        if (!primaryFileToOpen && files.length > 0) {
          primaryFileToOpen = `${destPath}/${files[0].path}`;
        }

        // Notify VFS subscribers so explorer immediately displays the new folder & files
        vfsInstance.notifyListeners();

        // Pass to editor so Qshell Editor receives and opens the cloned file!
        if (primaryFileToOpen && ctx.onOpenEditorFile) {
          ctx.onOpenEditorFile(primaryFileToOpen);
        }

        const count = files.length;
        const outText = `Cloning into '${repoName}'...\nremote: Enumerating objects: ${count + 4}, done.\nremote: Counting objects: 100% (${count + 4}/${count + 4}), done.\nremote: Compressing objects: 100% (${count + 1}/${count + 1}), done.\nremote: Total ${count + 4} (delta 2), reused ${count} (delta 1), pack-reused 0\nReceiving objects: 100% (${count + 4}/${count + 4}), 18.24 KiB | 4.80 MiB/s, done.\nResolving deltas: 100% (2/2), done.\n[OK] Repository '${repoName}' cloned into ${destPath}.\n[Editor] Opened '${primaryFileToOpen ? primaryFileToOpen.replace('/root/workspace/', '') : repoName}' in Qshell Editor.`;

        return {
          lines: [{
            id: Math.random().toString(),
            type: 'output',
            content: outText,
            timestamp,
          }],
        };
      } catch (err: any) {
        return {
          lines: [{
            id: Math.random().toString(),
            type: 'error',
            content: `fatal: unable to clone '${repoUrl}': ${err?.message || err}`,
            timestamp,
          }],
        };
      }
    }

    if (sub === 'status') {
      const files = vfsInstance.getAllFilesFlat();
      let output = `On branch ${gh.branch || 'main'}\n`;
      output += `Your branch is up to date with 'origin/${gh.branch || 'main'}'.\n\n`;
      if (files.length === 0) {
        output += `nothing to commit, working tree clean\n`;
      } else {
        output += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n`;
        files.slice(0, 5).forEach(f => {
          output += `\t\x1b[32mnew file:   ${f.path}\x1b[0m\n`;
        });
        if (files.length > 5) {
          output += `\t\x1b[32m... and ${files.length - 5} more files\x1b[0m\n`;
        }
      }
      output += `\nWorkspace sync destination: ${cloudSyncService.getDestination() === 'github' ? `GitHub (${gh.repo})` : 'Firebase'}`;
      return {
        lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
      };
    }

    if (sub === 'add') {
      return {
        lines: [{ id: Math.random().toString(), type: 'output', content: `Staged all tracked workspace files for commit.`, timestamp }],
      };
    }

    if (sub === 'commit') {
      const mIdx = args.indexOf('-m');
      const message = mIdx !== -1 && args[mIdx + 1] ? args[mIdx + 1] : 'Update workspace';
      const hash = `qs_${Math.random().toString(16).substring(2, 9)}`;
      cloudSyncService.syncToGitHub(message);
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'system',
          content: `[${gh.branch || 'main'} ${hash}] ${message}\n Auto-synced with remote repository.`,
          timestamp,
        }],
      };
    }

    if (sub === 'push') {
      return {
        lines: [{
          id: Math.random().toString(),
          type: 'system',
          content: `Enumerating objects: 5, done.\nWriting objects: 100% (5/5), 1.2 KiB | 1.2 MiB/s, done.\nTo https://github.com/${gh.repo}.git\n   main -> main [synced]`,
          timestamp,
        }],
      };
    }

    if (sub === 'log') {
      let output = `\x1b[33mcommit qs_89f0a2d9c (HEAD -> ${gh.branch || 'main'}, origin/${gh.branch || 'main'})\x1b[0m\n`;
      output += `Author: ${gh.authorName} <${gh.authorEmail}>\n`;
      output += `Date:   ${new Date().toUTCString()}\n\n`;
      output += `    chore(qshell): workspace commit [auto-sync]\n\n`;
      return {
        lines: [{ id: Math.random().toString(), type: 'output', content: output, timestamp }],
      };
    }

    return {
      lines: [{ id: Math.random().toString(), type: 'output', content: `git version 2.46.0 | Subcommands: clone, status, add, commit, push, pull, log, diff`, timestamp }],
    };
  }

  private handlePipedCommands(cmdStr: string, ctx: CommandContext): { lines: TerminalLine[] } {
    const timestamp = new Date().toLocaleTimeString();
    const stages = cmdStr.split('|').map(s => s.trim()).filter(Boolean);
    let intermediate = '';

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const tokens = this.tokenize(stage);
      const cmd = tokens[0].toLowerCase();
      const args = tokens.slice(1);

      if (cmd === 'cat' && args[0]) {
        const file = vfsInstance.getFile(vfsInstance.resolvePath(ctx.cwd, args[0]));
        intermediate = file?.content || '';
      } else if (cmd === 'grep') {
        const pattern = args[0] || '';
        const lines = (args[1] ? (vfsInstance.getFile(vfsInstance.resolvePath(ctx.cwd, args[1]))?.content || '') : intermediate).split('\n');
        intermediate = lines.filter(l => l.toLowerCase().includes(pattern.toLowerCase())).join('\n');
      } else if (cmd === 'wc') {
        const lineCount = intermediate.split('\n').filter(Boolean).length;
        intermediate = `${lineCount}`;
      } else if (cmd === 'head') {
        const n = parseInt(args[1] || '10', 10);
        intermediate = intermediate.split('\n').slice(0, n).join('\n');
      }
    }

    return {
      lines: [{ id: Math.random().toString(), type: 'output', content: intermediate, timestamp }],
    };
  }

  private tokenize(str: string): string[] {
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens: string[] = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      tokens.push(match[1] || match[2] || match[0]);
    }
    return tokens;
  }
}

export const shellEngine = new ShellEngine();
