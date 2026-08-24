import { vfsInstance } from './vfs';

export interface InteractiveAppSession {
  type: 'nano' | 'top' | 'python_repl' | 'node_repl' | 'sqlite_repl' | 'pager' | 'bc';
  title: string;
  data: any;
  onData: (data: string, write: (text: string) => void) => boolean; // returns true if session handled key, false if should exit
  onClose?: () => void;
}

// Full interactive nano editor directly inside xterm terminal
export function startNanoSession(
  filePath: string,
  initialContent: string,
  write: (text: string) => void,
  onSaveCallback?: (path: string, content: string) => void
): InteractiveAppSession {
  const lines = initialContent ? initialContent.split('\n') : [''];
  let cursorRow = 0;
  let cursorCol = 0;
  let isModified = false;
  let statusMessage = '';

  const renderScreen = () => {
    // Clear terminal screen and move cursor to home (ANSI escape sequences)
    let screen = '\x1b[?25l\x1b[2J\x1b[H'; // hide cursor during redraw

    // Top title bar (Inverted colors)
    const titleBar = ` GNU nano 7.2              File: ${filePath} ${isModified ? '*' : ' '}              ${statusMessage ? `[ ${statusMessage} ]` : ''}`;
    screen += `\x1b[7m${titleBar.padEnd(80, ' ')}\x1b[27m\r\n`;

    // Content lines (max 20 rows visible)
    const visibleLines = lines.slice(0, 22);
    for (let r = 0; r < 22; r++) {
      if (r < visibleLines.length) {
        screen += `${visibleLines[r]}\r\n`;
      } else {
        screen += `\x1b[38;2;80;80;90m~\x1b[0m\r\n`;
      }
    }

    // Bottom Help & Shortcut Bar (Nano standard layout)
    screen += `\x1b[7m^G\x1b[27m Get Help  \x1b[7m^O\x1b[27m WriteOut  \x1b[7m^W\x1b[27m Where Is  \x1b[7m^K\x1b[27m Cut Text  \x1b[7m^J\x1b[27m Justify   \x1b[7m^C\x1b[27m Cur Pos\r\n`;
    screen += `\x1b[7m^X\x1b[27m Exit      \x1b[7m^R\x1b[27m Read File \x1b[7m^\\\x1b[27m Replace   \x1b[7m^U\x1b[27m Paste     \x1b[7m^T\x1b[27m To Spell  \x1b[7m^_\x1b[27m Go To Line`;

    // Position cursor at actual row/col
    const targetRow = Math.min(cursorRow, 21) + 2; // +2 for 1-based index and header row
    const targetCol = cursorCol + 1;
    screen += `\x1b[${targetRow};${targetCol}H\x1b[?25h`;

    write(screen);
  };

  // Initial draw
  renderScreen();

  return {
    type: 'nano',
    title: `nano (${filePath})`,
    data: { filePath, lines },
    onData: (data: string, termWrite: (text: string) => void) => {
      // Ctrl+X (Exit nano)
      if (data === '\x18') {
        termWrite('\x1b[2J\x1b[H\x1b[?25h');
        return false; // Exit session
      }

      // Ctrl+O (Write out / Save)
      if (data === '\x0f') {
        const fullContent = lines.join('\n');
        vfsInstance.writeFile(filePath, fullContent);
        if (onSaveCallback) onSaveCallback(filePath, fullContent);
        isModified = false;
        statusMessage = `Wrote ${lines.length} lines`;
        renderScreen();
        setTimeout(() => {
          statusMessage = '';
          renderScreen();
        }, 1500);
        return true;
      }

      // Arrow keys (ANSI escape codes)
      if (data === '\x1b[A') { // Up
        cursorRow = Math.max(0, cursorRow - 1);
        cursorCol = Math.min(cursorCol, (lines[cursorRow] || '').length);
        renderScreen();
        return true;
      }
      if (data === '\x1b[B') { // Down
        cursorRow = Math.min(lines.length - 1, cursorRow + 1);
        cursorCol = Math.min(cursorCol, (lines[cursorRow] || '').length);
        renderScreen();
        return true;
      }
      if (data === '\x1b[C') { // Right
        if (cursorCol < (lines[cursorRow] || '').length) {
          cursorCol++;
        } else if (cursorRow < lines.length - 1) {
          cursorRow++;
          cursorCol = 0;
        }
        renderScreen();
        return true;
      }
      if (data === '\x1b[D') { // Left
        if (cursorCol > 0) {
          cursorCol--;
        } else if (cursorRow > 0) {
          cursorRow--;
          cursorCol = (lines[cursorRow] || '').length;
        }
        renderScreen();
        return true;
      }

      // Home & End
      if (data === '\x1b[H' || data === '\x01') {
        cursorCol = 0;
        renderScreen();
        return true;
      }
      if (data === '\x1b[F' || data === '\x05') {
        cursorCol = (lines[cursorRow] || '').length;
        renderScreen();
        return true;
      }

      // Enter (New line)
      if (data === '\r' || data === '\n') {
        const current = lines[cursorRow] || '';
        const before = current.slice(0, cursorCol);
        const after = current.slice(cursorCol);
        lines[cursorRow] = before;
        lines.splice(cursorRow + 1, 0, after);
        cursorRow++;
        cursorCol = 0;
        isModified = true;
        renderScreen();
        return true;
      }

      // Backspace
      if (data === '\x7f' || data === '\b') {
        if (cursorCol > 0) {
          const current = lines[cursorRow] || '';
          lines[cursorRow] = current.slice(0, cursorCol - 1) + current.slice(cursorCol);
          cursorCol--;
          isModified = true;
        } else if (cursorRow > 0) {
          const current = lines[cursorRow] || '';
          const prev = lines[cursorRow - 1] || '';
          cursorCol = prev.length;
          lines[cursorRow - 1] = prev + current;
          lines.splice(cursorRow, 1);
          cursorRow--;
          isModified = true;
        }
        renderScreen();
        return true;
      }

      // Standard character input
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        const current = lines[cursorRow] || '';
        lines[cursorRow] = current.slice(0, cursorCol) + data + current.slice(cursorCol);
        cursorCol++;
        isModified = true;
        renderScreen();
        return true;
      }

      return true;
    },
    onClose: () => {
      write('\x1b[2J\x1b[H\x1b[?25h');
    }
  };
}

// Full interactive `top` / `htop` ANSI process viewer
export function startTopSession(write: (text: string) => void): InteractiveAppSession {
  let timerId: any = null;
  let tick = 0;

  const renderTop = () => {
    tick++;
    const now = new Date();
    const uptimeStr = 'up 21 days,  4:12';
    const cpuUser = (1.2 + Math.sin(tick * 0.4) * 0.8).toFixed(1);
    const cpuSys = (0.8 + Math.cos(tick * 0.3) * 0.4).toFixed(1);
    const memUsed = Math.floor(620 + Math.sin(tick * 0.2) * 15);

    let screen = '\x1b[2J\x1b[H'; // Clear screen & home
    screen += `\x1b[1mtop - ${now.toLocaleTimeString()} ${uptimeStr},  1 user,  load average: 0.08, 0.05, 0.01\x1b[0m\r\n`;
    screen += `Tasks: \x1b[1m42\x1b[0m total, \x1b[32;1m1\x1b[0m running, \x1b[1m41\x1b[0m sleeping, \x1b[1m0\x1b[0m stopped, \x1b[1m0\x1b[0m zombie\r\n`;
    screen += `%Cpu(s): \x1b[32m${cpuUser}\x1b[0m us, \x1b[34m${cpuSys}\x1b[0m sy, \x1b[33m0.0\x1b[0m ni, \x1b[37m97.8\x1b[0m id, \x1b[35m0.1\x1b[0m wa, \x1b[36m0.0\x1b[0m hi, \x1b[31m0.1\x1b[0m si\r\n`;
    screen += `MiB Mem : \x1b[32m4096.0\x1b[0m total, \x1b[33m2840.4\x1b[0m free,  \x1b[36m${memUsed}.2\x1b[0m used,   \x1b[35m635.4\x1b[0m buff/cache\r\n`;
    screen += `MiB Swap: \x1b[32m2048.0\x1b[0m total, \x1b[33m2048.0\x1b[0m free,     \x1b[36m0.0\x1b[0m used.  \x1b[35m3450.6\x1b[0m avail Mem\r\n\r\n`;

    // Process Table Header (Inverted)
    screen += `\x1b[7m  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND          \x1b[27m\r\n`;

    // Process Rows
    const procs = [
      { pid: '    1', user: 'root    ', pr: '20', ni: ' 0', virt: ' 168.4M', res: ' 12.1M', shr: '  8.4M', s: 'S', cpu: ' 0.0', mem: ' 0.3', time: '0:02.14', cmd: 'systemd' },
      { pid: '  104', user: 'root    ', pr: '20', ni: ' 0', virt: ' 312.8M', res: ' 48.2M', shr: ' 24.1M', s: 'S', cpu: ' 0.2', mem: ' 1.2', time: '0:14.28', cmd: 'qshell-daemon' },
      { pid: '  240', user: 'root    ', pr: '20', ni: ' 0', virt: ' 524.1M', res: '112.4M', shr: ' 42.0M', s: 'S', cpu: ' 0.8', mem: ' 2.7', time: '0:38.90', cmd: 'node server.ts' },
      { pid: '  582', user: 'root    ', pr: '20', ni: ' 0', virt: ' 894.2M', res: '184.6M', shr: ' 68.2M', s: 'S', cpu: (0.6 + Math.random() * 0.4).toFixed(1).padStart(4, ' '), mem: ' 4.5', time: '1:02.44', cmd: 'vite-dev-server' },
      { pid: '  910', user: 'root    ', pr: '20', ni: ' 0', virt: ' 120.0M', res: ' 18.2M', shr: '  9.1M', s: 'S', cpu: ' 0.0', mem: ' 0.4', time: '0:00.32', cmd: 'bash' },
      { pid: ' 1245', user: 'root    ', pr: '20', ni: ' 0', virt: '  84.5M', res: '  8.6M', shr: '  5.2M', s: 'R', cpu: (1.2 + Math.random() * 0.8).toFixed(1).padStart(4, ' '), mem: ' 0.2', time: '0:00.18', cmd: 'top' },
      { pid: ' 1802', user: 'root    ', pr: '20', ni: ' 0', virt: ' 240.2M', res: ' 32.1M', shr: ' 14.5M', s: 'S', cpu: ' 0.0', mem: ' 0.8', time: '0:01.05', cmd: 'cloud-sync-worker' },
      { pid: ' 2100', user: 'root    ', pr: '20', ni: ' 0', virt: ' 410.0M', res: ' 58.4M', shr: ' 28.0M', s: 'S', cpu: ' 0.1', mem: ' 1.4', time: '0:05.12', cmd: 'compiler-sandbox' },
    ];

    procs.forEach(p => {
      const isRunning = p.s === 'R';
      screen += `${p.pid} ${p.user} ${p.pr} ${p.ni} ${p.virt} ${p.res} ${p.shr} \x1b[${isRunning ? '32;1m' : '37m'}${p.s}\x1b[0m ${p.cpu} ${p.mem}   ${p.time} \x1b[1m${p.cmd}\x1b[0m\r\n`;
    });

    screen += `\r\n\x1b[38;2;120;120;140m(Press 'q' or Ctrl+C to exit top)\x1b[0m`;
    write(screen);
  };

  renderTop();
  timerId = setInterval(renderTop, 1000);

  return {
    type: 'top',
    title: 'top',
    data: {},
    onData: (data: string, termWrite: (text: string) => void) => {
      if (data === 'q' || data === 'Q' || data === '\x03') { // q or Ctrl+C
        clearInterval(timerId);
        termWrite('\x1b[2J\x1b[H\x1b[?25h');
        return false; // Exit top
      }
      return true;
    },
    onClose: () => {
      if (timerId) clearInterval(timerId);
      write('\x1b[2J\x1b[H\x1b[?25h');
    }
  };
}

// Interactive Python REPL session with variable memory
export function startPythonRepl(write: (text: string) => void): InteractiveAppSession {
  const pythonState: Record<string, any> = {
    pi: 3.141592653589793,
    e: 2.718281828459045,
  };

  write('\x1b[1mPython 3.12.4 (main, Qshell Platform)\x1b[0m\r\n[GCC 13.2.0] on linux\r\nType "help", "copyright", "credits" or "license" for more information.\r\n>>> ');

  let currentLine = '';

  return {
    type: 'python_repl',
    title: 'python3 (REPL)',
    data: { pythonState },
    onData: (data: string, termWrite: (text: string) => void) => {
      // Ctrl+D or Ctrl+C
      if (data === '\x04' || data === '\x03') {
        termWrite('\r\n\x1b[38;2;120;120;140m[Exited Python interactive session]\x1b[0m\r\n');
        return false;
      }

      // Enter
      if (data === '\r' || data === '\n') {
        termWrite('\r\n');
        const trimmed = currentLine.trim();

        if (trimmed === 'exit' || trimmed === 'exit()' || trimmed === 'quit' || trimmed === 'quit()') {
          termWrite('\x1b[38;2;120;120;140m[Exited Python interactive session]\x1b[0m\r\n');
          return false;
        }

        if (trimmed) {
          try {
            // Evaluate Python expression
            if (trimmed.startsWith('print(')) {
              const inner = trimmed.substring(6, trimmed.length - 1);
              // Check variables in state
              const evaluated = evaluateExpression(inner, pythonState);
              termWrite(`${evaluated}\r\n`);
            } else if (trimmed.includes('=')) {
              const parts = trimmed.split('=');
              const varName = parts[0].trim();
              const varVal = evaluateExpression(parts.slice(1).join('=').trim(), pythonState);
              pythonState[varName] = varVal;
            } else if (trimmed === 'help' || trimmed === 'help()') {
              termWrite('Type any Python expression (e.g. 2 + 2, len([1,2,3]), math.sqrt(16)), or assign variables (x = 42).\r\n');
            } else {
              const res = evaluateExpression(trimmed, pythonState);
              if (res !== undefined) {
                termWrite(`\x1b[36m${typeof res === 'object' ? JSON.stringify(res) : res}\x1b[0m\r\n`);
              }
            }
          } catch (e: any) {
            termWrite(`\x1b[31mTraceback (most recent call last):\r\n  File "<stdin>", line 1, in <module>\r\nNameError: ${e?.message || e}\x1b[0m\r\n`);
          }
        }

        currentLine = '';
        termWrite('>>> ');
        return true;
      }

      // Backspace
      if (data === '\x7f' || data === '\b') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          termWrite('\b \b');
        }
        return true;
      }

      // Standard chars
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        currentLine += data;
        termWrite(data);
        return true;
      }

      return true;
    }
  };
}

// Interactive Node.js REPL session
export function startNodeRepl(write: (text: string) => void): InteractiveAppSession {
  const nodeContext: Record<string, any> = {
    global: {},
    process: { version: 'v22.14.0', platform: 'linux', arch: 'x64' },
  };

  write('\x1b[1mWelcome to Node.js v22.14.0.\x1b[0m\r\nType ".help" for more information.\r\n> ');
  let currentLine = '';

  return {
    type: 'node_repl',
    title: 'node (REPL)',
    data: { nodeContext },
    onData: (data: string, termWrite: (text: string) => void) => {
      // Ctrl+D or Ctrl+C
      if (data === '\x04' || data === '\x03') {
        termWrite('\r\n\x1b[38;2;120;120;140m[Exited Node REPL session]\x1b[0m\r\n');
        return false;
      }

      // Enter
      if (data === '\r' || data === '\n') {
        termWrite('\r\n');
        const trimmed = currentLine.trim();

        if (trimmed === '.exit' || trimmed === 'exit' || trimmed === 'process.exit()') {
          termWrite('\x1b[38;2;120;120;140m[Exited Node REPL session]\x1b[0m\r\n');
          return false;
        }

        if (trimmed) {
          if (trimmed === '.help') {
            termWrite('.break    Sometimes you get stuck, this gets you out\r\n.clear    Break, and also clear the local context\r\n.editor   Enter editor mode\r\n.exit     Exit the REPL\r\n.help     Print this help message\r\n.load     Load JS from a file into the REPL session\r\n.save     Save all evaluated commands in this REPL session to a file\r\n');
          } else {
            try {
              // Safe evaluation inside function
              const keys = Object.keys(nodeContext);
              const values = Object.values(nodeContext);
              const fn = new Function(...keys, `return (${trimmed})`);
              const result = fn(...values);
              if (result !== undefined) {
                if (typeof result === 'object' && result !== null) {
                  termWrite(`\x1b[32m${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\x1b[0m\r\n`);
                } else if (typeof result === 'string') {
                  termWrite(`\x1b[32m'${result}'\x1b[0m\r\n`);
                } else if (typeof result === 'number') {
                  termWrite(`\x1b[33m${result}\x1b[0m\r\n`);
                } else if (typeof result === 'boolean') {
                  termWrite(`\x1b[35m${result}\x1b[0m\r\n`);
                } else {
                  termWrite(`${String(result)}\r\n`);
                }
              } else {
                termWrite('\x1b[90mundefined\x1b[0m\r\n');
              }
            } catch (e: any) {
              termWrite(`\x1b[31mUncaught ${e?.name || 'Error'}: ${e?.message || e}\x1b[0m\r\n`);
            }
          }
        }

        currentLine = '';
        termWrite('> ');
        return true;
      }

      // Backspace
      if (data === '\x7f' || data === '\b') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          termWrite('\b \b');
        }
        return true;
      }

      // Standard characters
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        currentLine += data;
        termWrite(data);
        return true;
      }

      return true;
    }
  };
}

// Helper expression evaluator for Python REPL
function evaluateExpression(expr: string, state: Record<string, any>): any {
  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;

  // Check state variable match
  if (state[expr] !== undefined) return state[expr];

  // String literals
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  // Math object functions
  const clean = expr
    .replace(/\bmath\.sqrt\b/g, 'Math.sqrt')
    .replace(/\bmath\.pi\b/g, 'Math.PI')
    .replace(/\bmath\.sin\b/g, 'Math.sin')
    .replace(/\bmath\.cos\b/g, 'Math.cos')
    .replace(/\bmath\.floor\b/g, 'Math.floor')
    .replace(/\blen\((.*?)\)/g, '($1).length');

  const keys = Object.keys(state);
  const values = Object.values(state);
  const fn = new Function(...keys, `return (${clean})`);
  return fn(...values);
}
