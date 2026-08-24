export type ExecutionMode = 'browser' | 'cloud' | 'dual';

export interface VFSNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  size: number;
  updatedAt: string;
  createdAt: string;
  permissions: string; // e.g. "rwxr-xr-x"
  owner: string; // "root"
  group: string; // "root"
  children?: Record<string, VFSNode>;
  language?: string;
}

export interface CompilerRuntime {
  id: string;
  name: string;
  version: string;
  category: 'System' | 'Web & Scripting' | 'Compiled & Native' | 'Functional & Modern' | 'Data & Scientific';
  extension: string;
  command: string;
  runCommand: string;
  compileCommand?: string;
  icon: string;
  description: string;
  sampleCode: string;
  installed: boolean;
  replSupported: boolean;
  replPrompt?: string;
  popularRank: number;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system' | 'prompt' | 'badge' | 'table';
  content: string;
  timestamp: string;
  cwd?: string;
  user?: string;
  exitCode?: number;
  formatted?: boolean;
}

export interface TerminalTab {
  id: string;
  title: string;
  cwd: string;
  user: string;
  history: string[];
  historyIndex: number;
  lines: TerminalLine[];
  inRepl?: string | null;
  replSession?: any;
  created: number;
  active: boolean;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
  cursorLine?: number;
  cursorCol?: number;
}

export type StorageDestinationType = 'firebase' | 'github';

export interface FirebaseStorageConfig {
  enabled: boolean;
  projectId: string;
  databaseUrl?: string;
  collection: string;
  workspaceId: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
}

export interface GitHubStorageConfig {
  enabled: boolean;
  token: string;
  repo: string; // "username/repository"
  branch: string; // "main"
  autoCommitOnChange: boolean;
  commitMessageTemplate: string;
  authorName: string;
  authorEmail: string;
  lastSyncedAt?: string;
  lastCommitHash?: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
}

export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
  isSystem: boolean;
  isHidden: boolean;
  description?: string;
}

export type WorkspaceLayout = 'split' | 'editor-only' | 'terminal-only' | 'split-vertical';

export type TerminalThemeId = 'vscode-dark' | 'monokai' | 'dracula' | 'one-dark' | 'nord' | 'cyberpunk' | 'phosphor-green' | 'amber-crt';

export interface TerminalThemeConfig {
  id: TerminalThemeId;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TerminalPreferences {
  theme: TerminalThemeId;
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  lineHeight: number;
  scrollback: number;
  bellSound: boolean;
}

export interface SystemStats {
  cpuUsage: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  storageUsedKb: number;
  activeProcesses: number;
  networkStatus: 'connected' | 'offline' | 'cloud-dual';
}

