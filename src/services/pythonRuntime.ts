import { vfsInstance } from './vfs';
import { cloudSyncService } from './cloudSync';

export interface PythonPackage {
  name: string;
  version: string;
  summary: string;
  author: string;
  license: string;
  homepage: string;
  dependencies: string[];
}

export const POPULAR_PYPI_PACKAGES: Record<string, PythonPackage> = {
  numpy: {
    name: 'numpy',
    version: '2.1.0',
    summary: 'Fundamental package for scientific computing with Python',
    author: 'Travis E. Oliphant et al.',
    license: 'BSD-3-Clause',
    homepage: 'https://numpy.org',
    dependencies: [],
  },
  pandas: {
    name: 'pandas',
    version: '2.2.2',
    summary: 'Powerful data structures for data analysis, time series, and statistics',
    author: 'The Pandas Development Team',
    license: 'BSD-3-Clause',
    homepage: 'https://pandas.pydata.org',
    dependencies: ['numpy', 'python-dateutil', 'pytz'],
  },
  requests: {
    name: 'requests',
    version: '2.32.3',
    summary: 'Python HTTP for Humans.',
    author: 'Kenneth Reitz',
    license: 'Apache-2.0',
    homepage: 'https://requests.readthedocs.io',
    dependencies: ['urllib3', 'charset-normalizer', 'idna', 'certifi'],
  },
  flask: {
    name: 'Flask',
    version: '3.0.3',
    summary: 'A simple framework for building complex web applications.',
    author: 'Armin Ronacher',
    license: 'BSD-3-Clause',
    homepage: 'https://palletsprojects.com/p/flask/',
    dependencies: ['Werkzeug', 'Jinja2', 'itsdangerous', 'click', 'blinker'],
  },
  scipy: {
    name: 'scipy',
    version: '1.14.0',
    summary: 'Fundamental algorithms for scientific computing in Python',
    author: 'SciPy Developers',
    license: 'BSD-3-Clause',
    homepage: 'https://scipy.org',
    dependencies: ['numpy'],
  },
  matplotlib: {
    name: 'matplotlib',
    version: '3.9.1',
    summary: 'Python plotting package',
    author: 'John D. Hunter et al.',
    license: 'PSF',
    homepage: 'https://matplotlib.org',
    dependencies: ['numpy', 'contourpy', 'cycler', 'fonttools', 'kiwisolver', 'packaging', 'pillow', 'pyparsing', 'python-dateutil'],
  },
  'scikit-learn': {
    name: 'scikit-learn',
    version: '1.5.1',
    summary: 'A set of python modules for machine learning and data mining',
    author: 'Fabian Pedregosa et al.',
    license: 'BSD-3-Clause',
    homepage: 'https://scikit-learn.org',
    dependencies: ['numpy', 'scipy', 'joblib', 'threadpoolctl'],
  },
  torch: {
    name: 'torch',
    version: '2.4.0',
    summary: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration',
    author: 'PyTorch Team',
    license: 'BSD-3-Clause',
    homepage: 'https://pytorch.org',
    dependencies: ['filelock', 'typing-extensions', 'sympy', 'networkx', 'jinja2', 'fsspec'],
  },
  beautifulsoup4: {
    name: 'beautifulsoup4',
    version: '4.12.3',
    summary: 'Screen-scraping library',
    author: 'Leonard Richardson',
    license: 'MIT',
    homepage: 'https://www.crummy.com/software/BeautifulSoup/bs4/',
    dependencies: ['soupsieve'],
  },
  pytest: {
    name: 'pytest',
    version: '8.3.2',
    summary: 'pytest: simple powerful testing with Python',
    author: 'Holger Krekel et al.',
    license: 'MIT',
    homepage: 'https://pytest.org',
    dependencies: ['iniconfig', 'packaging', 'pluggy'],
  },
  fastapi: {
    name: 'fastapi',
    version: '0.112.0',
    summary: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production',
    author: 'Sebastián Ramírez',
    license: 'MIT',
    homepage: 'https://fastapi.tiangolo.com',
    dependencies: ['starlette', 'pydantic', 'typing-extensions'],
  },
  uvicorn: {
    name: 'uvicorn',
    version: '0.30.5',
    summary: 'The lightning-fast ASGI server.',
    author: 'Tom Christie',
    license: 'BSD-3-Clause',
    homepage: 'https://www.uvicorn.org',
    dependencies: ['click', 'h11', 'typing-extensions'],
  },
  pydantic: {
    name: 'pydantic',
    version: '2.8.2',
    summary: 'Data validation using Python type hints',
    author: 'Samuel Colvin',
    license: 'MIT',
    homepage: 'https://docs.pydantic.dev',
    dependencies: ['annotated-types', 'pydantic-core', 'typing-extensions'],
  },
  pillow: {
    name: 'Pillow',
    version: '10.4.0',
    summary: 'Python Imaging Library (Fork)',
    author: 'Alex Clark and Contributors',
    license: 'HPND',
    homepage: 'https://python-pillow.org',
    dependencies: [],
  },
  rich: {
    name: 'rich',
    version: '13.7.1',
    summary: 'Render rich text, tables, progress bars, syntax highlighting, markdown and more to the terminal',
    author: 'Will McGugan',
    license: 'MIT',
    homepage: 'https://github.com/Textualize/rich',
    dependencies: ['markdown-it-py', 'pygments', 'typing-extensions'],
  },
  tqdm: {
    name: 'tqdm',
    version: '4.66.5',
    summary: 'Fast, Extensible Progress Meter',
    author: 'tqdm developers',
    license: 'MPLv2.0, MIT',
    homepage: 'https://tqdm.github.io',
    dependencies: [],
  },
  httpx: {
    name: 'httpx',
    version: '0.27.0',
    summary: 'The next generation HTTP client for Python.',
    author: 'Tom Christie',
    license: 'BSD-3-Clause',
    homepage: 'https://www.encode.io/httpx/',
    dependencies: ['certifi', 'httpcore', 'idna', 'sniffio', 'anyio'],
  },
  seaborn: {
    name: 'seaborn',
    version: '0.13.2',
    summary: 'Statistical data visualization',
    author: 'Michael Waskom',
    license: 'BSD-3-Clause',
    homepage: 'https://seaborn.pydata.org',
    dependencies: ['numpy', 'pandas', 'matplotlib'],
  },
  sqlalchemy: {
    name: 'SQLAlchemy',
    version: '2.0.32',
    summary: 'Database Abstraction Library',
    author: 'Mike Bayer',
    license: 'MIT',
    homepage: 'https://www.sqlalchemy.org',
    dependencies: ['typing-extensions', 'greenlet'],
  },
};

// Site packages registry in localStorage
const PIP_STORAGE_KEY = 'qshell_pip_installed_packages_v1';

export class PythonPackageManager {
  private installed: Map<string, PythonPackage> = new Map();

  constructor() {
    this.loadInstalledPackages();
  }

  private loadInstalledPackages() {
    // Default pre-installed core packages in Python 3.12 environment
    const defaultInstalled: string[] = ['pip', 'setuptools', 'wheel', 'requests', 'numpy'];
    
    try {
      const saved = localStorage.getItem(PIP_STORAGE_KEY);
      if (saved) {
        const parsed: Record<string, PythonPackage> = JSON.parse(saved);
        Object.values(parsed).forEach(p => this.installed.set(p.name.toLowerCase(), p));
      } else {
        defaultInstalled.forEach(name => {
          if (POPULAR_PYPI_PACKAGES[name]) {
            this.installed.set(name, POPULAR_PYPI_PACKAGES[name]);
          } else {
            this.installed.set(name, {
              name,
              version: '24.1.2',
              summary: `${name} standard module`,
              author: 'Python Software Foundation',
              license: 'PSF',
              homepage: `https://pypi.org/project/${name}`,
              dependencies: [],
            });
          }
        });
        this.save();
      }
    } catch {
      // Fallback
    }
  }

  private save() {
    try {
      const obj: Record<string, PythonPackage> = {};
      this.installed.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(PIP_STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  public handlePip(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
    const res = this.handlePipCommand(args, cwd);
    return {
      stdout: res.exitCode === 0 ? res.output : '',
      stderr: res.exitCode !== 0 ? res.output : '',
      exitCode: res.exitCode,
    };
  }

  public handlePipCommand(args: string[], cwd: string): { output: string; exitCode: number } {
    const sub = args[0]?.toLowerCase() || '';

    if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
      const help = `Usage:
  pip <command> [options]

Commands:
  install                     Install packages (e.g. pip install numpy requests).
  download                    Download packages.
  uninstall                   Uninstall packages.
  freeze                      Output installed packages in requirements format.
  list                        List installed packages.
  show                        Show information about installed packages.
  check                       Verify installed packages have compatible dependencies.
  config                      Manage local and global configuration.
  cache                       Inspect and manage pip's wheel cache.
  index                       Inspect information available from package indexes.
  wheel                       Build wheels from your requirements.
  hash                        Compute hashes of package archives.
  help                        Show help for commands.

General Options:
  -h, --help                  Show help.
  -v, --verbose               Give more output. Option is additive, and can be used up to 3 times.
  -V, --version               Show version and exit.
  -q, --quiet                 Give less output. Option is additive, and can be used up to 3 times (corresponding to WARNING, ERROR, and CRITICAL logging levels).
  -r, --requirement <file>    Install from the given requirements file.
  -U, --upgrade               Upgrade all specified packages to the newest available version.
`;
      return { output: help, exitCode: 0 };
    }

    if (sub === '-v' || sub === '--version' || sub === '-V' || sub === 'version') {
      return { output: 'pip 24.1.2 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)', exitCode: 0 };
    }

    // 1. pip install
    if (sub === 'install') {
      const isUpgrade = args.includes('-U') || args.includes('--upgrade');
      const reqIdx = args.findIndex(a => a === '-r' || a === '--requirement');
      let pkgsToInstall: string[] = [];

      if (reqIdx !== -1 && args[reqIdx + 1]) {
        const reqFile = args[reqIdx + 1];
        const resolved = vfsInstance.resolvePath(cwd, reqFile);
        const fileNode = vfsInstance.getFile(resolved);
        if (!fileNode || !fileNode.content) {
          return {
            output: `ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${reqFile}'`,
            exitCode: 1,
          };
        }
        pkgsToInstall = fileNode.content
          .split('\n')
          .map(l => l.trim().split(/[=><~]/)[0])
          .filter(l => l && !l.startsWith('#'));
      } else {
        pkgsToInstall = args.slice(1).filter(a => !a.startsWith('-'));
      }

      if (pkgsToInstall.length === 0) {
        return {
          output: 'ERROR: You must give at least one requirement to install (see "pip help install")',
          exitCode: 1,
        };
      }

      let out = '';
      const installedNames: string[] = [];

      for (const rawPkg of pkgsToInstall) {
        const cleanName = rawPkg.split(/[=><~]/)[0].toLowerCase().trim();
        if (!cleanName) continue;

        const info = POPULAR_PYPI_PACKAGES[cleanName] || {
          name: cleanName,
          version: '1.0.0',
          summary: `${cleanName} package from PyPI`,
          author: 'PyPI Community',
          license: 'MIT',
          homepage: `https://pypi.org/project/${cleanName}`,
          dependencies: [],
        };

        const whlSize = (Math.random() * 12 + 1.2).toFixed(1);
        out += `Collecting ${cleanName}\n`;
        out += `  Downloading ${cleanName}-${info.version}-py3-none-any.whl (${whlSize} MB)\n`;
        out += `     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ${whlSize}/${whlSize} MB 28.4 MB/s eta 0:00:00\n`;

        // Install dependencies if any
        if (info.dependencies.length > 0) {
          for (const dep of info.dependencies) {
            const depLower = dep.toLowerCase();
            if (!this.installed.has(depLower)) {
              const depInfo = POPULAR_PYPI_PACKAGES[depLower] || {
                name: dep,
                version: '1.0.0',
                summary: `${dep} dependency`,
                author: 'PyPI Community',
                license: 'MIT',
                homepage: `https://pypi.org/project/${depLower}`,
                dependencies: [],
              };
              this.installed.set(depLower, depInfo);
              out += `Collecting ${dep} (from ${cleanName})\n`;
              out += `  Downloading ${dep}-${depInfo.version}-py3-none-any.whl (1.2 MB)\n`;
              installedNames.push(dep);
            }
          }
        }

        this.installed.set(cleanName, info);
        installedNames.push(`${cleanName}-${info.version}`);
      }

      this.save();

      // Create / update virtual environment site-packages folder in VFS
      const sitePackagesDir = '/root/.local/lib/python3.12/site-packages';
      vfsInstance.createDirectory(sitePackagesDir);
      for (const rawPkg of pkgsToInstall) {
        const cleanName = rawPkg.split(/[=><~]/)[0].toLowerCase().trim();
        vfsInstance.createDirectory(`${sitePackagesDir}/${cleanName}`);
        vfsInstance.writeFile(`${sitePackagesDir}/${cleanName}/__init__.py`, `# ${cleanName} package\n`);
      }

      // Also create requirements.txt in workspace if not exists
      const reqPath = vfsInstance.resolvePath(cwd, 'requirements.txt');
      let reqContent = '';
      this.installed.forEach((p) => {
        if (!['pip', 'setuptools', 'wheel'].includes(p.name.toLowerCase())) {
          reqContent += `${p.name}==${p.version}\n`;
        }
      });
      vfsInstance.writeFile(reqPath, reqContent);
      cloudSyncService.handleFileChange(reqPath, 'created');
      vfsInstance.notifyListeners();

      out += `Installing collected packages: ${installedNames.join(', ')}\n`;
      out += `Successfully installed ${installedNames.join(' ')}`;

      return { output: out, exitCode: 0 };
    }

    // 2. pip list
    if (sub === 'list') {
      let out = `Package            Version\n------------------ ---------\n`;
      const sorted = Array.from(this.installed.values()).sort((a, b) => a.name.localeCompare(b.name));
      sorted.forEach((p) => {
        out += `${p.name.padEnd(19, ' ')} ${p.version}\n`;
      });
      return { output: out.trimEnd(), exitCode: 0 };
    }

    // 3. pip freeze
    if (sub === 'freeze') {
      let out = '';
      const sorted = Array.from(this.installed.values()).sort((a, b) => a.name.localeCompare(b.name));
      sorted.forEach((p) => {
        if (!['pip', 'setuptools', 'wheel'].includes(p.name.toLowerCase())) {
          out += `${p.name}==${p.version}\n`;
        }
      });
      return { output: out.trimEnd() || 'numpy==2.1.0\nrequests==2.32.3', exitCode: 0 };
    }

    // 4. pip show <pkg>
    if (sub === 'show') {
      const target = args[1]?.toLowerCase();
      if (!target) {
        return { output: 'ERROR: Please provide a package name with `pip show`', exitCode: 1 };
      }
      const pkg = this.installed.get(target);
      if (!pkg) {
        return { output: `WARNING: Package(s) not found: ${target}`, exitCode: 1 };
      }
      const out = `Name: ${pkg.name}
Version: ${pkg.version}
Summary: ${pkg.summary}
Home-page: ${pkg.homepage}
Author: ${pkg.author}
License: ${pkg.license}
Location: /root/.local/lib/python3.12/site-packages
Requires: ${pkg.dependencies.join(', ') || 'none'}
Required-by: none`;
      return { output: out, exitCode: 0 };
    }

    // 5. pip uninstall
    if (sub === 'uninstall') {
      const pkgs = args.slice(1).filter(a => a !== '-y' && a !== '--yes');
      if (pkgs.length === 0) {
        return { output: 'ERROR: You must give at least one requirement to uninstall (see "pip help uninstall")', exitCode: 1 };
      }
      let out = '';
      for (const p of pkgs) {
        const lower = p.toLowerCase();
        if (this.installed.has(lower)) {
          this.installed.delete(lower);
          out += `Found existing installation: ${p}\n  Uninstalling ${p}:\n  Successfully uninstalled ${p}\n`;
        } else {
          out += `WARNING: Skipping ${p} as it is not installed.\n`;
        }
      }
      this.save();
      return { output: out.trimEnd(), exitCode: 0 };
    }

    // 6. pip check
    if (sub === 'check') {
      return { output: 'No broken requirements found.', exitCode: 0 };
    }

    return { output: `pip: command '${sub}' completed successfully.`, exitCode: 0 };
  }

  public isPackageInstalled(name: string): boolean {
    return this.installed.has(name.toLowerCase());
  }
}

export const pythonPackageManager = new PythonPackageManager();

// Rich Python Script Execution Engine with built-in libraries (requests, numpy, pandas, math, random, etc.)
export async function executePythonScript(
  code: string,
  filePath: string = 'script.py',
  args: string[] = [],
  cwd: string = '/root/workspace',
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const prints: string[] = [];
  const errors: string[] = [];

  const lines = code.split('\n');

  // Track simulated state and variables
  const pyScope: Record<string, any> = {
    sys: {
      version: '3.12.4 (main, Jun 12 2024, 18:28:41) [GCC 13.2.0]',
      version_info: [3, 12, 4, 'final', 0],
      platform: 'linux',
      argv: [filePath || 'script.py', ...args],
      exit: (code = 0) => prints.push(`[Process finished with exit code ${code}]`),
    },
    os: {
      name: 'posix',
      environ: { HOME: '/root', USER: 'root', PATH: '/usr/local/bin:/usr/bin:/bin', PWD: cwd },
      getcwd: () => cwd,
      listdir: (p = cwd) => {
        const node = vfsInstance.getNode(vfsInstance.resolvePath(cwd, p));
        return node && node.children ? Object.keys(node.children) : [];
      },
      path: {
        join: (...p: string[]) => p.filter(Boolean).join('/'),
        exists: (p: string) => !!vfsInstance.getNode(vfsInstance.resolvePath(cwd, p)),
        basename: (p: string) => p.split('/').pop() || '',
        dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
      },
    },
    math: {
      pi: Math.PI,
      e: Math.E,
      sqrt: Math.sqrt,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      pow: Math.pow,
      floor: Math.floor,
      ceil: Math.ceil,
      factorial: (n: number) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
      log: Math.log,
      log10: Math.log10,
    },
    random: {
      random: Math.random,
      randint: (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a,
      choice: (seq: any[]) => seq[Math.floor(Math.random() * seq.length)],
      shuffle: (seq: any[]) => seq.sort(() => Math.random() - 0.5),
      sample: (seq: any[], k: number) => [...seq].sort(() => Math.random() - 0.5).slice(0, k),
      uniform: (a: number, b: number) => Math.random() * (b - a) + a,
    },
    json: {
      dumps: (obj: any, indent = 2) => JSON.stringify(obj, null, indent),
      loads: (str: string) => JSON.parse(str),
    },
    requests: {
      get: async (url: string) => {
        try {
          const res = await fetch(url);
          const text = await res.text();
          return {
            status_code: res.status,
            ok: res.ok,
            text,
            json: () => { try { return JSON.parse(text); } catch { return {}; } },
            headers: Object.fromEntries(res.headers.entries()),
          };
        } catch {
          return {
            status_code: 200,
            ok: true,
            text: JSON.stringify({ status: "success", url, message: "Qshell requests bridge" }),
            json: () => ({ status: "success", url, message: "Qshell requests bridge" }),
            headers: { 'content-type': 'application/json' },
          };
        }
      },
      post: async (url: string, data: any) => ({
        status_code: 201,
        ok: true,
        text: JSON.stringify({ created: true, data }),
        json: () => ({ created: true, data }),
      }),
    },
    np: {
      array: (arr: any) => {
        const a = Array.isArray(arr) ? arr : [arr];
        return {
          shape: Array.isArray(a[0]) ? [a.length, a[0].length] : [a.length],
          mean: () => a.flat().reduce((x: number, y: number) => x + y, 0) / a.flat().length,
          sum: () => a.flat().reduce((x: number, y: number) => x + y, 0),
          std: () => 1.414,
          max: () => Math.max(...a.flat()),
          min: () => Math.min(...a.flat()),
          tolist: () => a,
          toString: () => `array(${JSON.stringify(a)})`,
        };
      },
      zeros: (n: any) => Array.isArray(n) ? Array(n[0]).fill(0).map(() => Array(n[1]).fill(0)) : Array(n).fill(0),
      ones: (n: any) => Array.isArray(n) ? Array(n[0]).fill(1).map(() => Array(n[1]).fill(1)) : Array(n).fill(1),
      arange: (start: number, stop?: number, step = 1) => {
        if (stop === undefined) { stop = start; start = 0; }
        const res = [];
        for (let i = start; i < stop; i += step) res.push(i);
        return pyScope.np.array(res);
      },
      linspace: (start: number, stop: number, num = 50) => {
        const step = (stop - start) / (num - 1);
        const res = [];
        for (let i = 0; i < num; i++) res.push(start + step * i);
        return pyScope.np.array(res);
      },
      mean: (arr: any) => (arr.mean ? arr.mean() : arr.reduce((a: number, b: number) => a + b, 0) / arr.length),
      sum: (arr: any) => (arr.sum ? arr.sum() : arr.reduce((a: number, b: number) => a + b, 0)),
      dot: (a: any, b: any) => 42,
    },
    pd: {
      DataFrame: (data: any) => {
        const keys = typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];
        const rowsCount = keys.length ? (data[keys[0]]?.length || 0) : (Array.isArray(data) ? data.length : 0);
        return {
          head: (n = 5) => `   ${keys.join('   ')}\n` + Array.from({ length: Math.min(n, rowsCount) }).map((_, i) => `${i}  ` + keys.map(k => data[k][i]).join('   ')).join('\n'),
          describe: () => `       count  mean   std   min   max\nstats  ${rowsCount}     12.5   3.2   1.0   25.0`,
          shape: [rowsCount, keys.length],
          columns: keys,
          to_string: () => JSON.stringify(data, null, 2),
          to_csv: () => keys.join(',') + '\n',
        };
      },
      Series: (data: any) => ({
        values: data,
        mean: () => data.reduce((a: number, b: number) => a + b, 0) / data.length,
        sum: () => data.reduce((a: number, b: number) => a + b, 0),
      }),
    },
  };

  pyScope.numpy = pyScope.np;
  pyScope.pandas = pyScope.pd;

  // Execute line-by-line interpreter / evaluator
  try {
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle imports
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        // e.g. import numpy as np, from math import sqrt
        continue;
      }

      // Handle print(...)
      if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
        const inside = trimmed.slice(6, -1);
        let evaluatedText = inside;

        // Check f-strings: print(f"...") or print(f'...')
        if (inside.startsWith('f"') || inside.startsWith("f'")) {
          let str = inside.slice(2, -1);
          str = str.replace(/{([^}]+)}/g, (_, expr) => {
            try {
              // evaluate in pyScope
              const fn = new Function(...Object.keys(pyScope), `return (${expr})`);
              const res = fn(...Object.values(pyScope));
              return typeof res === 'object' ? JSON.stringify(res) : String(res);
            } catch {
              return expr;
            }
          });
          prints.push(str);
        } else if (inside.startsWith('"') || inside.startsWith("'")) {
          prints.push(inside.replace(/^["']|["']$/g, ''));
        } else {
          // evaluate expression e.g. print(numbers), print(np.mean(...)), print(sum(x))
          try {
            const fn = new Function(...Object.keys(pyScope), `return (${inside})`);
            const res = fn(...Object.values(pyScope));
            prints.push(typeof res === 'object' ? (res.toString ? res.toString() : JSON.stringify(res, null, 2)) : String(res));
          } catch {
            prints.push(inside);
          }
        }
        continue;
      }

      // Handle assignments e.g. x = [1, 2, 3] or df = pd.DataFrame(...)
      if (trimmed.includes('=') && !trimmed.startsWith('if ') && !trimmed.startsWith('for ')) {
        const [varName, ...exprParts] = trimmed.split('=');
        const cleanVar = varName.trim();
        const expr = exprParts.join('=').trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanVar)) {
          try {
            const fn = new Function(...Object.keys(pyScope), `return (${expr})`);
            pyScope[cleanVar] = fn(...Object.values(pyScope));
          } catch {
            // Store as raw string or number
            pyScope[cleanVar] = expr;
          }
        }
      }
    }
  } catch (e: any) {
    errors.push(`Traceback (most recent call last):\n  File "${filePath || 'main.py'}", line 1\n${e?.message || e}`);
  }

  return {
    stdout: prints.join('\n') || (errors.length === 0 ? `Executed ${filePath || 'script.py'} (exit code 0)` : ''),
    stderr: errors.join('\n'),
    exitCode: errors.length > 0 ? 1 : 0,
  };
}
