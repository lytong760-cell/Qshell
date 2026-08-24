import JSZip from 'jszip';
import { VFSNode } from '../types';

const STORAGE_KEY = 'qshell_vfs_data_v3';

export class VirtualFileSystem {
  private root: VFSNode;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.root = this.loadFromLocalStorage() || this.createDefaultTree();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('VFS listener error:', e);
      }
    }
  }

  private createDefaultTree(): VFSNode {
    const now = new Date().toISOString();

    const tree: VFSNode = {
      name: '/',
      path: '/',
      type: 'dir',
      size: 4096,
      createdAt: now,
      updatedAt: now,
      permissions: 'rwxr-xr-x',
      owner: 'root',
      group: 'root',
      children: {
        root: {
          name: 'root',
          path: '/root',
          type: 'dir',
          size: 4096,
          createdAt: now,
          updatedAt: now,
          permissions: 'rwx------',
          owner: 'root',
          group: 'root',
          children: {
            workspace: {
              name: 'workspace',
              path: '/root/workspace',
              type: 'dir',
              size: 4096,
              createdAt: now,
              updatedAt: now,
              permissions: 'rwxr-xr-x',
              owner: 'root',
              group: 'root',
              children: {
                'package.json': {
                  name: 'package.json',
                  path: '/root/workspace/package.json',
                  type: 'file',
                  size: 380,
                  createdAt: now,
                  updatedAt: now,
                  permissions: 'rw-r--r--',
                  owner: 'root',
                  group: 'root',
                  content: JSON.stringify({
                    name: 'workspace',
                    version: '1.0.0',
                    description: 'Node.js and Multi-language Workspace on Qshell',
                    main: 'index.js',
                    scripts: {
                      start: 'node index.js',
                      dev: 'node --watch index.js',
                      test: 'echo "All tests passed!"'
                    },
                    dependencies: {
                      chalk: '^5.3.0',
                      lodash: '^4.17.21'
                    },
                    devDependencies: {
                      typescript: '^5.5.4'
                    },
                    keywords: ['qshell', 'nodejs', 'npm'],
                    author: 'root <root@qshell.internal>',
                    license: 'MIT'
                  }, null, 2),
                },
                'index.js': {
                  name: 'index.js',
                  path: '/root/workspace/index.js',
                  type: 'file',
                  size: 420,
                  createdAt: now,
                  updatedAt: now,
                  permissions: 'rw-r--r--',
                  owner: 'root',
                  group: 'root',
                  content: `// Welcome to Qshell Node.js Environment!
const chalk = require('chalk');
const _ = require('lodash');

console.log(chalk.green.bold('✓ Qshell Node.js Runtime Ready'));
console.log('Node Version:', process.version);
console.log('Random sample:', _.sample(['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go']));
console.log('Run "npm install" or "npm install <pkg>" to manage packages.');
`,
                },
                'README.md': {
                  name: 'README.md',
                  path: '/root/workspace/README.md',
                  type: 'file',
                  size: 280,
                  createdAt: now,
                  updatedAt: now,
                  permissions: 'rw-r--r--',
                  owner: 'root',
                  group: 'root',
                  content: `# Qshell Developer Workspace

This environment supports full multi-language compilation and package management.

### Quick Start
- \`npm install\` - Install dependencies from package.json
- \`npm install <package>\` - Install a package (e.g. \`npm i axios\`)
- \`npm start\` - Run project entrypoint (\`node index.js\`)
`,
                }
              },
            },
            '.bashrc': {
              name: '.bashrc',
              path: '/root/.bashrc',
              type: 'file',
              size: 260,
              createdAt: now,
              updatedAt: now,
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              content: `# ~/.bashrc: executed by bash for non-login shells.
export PS1="\\[\\033[01;32m\\]root@qshell\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]# "
alias ll='ls -la'
alias cls='clear'
alias py='python3'
alias g='git'
alias r='run'
`,
            },
            '.gitconfig': {
              name: '.gitconfig',
              path: '/root/.gitconfig',
              type: 'file',
              size: 120,
              createdAt: now,
              updatedAt: now,
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              content: `[user]
    name = Qshell Developer
    email = root@qshell.internal
[core]
    editor = qshell-editor
    autocrlf = input
`,
            }
          }
        },
        etc: {
          name: 'etc',
          path: '/etc',
          type: 'dir',
          size: 4096,
          createdAt: now,
          updatedAt: now,
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          children: {
            'qshell.conf': {
              name: 'qshell.conf',
              path: '/etc/qshell.conf',
              type: 'file',
              size: 190,
              createdAt: now,
              updatedAt: now,
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              content: `[core]
version = 3.4.0-enterprise
dual_execution = true
cloud_sync = true
root_privilege = enforced
compilers_count = 30
`,
            },
            'os-release': {
              name: 'os-release',
              path: '/etc/os-release',
              type: 'file',
              size: 160,
              createdAt: now,
              updatedAt: now,
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              content: `NAME="Qshell DualOS Linux"
VERSION="2026.08 (LTS)"
ID=qshell
ID_LIKE=debian
PRETTY_NAME="Qshell DualOS Linux 6.8 (Browser/Cloud Container)"
`,
            },
            passwd: {
              name: 'passwd',
              path: '/etc/passwd',
              type: 'file',
              size: 120,
              createdAt: now,
              updatedAt: now,
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              content: `root:x:0:0:root:/root:/bin/qsh\nqshell:x:1000:1000:Qshell User:/home/qshell:/bin/bash\n`,
            }
          }
        },
        var: {
          name: 'var',
          path: '/var',
          type: 'dir',
          size: 4096,
          createdAt: now,
          updatedAt: now,
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          children: {
            log: {
              name: 'log',
              path: '/var/log',
              type: 'dir',
              size: 4096,
              createdAt: now,
              updatedAt: now,
              permissions: 'rwxr-xr-x',
              owner: 'root',
              group: 'root',
              children: {
                'qshell.log': {
                  name: 'qshell.log',
                  path: '/var/log/qshell.log',
                  type: 'file',
                  size: 280,
                  createdAt: now,
                  updatedAt: now,
                  permissions: 'rw-r--r--',
                  owner: 'root',
                  group: 'root',
                  content: `[2026-08-23 22:48:00] [SYSTEM] Qshell Kernel 6.8.0 initialized with 30 compilers.\n[2026-08-23 22:48:01] [VFS] Mounted in-browser virtual storage layer.\n[2026-08-23 22:48:01] [NET] Dual cloud execution bridge established.\n`,
                }
              }
            }
          }
        },
        tmp: {
          name: 'tmp',
          path: '/tmp',
          type: 'dir',
          size: 4096,
          createdAt: now,
          updatedAt: now,
          permissions: 'rwxrwxrwt',
          owner: 'root',
          group: 'root',
          children: {}
        }
      }
    };

    return tree;
  }

  public resolvePath(currentCwd: string, targetPath: string): string {
    if (!targetPath || targetPath === '.') return currentCwd;
    if (targetPath === '~' || targetPath.startsWith('~/')) {
      targetPath = targetPath.replace('~', '/root');
    }

    let absolute: string;
    if (targetPath.startsWith('/')) {
      absolute = targetPath;
    } else {
      absolute = `${currentCwd.replace(/\/$/, '')}/${targetPath}`;
    }

    const segments = absolute.split('/').filter(Boolean);
    const resolved: string[] = [];

    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        resolved.pop();
      } else {
        resolved.push(seg);
      }
    }

    return '/' + resolved.join('/');
  }

  public getNode(path: string): VFSNode | null {
    const cleanPath = path === '/' ? '/' : path.replace(/\/$/, '');
    if (cleanPath === '' || cleanPath === '/') return this.root;

    const parts = cleanPath.split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.children || !current.children[part]) {
        return null;
      }
      current = current.children[part];
    }

    return current;
  }

  public getFile(path: string): VFSNode | null {
    const node = this.getNode(path);
    return node && node.type === 'file' ? node : null;
  }

  public readFile(path: string): string | null {
    const node = this.getFile(path);
    return node && node.content !== undefined ? node.content : null;
  }

  public writeFile(path: string, content: string, language?: string): VFSNode {
    const cleanPath = path.replace(/\/$/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const parentPath = '/' + parts.join('/');

    let parent = this.getNode(parentPath);
    if (!parent) {
      this.createDirectory(parentPath);
      parent = this.getNode(parentPath)!;
    }

    if (parent.type !== 'dir') {
      throw new Error(`Parent '${parentPath}' is not a directory`);
    }

    if (!parent.children) {
      parent.children = {};
    }

    const now = new Date().toISOString();
    const existing = parent.children[fileName];

    const node: VFSNode = {
      name: fileName,
      path: cleanPath,
      type: 'file',
      content,
      size: new Blob([content]).size,
      updatedAt: now,
      createdAt: existing ? existing.createdAt : now,
      permissions: existing ? existing.permissions : 'rw-r--r--',
      owner: 'root',
      group: 'root',
      language: language || this.detectLanguage(fileName),
    };

    parent.children[fileName] = node;
    this.saveToLocalStorage();
    return node;
  }

  public createDirectory(path: string): VFSNode {
    const cleanPath = path === '/' ? '/' : path.replace(/\/$/, '');
    if (cleanPath === '/') return this.root;

    const parts = cleanPath.split('/').filter(Boolean);
    let current = this.root;
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      if (!current.children) {
        current.children = {};
      }

      if (!current.children[part]) {
        const now = new Date().toISOString();
        current.children[part] = {
          name: part,
          path: currentPath,
          type: 'dir',
          size: 4096,
          createdAt: now,
          updatedAt: now,
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          children: {},
        };
      }
      current = current.children[part];
    }

    this.saveToLocalStorage();
    return current;
  }

  public remove(path: string, recursive: boolean = false): boolean {
    const cleanPath = path.replace(/\/$/, '');
    if (cleanPath === '/' || cleanPath === '') return false;

    const parts = cleanPath.split('/').filter(Boolean);
    const targetName = parts.pop()!;
    const parentPath = '/' + parts.join('/');

    const parent = this.getNode(parentPath);
    if (!parent || !parent.children || !parent.children[targetName]) {
      return false;
    }

    const target = parent.children[targetName];
    if (target.type === 'dir' && Object.keys(target.children || {}).length > 0 && !recursive) {
      throw new Error(`Directory '${targetName}' not empty. Use -r flag.`);
    }

    delete parent.children[targetName];
    this.saveToLocalStorage();
    return true;
  }

  public listDirectory(path: string): VFSNode[] {
    const node = this.getNode(path);
    if (!node || node.type !== 'dir' || !node.children) {
      return [];
    }
    return Object.values(node.children);
  }

  public getAllFilesFlat(node: VFSNode = this.root): { path: string; content: string; name: string }[] {
    let results: { path: string; content: string; name: string }[] = [];
    if (node.type === 'file') {
      results.push({
        path: node.path,
        content: node.content || '',
        name: node.name,
      });
    } else if (node.children) {
      for (const child of Object.values(node.children)) {
        results = results.concat(this.getAllFilesFlat(child));
      }
    }
    return results;
  }

  public detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'c': case 'h': return 'c';
      case 'cpp': case 'hpp': case 'cc': return 'cpp';
      case 'rs': return 'rust';
      case 'go': return 'go';
      case 'java': return 'java';
      case 'cs': return 'csharp';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'swift': return 'swift';
      case 'kt': return 'kotlin';
      case 'dart': return 'dart';
      case 'lua': return 'lua';
      case 'r': return 'r';
      case 'pl': return 'perl';
      case 'ex': case 'exs': return 'elixir';
      case 'scala': return 'scala';
      case 'zig': return 'zig';
      case 'hs': return 'haskell';
      case 'sh': case 'bash': return 'bash';
      case 'jl': return 'julia';
      case 'clj': return 'clojure';
      case 'nim': return 'nim';
      case 'ml': return 'ocaml';
      case 'sql': return 'sql';
      case 'f90': case 'f95': return 'fortran';
      case 'erl': return 'erlang';
      case 'wat': case 'wasm': return 'wasm';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'md': return 'markdown';
      case 'env': return 'shell';
      default: return 'plaintext';
    }
  }

  public async exportAsZip(): Promise<Blob> {
    const zip = new JSZip();
    const files = this.getAllFilesFlat();
    for (const f of files) {
      const relPath = f.path.replace(/^\//, '');
      zip.file(relPath, f.content);
    }
    return await zip.generateAsync({ type: 'blob' });
  }

  public resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.root = this.createDefaultTree();
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    } catch (e) {
      console.warn('Could not save VFS to local storage:', e);
    }
    this.notifyListeners();
  }

  private loadFromLocalStorage(): VFSNode | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not parse VFS from local storage:', e);
    }
    return null;
  }
}

export const vfsInstance = new VirtualFileSystem();
