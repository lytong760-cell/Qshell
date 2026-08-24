import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { ExecutionMode, TerminalPreferences, TerminalTab } from '../../types';
import { TERMINAL_THEMES } from '../../data/terminalThemes';
import { shellEngine, CommandContext } from '../../services/shellEngine';
import { vfsInstance } from '../../services/vfs';
import {
  InteractiveAppSession,
  startNanoSession,
  startTopSession,
  startPythonRepl,
  startNodeRepl,
} from '../../services/terminalApps';

interface XtermTerminalTabProps {
  tab: TerminalTab;
  isActive: boolean;
  executionMode: ExecutionMode;
  preferences: TerminalPreferences;
  onUpdateTab: (tabId: string, updates: Partial<TerminalTab>) => void;
  onOpenEditorFile?: (path: string) => void;
  onRunActiveFileTrigger?: { code: string; language: string; filePath: string; trigger: number } | null;
}

export const XtermTerminalTab: React.FC<XtermTerminalTabProps> = ({
  tab,
  isActive,
  executionMode,
  preferences,
  onUpdateTab,
  onOpenEditorFile,
  onRunActiveFileTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionRef = useRef<InteractiveAppSession | null>(null);

  // Shell State Tracking
  const cwdRef = useRef(tab.cwd || '/root/workspace');
  const userRef = useRef(tab.user || 'root');
  const historyRef = useRef<string[]>(tab.history || []);
  const historyIndexRef = useRef<number>(-1);
  const inputBufferRef = useRef<string>('');
  const cursorIndexRef = useRef<number>(0);
  const isExecutingRef = useRef<boolean>(false);
  const reverseSearchRef = useRef<{ active: boolean; query: string } | null>(null);

  const themeConfig = TERMINAL_THEMES[preferences.theme] || TERMINAL_THEMES['vscode-dark'];

  // Print Shell Prompt with ANSI colors
  const printPrompt = (term: Terminal) => {
    const isRoot = userRef.current === 'root';
    const userColor = isRoot ? '\x1b[32;1m' : '\x1b[36;1m';
    const pathColor = '\x1b[34;1m';
    const displayPath = cwdRef.current.replace('/root', '~');
    const promptChar = isRoot ? '#' : '$';

    term.write(`\r\n${userColor}${userRef.current}@qshell\x1b[0m:${pathColor}${displayPath}\x1b[0m${promptChar} `);
    inputBufferRef.current = '';
    cursorIndexRef.current = 0;
  };

  // Initialize Xterm instance
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: preferences.cursorBlink,
      cursorStyle: preferences.cursorStyle,
      fontSize: preferences.fontSize,
      fontFamily: preferences.fontFamily,
      lineHeight: preferences.lineHeight,
      scrollback: preferences.scrollback,
      theme: {
        background: themeConfig.background,
        foreground: themeConfig.foreground,
        cursor: themeConfig.cursor,
        selectionBackground: themeConfig.selectionBackground,
        black: themeConfig.black,
        red: themeConfig.red,
        green: themeConfig.green,
        yellow: themeConfig.yellow,
        blue: themeConfig.blue,
        magenta: themeConfig.magenta,
        cyan: themeConfig.cyan,
        white: themeConfig.white,
        brightBlack: themeConfig.brightBlack,
        brightRed: themeConfig.brightRed,
        brightGreen: themeConfig.brightGreen,
        brightYellow: themeConfig.brightYellow,
        brightBlue: themeConfig.brightBlue,
        brightMagenta: themeConfig.brightMagenta,
        brightCyan: themeConfig.brightCyan,
        brightWhite: themeConfig.brightWhite,
      },
      convertEol: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome ANSI Banner
    term.write('\x1b[1;36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m\r\n');
    term.write('\x1b[1;36m║\x1b[0m       \x1b[1;38;2;0;190;255m🚀 QSHELL GENUINE FULL TERMINAL & DEVELOPMENT PLATFORM\x1b[0m                 \x1b[1;36m║\x1b[0m\r\n');
    term.write('\x1b[1;36m║\x1b[0m       \x1b[32mLinux 6.8.0-qshell-dual (x86_64) • Root Privileges Active\x1b[0m              \x1b[1;36m║\x1b[0m\r\n');
    term.write('\x1b[1;36m║\x1b[0m       \x1b[33m30 Pre-configured Compilers & Runtimes • VT100 / ANSI Engine\x1b[0m           \x1b[1;36m║\x1b[0m\r\n');
    term.write('\x1b[1;36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n');
    term.write('\x1b[90mType \x1b[37m"help"\x1b[90m for manual, \x1b[37m"compilers"\x1b[90m for runtimes, or run interactive \x1b[37m"nano"\x1b[90m, \x1b[37m"top"\x1b[90m, \x1b[37m"python3"\x1b[90m, \x1b[37m"node"\x1b[90m.\x1b[0m\r\n');

    printPrompt(term);

    // Keystroke Handler (Raw Mode)
    const disposable = term.onData((data: string) => {
      // 1. If an interactive full-screen session is active (nano, top, python_repl, node_repl)
      if (activeSessionRef.current) {
        const keepSession = activeSessionRef.current.onData(data, (t: string) => term.write(t));
        if (!keepSession) {
          activeSessionRef.current = null;
          printPrompt(term);
        }
        return;
      }

      if (isExecutingRef.current) {
        // Allow Ctrl+C to abort running command
        if (data === '\x03') {
          term.write('^C\r\n');
          isExecutingRef.current = false;
          printPrompt(term);
        }
        return;
      }

      // 2. Reverse search mode (Ctrl+R)
      if (reverseSearchRef.current?.active) {
        handleReverseSearchKey(data, term);
        return;
      }

      // 3. Normal Command Line Keystroke Processing
      handleShellKey(data, term);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      } catch (e) {
        // ignore resize race
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      disposable.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  // Update theme & preferences dynamically
  useEffect(() => {
    if (!termRef.current) return;
    termRef.current.options.theme = {
      background: themeConfig.background,
      foreground: themeConfig.foreground,
      cursor: themeConfig.cursor,
      selectionBackground: themeConfig.selectionBackground,
      black: themeConfig.black,
      red: themeConfig.red,
      green: themeConfig.green,
      yellow: themeConfig.yellow,
      blue: themeConfig.blue,
      magenta: themeConfig.magenta,
      cyan: themeConfig.cyan,
      white: themeConfig.white,
      brightBlack: themeConfig.brightBlack,
      brightRed: themeConfig.brightRed,
      brightGreen: themeConfig.brightGreen,
      brightYellow: themeConfig.brightYellow,
      brightBlue: themeConfig.brightBlue,
      brightMagenta: themeConfig.brightMagenta,
      brightCyan: themeConfig.brightCyan,
      brightWhite: themeConfig.brightWhite,
    };
    termRef.current.options.fontSize = preferences.fontSize;
    termRef.current.options.cursorStyle = preferences.cursorStyle;
    termRef.current.options.cursorBlink = preferences.cursorBlink;
    termRef.current.options.lineHeight = preferences.lineHeight;
    fitAddonRef.current?.fit();
  }, [preferences, themeConfig]);

  // Fit on active tab toggle
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch (e) {
          // ignore
        }
      }, 50);
    }
  }, [isActive]);

  // External execution trigger (e.g. "Run Active File" button)
  useEffect(() => {
    if (onRunActiveFileTrigger && onRunActiveFileTrigger.trigger > 0 && isActive && termRef.current) {
      const { filePath, language } = onRunActiveFileTrigger;
      let cmd = `python3 ${filePath}`;
      if (language === 'javascript' || language === 'typescript') {
        cmd = `node ${filePath}`;
      } else if (language === 'rust') {
        cmd = `rustc ${filePath} && ./${filePath.replace('.rs', '')}`;
      } else if (language === 'c' || language === 'cpp') {
        cmd = `gcc ${filePath} -o output && ./output`;
      } else if (language === 'go') {
        cmd = `go run ${filePath}`;
      }
      runCommand(cmd, termRef.current);
    }
  }, [onRunActiveFileTrigger]);

  // Handle Raw Shell Keystrokes
  const handleShellKey = (data: string, term: Terminal) => {
    // Enter (Return)
    if (data === '\r' || data === '\n') {
      const cmd = inputBufferRef.current.trim();
      term.write('\r\n');

      if (cmd) {
        // Add to history
        historyRef.current = [...historyRef.current, cmd];
        historyIndexRef.current = -1;
        onUpdateTab(tab.id, { history: historyRef.current });
        runCommand(cmd, term);
      } else {
        printPrompt(term);
      }
      return;
    }

    // Backspace (\x7f or \b)
    if (data === '\x7f' || data === '\b') {
      if (cursorIndexRef.current > 0) {
        const before = inputBufferRef.current.slice(0, cursorIndexRef.current - 1);
        const after = inputBufferRef.current.slice(cursorIndexRef.current);
        inputBufferRef.current = before + after;
        cursorIndexRef.current--;

        // Redraw line from cursor
        term.write('\b \b');
        if (after.length > 0) {
          term.write(after + ' ');
          for (let i = 0; i <= after.length; i++) {
            term.write('\b');
          }
        }
      }
      return;
    }

    // Delete key (\x1b[3~)
    if (data === '\x1b[3~') {
      if (cursorIndexRef.current < inputBufferRef.current.length) {
        const before = inputBufferRef.current.slice(0, cursorIndexRef.current);
        const after = inputBufferRef.current.slice(cursorIndexRef.current + 1);
        inputBufferRef.current = before + after;
        term.write(after + ' ');
        for (let i = 0; i <= after.length; i++) {
          term.write('\b');
        }
      }
      return;
    }

    // Up Arrow (\x1b[A) - Traverse History Backward
    if (data === '\x1b[A') {
      if (historyRef.current.length === 0) return;
      const newIdx = historyIndexRef.current === -1
        ? historyRef.current.length - 1
        : Math.max(0, historyIndexRef.current - 1);

      historyIndexRef.current = newIdx;
      replaceCurrentLine(historyRef.current[newIdx], term);
      return;
    }

    // Down Arrow (\x1b[B) - Traverse History Forward
    if (data === '\x1b[B') {
      if (historyIndexRef.current === -1) return;
      const newIdx = historyIndexRef.current + 1;

      if (newIdx >= historyRef.current.length) {
        historyIndexRef.current = -1;
        replaceCurrentLine('', term);
      } else {
        historyIndexRef.current = newIdx;
        replaceCurrentLine(historyRef.current[newIdx], term);
      }
      return;
    }

    // Left Arrow (\x1b[D)
    if (data === '\x1b[D') {
      if (cursorIndexRef.current > 0) {
        cursorIndexRef.current--;
        term.write('\x1b[D');
      }
      return;
    }

    // Right Arrow (\x1b[C)
    if (data === '\x1b[C') {
      if (cursorIndexRef.current < inputBufferRef.current.length) {
        cursorIndexRef.current++;
        term.write('\x1b[C');
      }
      return;
    }

    // Home (\x1b[H, \x1b[1~, Ctrl+A \x01)
    if (data === '\x1b[H' || data === '\x1b[1~' || data === '\x01') {
      while (cursorIndexRef.current > 0) {
        term.write('\x1b[D');
        cursorIndexRef.current--;
      }
      return;
    }

    // End (\x1b[F, \x1b[4~, Ctrl+E \x05)
    if (data === '\x1b[F' || data === '\x1b[4~' || data === '\x05') {
      while (cursorIndexRef.current < inputBufferRef.current.length) {
        term.write('\x1b[C');
        cursorIndexRef.current++;
      }
      return;
    }

    // Tab Auto-Completion (\t)
    if (data === '\t') {
      handleTabCompletion(term);
      return;
    }

    // Ctrl+C (\x03) - Cancel line
    if (data === '\x03') {
      term.write('^C');
      inputBufferRef.current = '';
      cursorIndexRef.current = 0;
      printPrompt(term);
      return;
    }

    // Ctrl+L (\x0c) - Clear screen
    if (data === '\x0c') {
      term.write('\x1b[2J\x1b[H');
      const isRoot = userRef.current === 'root';
      const userColor = isRoot ? '\x1b[32;1m' : '\x1b[36;1m';
      const pathColor = '\x1b[34;1m';
      const displayPath = cwdRef.current.replace('/root', '~');
      const promptChar = isRoot ? '#' : '$';
      term.write(`${userColor}${userRef.current}@qshell\x1b[0m:${pathColor}${displayPath}\x1b[0m${promptChar} `);
      term.write(inputBufferRef.current);
      return;
    }

    // Ctrl+U (\x15) - Cut to beginning of line
    if (data === '\x15') {
      const remaining = inputBufferRef.current.slice(cursorIndexRef.current);
      inputBufferRef.current = remaining;
      while (cursorIndexRef.current > 0) {
        term.write('\b \b');
        cursorIndexRef.current--;
      }
      term.write(remaining);
      for (let i = 0; i < remaining.length; i++) {
        term.write('\b');
      }
      return;
    }

    // Ctrl+K (\x0b) - Cut to end of line
    if (data === '\x0b') {
      const toErase = inputBufferRef.current.length - cursorIndexRef.current;
      inputBufferRef.current = inputBufferRef.current.slice(0, cursorIndexRef.current);
      for (let i = 0; i < toErase; i++) {
        term.write(' ');
      }
      for (let i = 0; i < toErase; i++) {
        term.write('\b');
      }
      return;
    }

    // Ctrl+W (\x17) - Delete word
    if (data === '\x17') {
      if (cursorIndexRef.current > 0) {
        const before = inputBufferRef.current.slice(0, cursorIndexRef.current);
        const after = inputBufferRef.current.slice(cursorIndexRef.current);
        const match = before.match(/(\s*\S+)\s*$/);
        const deleteCount = match ? match[0].length : 1;
        const newBefore = before.slice(0, before.length - deleteCount);
        inputBufferRef.current = newBefore + after;
        cursorIndexRef.current -= deleteCount;
        replaceCurrentLine(inputBufferRef.current, term);
      }
      return;
    }

    // Ctrl+R (\x12) - Reverse Incremental Search
    if (data === '\x12') {
      reverseSearchRef.current = { active: true, query: '' };
      term.write('\r\n\x1b[33m(reverse-i-search)`\': \x1b[0m');
      return;
    }

    // Standard Printable Characters
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      const before = inputBufferRef.current.slice(0, cursorIndexRef.current);
      const after = inputBufferRef.current.slice(cursorIndexRef.current);
      inputBufferRef.current = before + data + after;
      cursorIndexRef.current++;

      term.write(data + after);
      for (let i = 0; i < after.length; i++) {
        term.write('\b');
      }
    }
  };

  // Replace active command line buffer with new string
  const replaceCurrentLine = (newText: string, term: Terminal) => {
    while (cursorIndexRef.current > 0) {
      term.write('\b \b');
      cursorIndexRef.current--;
    }
    const currentLen = inputBufferRef.current.length;
    for (let i = 0; i < currentLen; i++) {
      term.write(' ');
    }
    for (let i = 0; i < currentLen; i++) {
      term.write('\b');
    }
    inputBufferRef.current = newText;
    cursorIndexRef.current = newText.length;
    term.write(newText);
  };

  // Reverse Search (Ctrl+R) Handler
  const handleReverseSearchKey = (data: string, term: Terminal) => {
    if (!reverseSearchRef.current) return;

    if (data === '\r' || data === '\n' || data === '\x03') {
      const query = reverseSearchRef.current.query;
      reverseSearchRef.current = null;
      const matched = historyRef.current.slice().reverse().find(h => h.includes(query)) || '';
      printPrompt(term);
      if (matched && data !== '\x03') {
        inputBufferRef.current = matched;
        cursorIndexRef.current = matched.length;
        term.write(matched);
      }
      return;
    }

    if (data === '\x7f' || data === '\b') {
      if (reverseSearchRef.current.query.length > 0) {
        reverseSearchRef.current.query = reverseSearchRef.current.query.slice(0, -1);
      }
    } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
      reverseSearchRef.current.query += data;
    }

    const q = reverseSearchRef.current.query;
    const match = historyRef.current.slice().reverse().find(h => h.includes(q)) || '';
    term.write(`\r\x1b[2K\x1b[33m(reverse-i-search)\`${q}': \x1b[32m${match}\x1b[0m`);
  };

  // Intelligent Tab Auto-Completion
  const handleTabCompletion = (term: Terminal) => {
    const raw = inputBufferRef.current;
    if (!raw.trim()) return;

    const tokens = raw.split(' ');
    const lastToken = tokens[tokens.length - 1];

    if (tokens.length === 1) {
      // Command completion
      const ALL_COMMANDS = [
        'ls', 'cd', 'cat', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'echo',
        'grep', 'find', 'sed', 'awk', 'head', 'tail', 'wc', 'sort', 'uniq',
        'top', 'htop', 'nano', 'vim', 'code', 'clear', 'reset', 'history',
        'uname', 'whoami', 'id', 'date', 'uptime', 'df', 'free', 'ps', 'kill',
        'python3', 'python', 'node', 'tsc', 'gcc', 'g++', 'rustc', 'cargo',
        'go', 'java', 'ruby', 'php', 'perl', 'lua', 'sqlite3', 'bc', 'man',
        'git', 'curl', 'wget', 'ping', 'env', 'export', 'unset', 'alias',
        'compilers', 'runtimes', 'help', 'neofetch', 'tree'
      ];

      const matches = ALL_COMMANDS.filter(c => c.startsWith(lastToken));
      if (matches.length === 1) {
        const completed = matches[0] + ' ';
        replaceCurrentLine(completed, term);
      } else if (matches.length > 1) {
        term.write('\r\n');
        // Format columns
        const colStr = matches.map(m => `\x1b[32m${m}\x1b[0m`).join('   ');
        term.write(colStr);
        printPrompt(term);
        term.write(raw);
        inputBufferRef.current = raw;
        cursorIndexRef.current = raw.length;
      }
    } else {
      // File path completion in cwd
      const files = vfsInstance.listDirectory(cwdRef.current);
      const matches = files.filter(f => f.name.startsWith(lastToken));

      if (matches.length === 1) {
        const isDir = matches[0].type === 'dir';
        tokens[tokens.length - 1] = matches[0].name + (isDir ? '/' : ' ');
        const completed = tokens.join(' ');
        replaceCurrentLine(completed, term);
      } else if (matches.length > 1) {
        term.write('\r\n');
        const colStr = matches.map(m => {
          if (m.type === 'dir') return `\x1b[1;34m${m.name}/\x1b[0m`;
          return `\x1b[37m${m.name}\x1b[0m`;
        }).join('   ');
        term.write(colStr);
        printPrompt(term);
        term.write(raw);
        inputBufferRef.current = raw;
        cursorIndexRef.current = raw.length;
      }
    }
  };

  // Run full command line through interactive apps, shell engine, or cloud backend
  const runCommand = async (cmdLine: string, term: Terminal) => {
    isExecutingRef.current = true;
    const tokens = cmdLine.trim().split(' ').filter(Boolean);
    const command = tokens[0]?.toLowerCase();
    const arg1 = tokens[1] || '';

    // 1. Check for Interactive Nano Editor
    if (command === 'nano' || command === 'vim' || command === 'vi') {
      const targetFile = arg1 || 'untitled.txt';
      const fullPath = targetFile.startsWith('/')
        ? targetFile
        : `${cwdRef.current === '/' ? '' : cwdRef.current}/${targetFile}`;

      const existing = vfsInstance.readFile(fullPath);
      const session = startNanoSession(
        fullPath,
        existing || '',
        (text: string) => term.write(text),
        (path, content) => {
          if (onOpenEditorFile) onOpenEditorFile(path);
        }
      );
      activeSessionRef.current = session;
      isExecutingRef.current = false;
      return;
    }

    // 2. Check for Interactive Top / Htop
    if (command === 'top' || command === 'htop') {
      const session = startTopSession((text: string) => term.write(text));
      activeSessionRef.current = session;
      isExecutingRef.current = false;
      return;
    }

    // 3. Check for Interactive Python REPL (no file argument)
    if ((command === 'python3' || command === 'python' || command === 'py') && tokens.length === 1) {
      const session = startPythonRepl((text: string) => term.write(text));
      activeSessionRef.current = session;
      isExecutingRef.current = false;
      return;
    }

    // 4. Check for Interactive Node REPL (no file argument)
    if ((command === 'node' || command === 'js') && tokens.length === 1) {
      const session = startNodeRepl((text: string) => term.write(text));
      activeSessionRef.current = session;
      isExecutingRef.current = false;
      return;
    }

    // 5. Check for "code <file>" (Bridge to Monaco/Prism Editor)
    if (command === 'code') {
      if (arg1) {
        const fullPath = arg1.startsWith('/')
          ? arg1
          : `${cwdRef.current === '/' ? '' : cwdRef.current}/${arg1}`;
        if (onOpenEditorFile) onOpenEditorFile(fullPath);
        term.write(`\x1b[32mOpened ${fullPath} in Qshell Editor.\x1b[0m\r\n`);
      } else {
        term.write('\x1b[31musage: code <filename>\x1b[0m\r\n');
      }
      isExecutingRef.current = false;
      printPrompt(term);
      return;
    }

    // 6. Execute via Cloud Server API or Shell Engine
    const ctx: CommandContext = {
      cwd: cwdRef.current,
      user: userRef.current,
      hostname: 'qshell',
      env: {},
      executionMode,
      onOpenEditorFile,
    };

    try {
      const res = await shellEngine.executeCommandLine(cmdLine, ctx);

      if (res.clear) {
        term.write('\x1b[2J\x1b[H');
      } else {
        for (const line of res.lines) {
          if (line.type === 'error') {
            term.write(`\x1b[31m${line.content.replace(/\n/g, '\r\n')}\x1b[0m\r\n`);
          } else if (line.type === 'system') {
            term.write(`\x1b[36m[SYSTEM] ${line.content.replace(/\n/g, '\r\n')}\x1b[0m\r\n`);
          } else if (line.type === 'badge') {
            term.write(`\x1b[1;36m${line.content.replace(/\n/g, '\r\n')}\x1b[0m\r\n`);
          } else {
            term.write(`${line.content.replace(/\n/g, '\r\n')}\r\n`);
          }
        }
      }

      if (res.newCwd) {
        cwdRef.current = res.newCwd;
        onUpdateTab(tab.id, {
          cwd: res.newCwd,
          title: `${userRef.current}@qshell: ${res.newCwd.replace('/root', '~')}`,
        });
      }

      if (res.newUser) {
        userRef.current = res.newUser;
        onUpdateTab(tab.id, {
          user: res.newUser,
          title: `${res.newUser}@qshell: ${cwdRef.current.replace('/root', '~')}`,
        });
      }
    } catch (e: any) {
      term.write(`\x1b[31mExecution error: ${e?.message || e}\x1b[0m\r\n`);
    } finally {
      isExecutingRef.current = false;
      printPrompt(term);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: themeConfig.background }}
      onClick={() => termRef.current?.focus()}
    />
  );
};
