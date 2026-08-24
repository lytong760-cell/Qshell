import { vfsInstance } from './vfs';

// Helper to transpile ESM import/export to CommonJS and strip TypeScript types
export function transpileJavaScript(source: string, isTypeScript = false): string {
  let code = source;

  // Strip shebang line if present (e.g. #!/usr/bin/env node)
  code = code.replace(/^#!.*(\r?\n|$)/, '');

  // Strip TypeScript annotations if TS
  if (isTypeScript) {
    code = code
      .replace(/interface\s+[\w<>]+\s*\{[\s\S]*?\}/g, '')
      .replace(/type\s+[\w<>]+\s*=[\s\S]*?;/g, '')
      .replace(/:\s*[A-Za-z0-9_<>\[\]|&{}:, ]+(?=[=),;\n])/g, '')
      .replace(/as\s+[A-Za-z0-9_<>\[\]]+/g, '');
  }

  // Transform ESM imports to CommonJS requires
  // 1. import * as name from 'mod';
  code = code.replace(/import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"];?/g, 'const $1 = require("$2");');

  // 2. import name, { a, b } from 'mod';
  code = code.replace(
    /import\s+([A-Za-z0-9_$]+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g,
    (_, defaultName, namedImports, mod) => {
      return `const ${defaultName} = require("${mod}"); const { ${namedImports} } = ${defaultName};`;
    }
  );

  // 3. import { a as x, b } from 'mod';
  code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (_, namedImports, mod) => {
    const converted = namedImports
      .split(',')
      .map((item: string) => {
        const parts = item.trim().split(/\s+as\s+/);
        if (parts.length === 2) {
          return `${parts[0].trim()}: ${parts[1].trim()}`;
        }
        return item.trim();
      })
      .filter(Boolean)
      .join(', ');
    return `const { ${converted} } = require("${mod}");`;
  });

  // 4. import name from 'mod';
  code = code.replace(/import\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"];?/g, (_, defaultName, mod) => {
    return `const __mod_${defaultName} = require("${mod}"); const ${defaultName} = __mod_${defaultName} && __mod_${defaultName}.default !== undefined ? __mod_${defaultName}.default : __mod_${defaultName};`;
  });

  // 5. import 'mod';
  code = code.replace(/import\s+['"]([^'"]+)['"];?/g, 'require("$1");');

  // Transform ESM exports
  // export default ...
  code = code.replace(/export\s+default\s+([^;]+);?/g, 'module.exports = $1; module.exports.default = $1;');
  // export const/let/var/function/class
  code = code.replace(/export\s+(const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g, 'const $2 = exports.$2 =');
  code = code.replace(/export\s+(async\s+)?function\s+([A-Za-z0-9_$]+)/g, 'exports.$2 = $2; $1function $2');
  code = code.replace(/export\s+class\s+([A-Za-z0-9_$]+)/g, 'exports.$1 = class $1');
  code = code.replace(/export\s+\{([^}]+)\};?/g, (_, exportsList) => {
    const lines = exportsList
      .split(',')
      .map((item: string) => {
        const parts = item.trim().split(/\s+as\s+/);
        const local = parts[0]?.trim();
        const exported = parts[1]?.trim() || local;
        if (!local) return '';
        return `exports.${exported} = ${local};`;
      })
      .filter(Boolean)
      .join(' ');
    return lines;
  });

  return code;
}

// Built-in lodash utility functions polyfill
export function createLodashPolyfill() {
  const _ = {
    chunk: (arr: any[], size = 1) => {
      const res = [];
      for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
      return res;
    },
    map: (coll: any, fn: any) => {
      if (Array.isArray(coll)) return coll.map(typeof fn === 'function' ? fn : (x) => x[fn]);
      if (coll && typeof coll === 'object') {
        return Object.keys(coll).map((k) => (typeof fn === 'function' ? fn(coll[k], k) : coll[k][fn]));
      }
      return [];
    },
    filter: (coll: any, fn: any) => {
      if (Array.isArray(coll)) return coll.filter(typeof fn === 'function' ? fn : (x) => !!x[fn]);
      return [];
    },
    reduce: (arr: any[], fn: any, init: any) => arr.reduce(fn, init),
    groupBy: (arr: any[], key: any) => {
      return arr.reduce((acc, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        (acc[group] = acc[group] || []).push(item);
        return acc;
      }, {});
    },
    sortBy: (arr: any[], iteratees: any) => {
      const copy = [...arr];
      return copy.sort((a, b) => {
        const valA = typeof iteratees === 'function' ? iteratees(a) : a[iteratees];
        const valB = typeof iteratees === 'function' ? iteratees(b) : b[iteratees];
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      });
    },
    uniq: (arr: any[]) => Array.from(new Set(arr)),
    uniqBy: (arr: any[], fn: any) => {
      const seen = new Set();
      return arr.filter((item) => {
        const k = typeof fn === 'function' ? fn(item) : item[fn];
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },
    cloneDeep: (obj: any) => {
      if (obj === null || typeof obj !== 'object') return obj;
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch {
        return { ...obj };
      }
    },
    merge: (target: any, ...sources: any[]) => Object.assign(target, ...sources),
    range: (start: number, end?: number, step = 1) => {
      if (end === undefined) {
        end = start;
        start = 0;
      }
      const res = [];
      for (let i = start; step > 0 ? i < end : i > end; i += step) res.push(i);
      return res;
    },
    random: (min = 0, max = 1, floating = false) => {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      const val = Math.random() * (max - min) + min;
      return floating ? val : Math.floor(val);
    },
    debounce: (fn: any, wait = 0) => {
      let t: any;
      return (...args: any[]) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    },
    throttle: (fn: any, wait = 0) => {
      let last = 0;
      return (...args: any[]) => {
        const now = Date.now();
        if (now - last >= wait) {
          last = now;
          fn(...args);
        }
      };
    },
    isEmpty: (val: any) => {
      if (!val) return true;
      if (Array.isArray(val) || typeof val === 'string') return val.length === 0;
      if (typeof val === 'object') return Object.keys(val).length === 0;
      return false;
    },
    isEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
    isNil: (val: any) => val === null || val === undefined,
    isObject: (val: any) => val !== null && typeof val === 'object',
    isArray: (val: any) => Array.isArray(val),
    isString: (val: any) => typeof val === 'string',
    isNumber: (val: any) => typeof val === 'number' && !isNaN(val),
    flatten: (arr: any[]) => arr.flat(),
    flattenDeep: (arr: any[]) => arr.flat(Infinity),
    compact: (arr: any[]) => arr.filter(Boolean),
    shuffle: (arr: any[]) => [...arr].sort(() => Math.random() - 0.5),
    sample: (arr: any[]) => arr[Math.floor(Math.random() * arr.length)],
    sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
    sumBy: (arr: any[], fn: any) => arr.reduce((a, b) => a + (typeof fn === 'function' ? fn(b) : b[fn] || 0), 0),
    mean: (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
    max: (arr: number[]) => Math.max(...arr),
    min: (arr: number[]) => Math.min(...arr),
    get: (obj: any, path: string, def?: any) => {
      const keys = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
      let cur = obj;
      for (const k of keys) {
        if (cur === null || cur === undefined) return def;
        cur = cur[k];
      }
      return cur !== undefined ? cur : def;
    },
    set: (obj: any, path: string, val: any) => {
      const keys = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = val;
      return obj;
    },
    has: (obj: any, path: string) => _.get(obj, path) !== undefined,
    pick: (obj: any, keys: string[]) => keys.reduce((acc: any, k) => (k in obj ? { ...acc, [k]: obj[k] } : acc), {}),
    omit: (obj: any, keys: string[]) => {
      const res = { ...obj };
      keys.forEach((k) => delete res[k]);
      return res;
    },
    keys: (obj: any) => Object.keys(obj || {}),
    values: (obj: any) => Object.values(obj || {}),
    capitalize: (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''),
    camelCase: (s: string) =>
      s.replace(/[-_](\w)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, (c) => c.toLowerCase()),
    kebabCase: (s: string) =>
      s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase(),
    snakeCase: (s: string) =>
      s.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase(),
  };
  return _;
}

// Built-in chalk ANSI color polyfill
export function createChalkPolyfill() {
  const createColor = (open: number, close: number) => {
    const fn = (str: any) => `\x1b[${open}m${str}\x1b[${close}m`;
    fn.bold = (str: any) => `\x1b[1m\x1b[${open}m${str}\x1b[${close}m\x1b[22m`;
    fn.italic = (str: any) => `\x1b[3m\x1b[${open}m${str}\x1b[${close}m\x1b[23m`;
    fn.underline = (str: any) => `\x1b[4m\x1b[${open}m${str}\x1b[${close}m\x1b[24m`;
    return fn;
  };

  const chalk: any = {
    red: createColor(31, 39),
    green: createColor(32, 39),
    yellow: createColor(33, 39),
    blue: createColor(34, 39),
    magenta: createColor(35, 39),
    cyan: createColor(36, 39),
    white: createColor(37, 39),
    gray: createColor(90, 39),
    grey: createColor(90, 39),
    black: createColor(30, 39),
    bgRed: createColor(41, 49),
    bgGreen: createColor(42, 49),
    bgYellow: createColor(43, 49),
    bgBlue: createColor(44, 49),
    bgCyan: createColor(46, 49),
    bgWhite: createColor(47, 49),
    bold: createColor(1, 22),
    dim: createColor(2, 22),
    italic: createColor(3, 23),
    underline: createColor(4, 24),
    inverse: createColor(7, 27),
    hidden: createColor(8, 28),
    strikethrough: createColor(9, 29),
    hex: (hexColor: string) => (str: any) => str,
    rgb: (r: number, g: number, b: number) => (str: any) => `\x1b[38;2;${r};${g};${b}m${str}\x1b[39m`,
  };
  return chalk;
}

// Built-in axios HTTP client polyfill backed by fetch
export function createAxiosPolyfill() {
  const axiosInstance: any = async (configOrUrl: any, maybeConfig: any = {}) => {
    const url = typeof configOrUrl === 'string' ? configOrUrl : configOrUrl?.url;
    const config = typeof configOrUrl === 'string' ? maybeConfig : configOrUrl;
    const method = (config.method || 'GET').toUpperCase();

    try {
      const res = await fetch(url, {
        method,
        headers: config.headers || {},
        body: config.data ? (typeof config.data === 'object' ? JSON.stringify(config.data) : config.data) : undefined,
      });

      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      return {
        data,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        config,
        request: {},
      };
    } catch (e: any) {
      // Fallback mock response for intranet/external URLs blocked by CORS
      return {
        data: { message: `Simulated response for ${url}`, url, ok: true, timestamp: Date.now() },
        status: 200,
        statusText: 'OK (Qshell Net-Proxy)',
        headers: { 'content-type': 'application/json' },
        config,
      };
    }
  };

  axiosInstance.get = (url: string, config: any = {}) => axiosInstance({ ...config, url, method: 'GET' });
  axiosInstance.post = (url: string, data: any, config: any = {}) => axiosInstance({ ...config, url, data, method: 'POST' });
  axiosInstance.put = (url: string, data: any, config: any = {}) => axiosInstance({ ...config, url, data, method: 'PUT' });
  axiosInstance.delete = (url: string, config: any = {}) => axiosInstance({ ...config, url, method: 'DELETE' });
  axiosInstance.patch = (url: string, data: any, config: any = {}) => axiosInstance({ ...config, url, data, method: 'PATCH' });
  axiosInstance.head = (url: string, config: any = {}) => axiosInstance({ ...config, url, method: 'HEAD' });
  axiosInstance.create = (defaults: any = {}) => {
    const inst = (u: any, c: any) => axiosInstance(u, { ...defaults, ...c });
    inst.get = (u: string, c: any) => axiosInstance.get(u, { ...defaults, ...c });
    inst.post = (u: string, d: any, c: any) => axiosInstance.post(u, d, { ...defaults, ...c });
    return inst;
  };
  axiosInstance.all = (promises: Promise<any>[]) => Promise.all(promises);
  axiosInstance.spread = (callback: (...args: any[]) => any) => (arr: any[]) => callback(...arr);
  axiosInstance.isAxiosError = () => false;

  return axiosInstance;
}

// Built-in UUID polyfill
export function createUuidPolyfill() {
  const v4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  return {
    v4,
    v1: v4,
    validate: (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s),
    version: () => 4,
    NIL: '00000000-0000-0000-0000-000000000000',
  };
}

// Built-in dayjs / moment polyfill
export function createDayjsPolyfill() {
  const dayjsFn: any = (dateInput?: any) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    return {
      format: (fmt = 'YYYY-MM-DDTHH:mm:ssZ') => {
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return fmt
          .replace('YYYY', String(YYYY))
          .replace('MM', MM)
          .replace('DD', DD)
          .replace('HH', HH)
          .replace('mm', mm)
          .replace('ss', ss);
      },
      add: (amount: number, unit: string) => {
        const copy = new Date(d);
        if (unit.startsWith('d')) copy.setDate(copy.getDate() + amount);
        else if (unit.startsWith('m')) copy.setMinutes(copy.getMinutes() + amount);
        else if (unit.startsWith('h')) copy.setHours(copy.getHours() + amount);
        else if (unit.startsWith('y')) copy.setFullYear(copy.getFullYear() + amount);
        return dayjsFn(copy);
      },
      subtract: (amount: number, unit: string) => dayjsFn(d).add(-amount, unit),
      diff: (other: any, unit = 'ms') => {
        const otherD = other ? (other.toDate ? other.toDate() : new Date(other)) : new Date();
        const diffMs = d.getTime() - otherD.getTime();
        if (unit.startsWith('d')) return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (unit.startsWith('h')) return Math.floor(diffMs / (1000 * 60 * 60));
        if (unit.startsWith('m')) return Math.floor(diffMs / (1000 * 60));
        if (unit.startsWith('s')) return Math.floor(diffMs / 1000);
        return diffMs;
      },
      isValid: () => !isNaN(d.getTime()),
      toDate: () => d,
      toISOString: () => d.toISOString(),
      unix: () => Math.floor(d.getTime() / 1000),
      valueOf: () => d.getTime(),
    };
  };
  return dayjsFn;
}

// Built-in zod validator polyfill
export function createZodPolyfill() {
  const z: any = {
    string: () => ({ parse: (v: any) => String(v), safeParse: (v: any) => ({ success: typeof v === 'string', data: v }), optional: () => z.string(), min: () => z.string(), max: () => z.string(), email: () => z.string() }),
    number: () => ({ parse: (v: any) => Number(v), safeParse: (v: any) => ({ success: typeof v === 'number', data: v }), optional: () => z.number(), min: () => z.number(), max: () => z.number() }),
    boolean: () => ({ parse: (v: any) => Boolean(v), safeParse: (v: any) => ({ success: typeof v === 'boolean', data: v }), optional: () => z.boolean() }),
    array: (inner: any) => ({ parse: (v: any) => (Array.isArray(v) ? v : [v]), safeParse: (v: any) => ({ success: Array.isArray(v), data: v }), optional: () => z.array(inner) }),
    object: (shape: any) => ({
      shape,
      parse: (v: any) => v,
      safeParse: (v: any) => ({ success: typeof v === 'object' && v !== null, data: v }),
      optional: () => z.object(shape),
    }),
    enum: (vals: string[]) => ({ parse: (v: any) => v, safeParse: (v: any) => ({ success: vals.includes(v), data: v }) }),
    infer: {} as any,
  };
  return { z, default: z };
}

// Create a rich module resolver / require() environment for Node.js
export function createNodeRequire(
  cwd: string = '/root/workspace',
  customEnv: Record<string, any> = {},
  customConsole: any = console,
  customProcess: any = { env: {}, cwd: () => cwd }
) {
  const loadedModulesCache: Record<string, any> = {};

  const customRequire = (moduleName: string): any => {
    if (loadedModulesCache[moduleName]) {
      return loadedModulesCache[moduleName];
    }

    // 1. Relative and Absolute File Requires
    if (moduleName.startsWith('./') || moduleName.startsWith('../') || moduleName.startsWith('/')) {
      const possibleExtensions = ['', '.js', '.ts', '.json', '.mjs', '.cjs'];
      let targetPath = '';
      let targetNode = null;

      for (const ext of possibleExtensions) {
        const checkPath = vfsInstance.resolvePath(cwd, moduleName + ext);
        const node = vfsInstance.getFile(checkPath);
        if (node) {
          targetPath = checkPath;
          targetNode = node;
          break;
        }
      }

      // Also check index.js / index.ts in directory
      if (!targetNode) {
        for (const ext of ['.js', '.ts', '.json']) {
          const checkPath = vfsInstance.resolvePath(cwd, `${moduleName}/index${ext}`);
          const node = vfsInstance.getFile(checkPath);
          if (node) {
            targetPath = checkPath;
            targetNode = node;
            break;
          }
        }
      }

      if (targetNode && targetNode.content) {
        if (targetPath.endsWith('.json')) {
          try {
            const parsed = JSON.parse(targetNode.content);
            loadedModulesCache[moduleName] = parsed;
            return parsed;
          } catch {
            return {};
          }
        }

        const moduleObj = { exports: {} as any };
        const transpiled = transpileJavaScript(targetNode.content, targetPath.endsWith('.ts'));
        const dirName = targetPath.split('/').slice(0, -1).join('/') || '/';
        const modRequire = createNodeRequire(dirName, customEnv, customConsole, customProcess);

        const modFn = new Function(
          'exports',
          'require',
          'module',
          '__filename',
          '__dirname',
          'console',
          'process',
          transpiled
        );
        modFn(moduleObj.exports, modRequire, moduleObj, targetPath, dirName, customConsole, customProcess);
        loadedModulesCache[moduleName] = moduleObj.exports;
        return moduleObj.exports;
      }
    }

    // 2. Node Core Built-in Modules
    if (moduleName === 'path') {
      const pathMod = {
        join: (...p: string[]) => p.filter(Boolean).join('/').replace(/\/+/g, '/'),
        resolve: (...p: string[]) => vfsInstance.resolvePath(cwd, p.join('/')),
        basename: (p: string, ext?: string) => {
          let base = p.split('/').pop() || '';
          if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length);
          return base;
        },
        dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
        extname: (p: string) => {
          const parts = p.split('.');
          return parts.length > 1 ? '.' + parts.pop() : '';
        },
        parse: (p: string) => {
          const root = p.startsWith('/') ? '/' : '';
          const dir = pathMod.dirname(p);
          const base = pathMod.basename(p);
          const ext = pathMod.extname(p);
          const name = pathMod.basename(p, ext);
          return { root, dir, base, ext, name };
        },
        sep: '/',
        delimiter: ':',
        isAbsolute: (p: string) => p.startsWith('/'),
        relative: (from: string, to: string) => to,
      };
      return pathMod;
    }

    if (moduleName === 'fs' || moduleName === 'node:fs' || moduleName === 'fs/promises') {
      const fsMod: any = {
        readFileSync: (p: string, enc = 'utf8') => {
          const resP = vfsInstance.resolvePath(cwd, p);
          const file = vfsInstance.getFile(resP);
          if (!file) throw new Error(`ENOENT: no such file or directory, open '${resP}'`);
          return file.content || '';
        },
        writeFileSync: (p: string, data: any) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          vfsInstance.writeFile(resP, typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));
          vfsInstance.notifyListeners();
        },
        appendFileSync: (p: string, data: any) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          const prev = vfsInstance.getFile(resP)?.content || '';
          vfsInstance.writeFile(resP, prev + String(data));
          vfsInstance.notifyListeners();
        },
        existsSync: (p: string) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          return !!vfsInstance.getNode(resP);
        },
        readdirSync: (p: string) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          const node = vfsInstance.getNode(resP);
          return node && node.children ? Object.keys(node.children) : [];
        },
        mkdirSync: (p: string) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          vfsInstance.createDirectory(resP);
          vfsInstance.notifyListeners();
        },
        unlinkSync: (p: string) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          vfsInstance.remove(resP, true);
          vfsInstance.notifyListeners();
        },
        statSync: (p: string) => {
          const resP = vfsInstance.resolvePath(cwd, p);
          const node = vfsInstance.getNode(resP);
          if (!node) throw new Error(`ENOENT: no such file or directory, stat '${resP}'`);
          return {
            isFile: () => node.type === 'file',
            isDirectory: () => node.type === 'dir',
            size: node.size || (node.content?.length || 0),
            mtime: new Date(node.updatedAt || Date.now()),
          };
        },
        promises: {
          readFile: async (p: string) => fsMod.readFileSync(p),
          writeFile: async (p: string, d: any) => fsMod.writeFileSync(p, d),
          readdir: async (p: string) => fsMod.readdirSync(p),
          stat: async (p: string) => fsMod.statSync(p),
          mkdir: async (p: string) => fsMod.mkdirSync(p),
          unlink: async (p: string) => fsMod.unlinkSync(p),
        },
      };
      return moduleName === 'fs/promises' ? fsMod.promises : fsMod;
    }

    if (moduleName === 'os' || moduleName === 'node:os') {
      return {
        platform: () => 'linux',
        arch: () => 'x64',
        release: () => '6.8.0-qshell',
        type: () => 'Linux',
        homedir: () => '/root',
        hostname: () => 'qshell-cloud',
        tmpdir: () => '/tmp',
        cpus: () => [
          { model: 'Intel(R) Xeon(R) Platinum CPU @ 2.80GHz', speed: 2800 },
          { model: 'Intel(R) Xeon(R) Platinum CPU @ 2.80GHz', speed: 2800 },
        ],
        totalmem: () => 16 * 1024 * 1024 * 1024,
        freemem: () => 12 * 1024 * 1024 * 1024,
        userInfo: () => ({ username: 'root', uid: 0, gid: 0, shell: '/bin/bash', homedir: '/root' }),
      };
    }

    if (moduleName === 'util' || moduleName === 'node:util') {
      return {
        promisify: (fn: any) => (...args: any[]) =>
          new Promise((resolve, reject) => {
            fn(...args, (err: any, res: any) => (err ? reject(err) : resolve(res)));
          }),
        format: (...args: any[]) => args.map((x) => (typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x))).join(' '),
        inspect: (obj: any) => (typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)),
        isArray: Array.isArray,
        isBoolean: (v: any) => typeof v === 'boolean',
        isNumber: (v: any) => typeof v === 'number',
        isString: (v: any) => typeof v === 'string',
      };
    }

    if (moduleName === 'events' || moduleName === 'node:events') {
      class EventEmitter {
        private _events: Record<string, Function[]> = {};
        on(event: string, listener: Function) {
          (this._events[event] = this._events[event] || []).push(listener);
          return this;
        }
        addListener(event: string, listener: Function) {
          return this.on(event, listener);
        }
        once(event: string, listener: Function) {
          const g = (...args: any[]) => {
            this.removeListener(event, g);
            listener(...args);
          };
          return this.on(event, g);
        }
        emit(event: string, ...args: any[]) {
          if (!this._events[event]) return false;
          this._events[event].forEach((fn) => {
            try {
              fn(...args);
            } catch (e) {
              console.error(e);
            }
          });
          return true;
        }
        removeListener(event: string, listener: Function) {
          if (!this._events[event]) return this;
          this._events[event] = this._events[event].filter((f) => f !== listener);
          return this;
        }
        off(event: string, listener: Function) {
          return this.removeListener(event, listener);
        }
        removeAllListeners(event?: string) {
          if (event) delete this._events[event];
          else this._events = {};
          return this;
        }
      }
      return { EventEmitter, default: EventEmitter };
    }

    if (moduleName === 'crypto' || moduleName === 'node:crypto') {
      return {
        randomBytes: (size: number) => {
          const arr = new Uint8Array(size);
          for (let i = 0; i < size; i++) arr[i] = Math.floor(Math.random() * 256);
          return {
            toString: (enc = 'hex') => Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join(''),
          };
        },
        randomUUID: () => createUuidPolyfill().v4(),
        createHash: (algo = 'sha256') => {
          let str = '';
          return {
            update: (d: any) => {
              str += String(d);
              return this;
            },
            digest: (enc = 'hex') => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
              return Math.abs(hash).toString(16).padStart(32, '0');
            },
          };
        },
      };
    }

    if (moduleName === 'buffer' || moduleName === 'node:buffer') {
      const BufferPoly = {
        from: (data: any, enc = 'utf8') => {
          const str = String(data);
          return {
            toString: (e = 'utf8') => (e === 'base64' ? btoa(str) : str),
            length: str.length,
          };
        },
        alloc: (size: number) => ({ length: size, fill: () => {}, toString: () => '' }),
        isBuffer: () => false,
        concat: (list: any[]) => list.join(''),
      };
      return { Buffer: BufferPoly, default: BufferPoly };
    }

    if (moduleName === 'http' || moduleName === 'https' || moduleName === 'node:http' || moduleName === 'node:https') {
      return {
        get: (url: string, cb?: any) => {
          fetch(url)
            .then((r) => r.text())
            .then((t) => {
              if (cb) cb({ on: (e: string, fn: any) => (e === 'data' ? fn(t) : e === 'end' ? fn() : null) });
            });
          return { on: () => {} };
        },
        request: () => ({ on: () => {}, write: () => {}, end: () => {} }),
        createServer: (handler: any) => ({
          listen: (port: number, cb: any) => {
            customConsole.log(`[HTTP Server] Listening on http://localhost:${port}`);
            if (cb) cb();
          },
        }),
      };
    }

    if (moduleName === 'url' || moduleName === 'node:url') {
      return {
        URL: window.URL || URL,
        parse: (u: string) => {
          try {
            const parsed = new URL(u, 'http://localhost');
            return {
              protocol: parsed.protocol,
              host: parsed.host,
              hostname: parsed.hostname,
              port: parsed.port,
              pathname: parsed.pathname,
              search: parsed.search,
              query: parsed.searchParams.toString(),
            };
          } catch {
            return { pathname: u };
          }
        },
      };
    }

    if (moduleName === 'querystring' || moduleName === 'node:querystring') {
      return {
        parse: (s: string) => Object.fromEntries(new URLSearchParams(s).entries()),
        stringify: (obj: any) => new URLSearchParams(obj).toString(),
        escape: encodeURIComponent,
        unescape: decodeURIComponent,
      };
    }

    if (moduleName === 'assert' || moduleName === 'node:assert') {
      const assertFn: any = (val: any, msg = 'Assertion failed') => {
        if (!val) throw new Error(`AssertionError: ${msg}`);
      };
      assertFn.ok = assertFn;
      assertFn.strictEqual = (a: any, b: any, msg?: string) => {
        if (a !== b) throw new Error(`AssertionError: ${a} !== ${b}. ${msg || ''}`);
      };
      assertFn.deepStrictEqual = (a: any, b: any, msg?: string) => {
        if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`AssertionError: deep equality failed. ${msg || ''}`);
      };
      return assertFn;
    }

    // 3. Popular NPM Modules (Standard Rich Polyfills)
    const cleanMod = moduleName.toLowerCase().replace(/^@types\//, '');

    if (cleanMod === 'lodash' || cleanMod === 'underscore') {
      const l = createLodashPolyfill();
      loadedModulesCache[moduleName] = l;
      return l;
    }

    if (cleanMod === 'chalk' || cleanMod === 'picocolors' || cleanMod === 'kleur') {
      const c = createChalkPolyfill();
      loadedModulesCache[moduleName] = c;
      return c;
    }

    if (cleanMod === 'axios' || cleanMod === 'node-fetch' || cleanMod === 'got') {
      const a = createAxiosPolyfill();
      loadedModulesCache[moduleName] = a;
      return a;
    }

    if (cleanMod === 'uuid') {
      const u = createUuidPolyfill();
      loadedModulesCache[moduleName] = u;
      return u;
    }

    if (cleanMod === 'dayjs' || cleanMod === 'moment') {
      const d = createDayjsPolyfill();
      loadedModulesCache[moduleName] = d;
      return d;
    }

    if (cleanMod === 'dotenv') {
      return {
        config: () => {
          const envPath = vfsInstance.resolvePath(cwd, '.env');
          const envFile = vfsInstance.getFile(envPath);
          if (envFile && envFile.content) {
            envFile.content.split('\n').forEach((l) => {
              const [k, ...v] = l.split('=');
              if (k && k.trim() && !k.startsWith('#')) {
                customProcess.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
              }
            });
          }
          return { parsed: customProcess.env };
        },
        parse: (src: string) => {
          const res: any = {};
          src.split('\n').forEach((l) => {
            const [k, ...v] = l.split('=');
            if (k) res[k.trim()] = v.join('=').trim();
          });
          return res;
        },
      };
    }

    if (cleanMod === 'zod') {
      const z = createZodPolyfill();
      loadedModulesCache[moduleName] = z;
      return z;
    }

    if (cleanMod === 'cors') {
      return () => (req: any, res: any, next: any) => next && next();
    }

    if (cleanMod === 'express') {
      const expressFn: any = () => {
        const routes: any[] = [];
        return {
          use: (middleware: any) => {},
          get: (path: string, handler: any) => routes.push({ method: 'GET', path, handler }),
          post: (path: string, handler: any) => routes.push({ method: 'POST', path, handler }),
          put: (path: string, handler: any) => routes.push({ method: 'PUT', path, handler }),
          delete: (path: string, handler: any) => routes.push({ method: 'DELETE', path, handler }),
          listen: (port: number, cb?: any) => {
            customConsole.log(`[Express] Application running on port ${port}`);
            if (cb) cb();
          },
        };
      };
      expressFn.json = () => (req: any, res: any, next: any) => next && next();
      expressFn.urlencoded = () => (req: any, res: any, next: any) => next && next();
      expressFn.static = (p: string) => (req: any, res: any, next: any) => next && next();
      expressFn.Router = () => ({ get: () => {}, post: () => {}, use: () => {} });
      return expressFn;
    }

    if (cleanMod === 'commander') {
      class Command {
        version() { return this; }
        option() { return this; }
        command() { return this; }
        action() { return this; }
        parse() { return this; }
        opts() { return {}; }
      }
      return { Command, program: new Command() };
    }

    if (cleanMod === 'ms') {
      return (val: any) => {
        if (typeof val === 'number') return `${val / 1000}s`;
        if (typeof val === 'string') {
          if (val.endsWith('ms')) return parseInt(val);
          if (val.endsWith('s')) return parseFloat(val) * 1000;
          if (val.endsWith('m')) return parseFloat(val) * 60000;
          if (val.endsWith('h')) return parseFloat(val) * 3600000;
          if (val.endsWith('d')) return parseFloat(val) * 86400000;
        }
        return 0;
      };
    }

    // 4. Check Installed node_modules in Virtual File System
    const possibleModulePaths = [
      `node_modules/${moduleName}/package.json`,
      `node_modules/${cleanMod}/package.json`,
      `/root/workspace/node_modules/${moduleName}/package.json`,
      `/root/node_modules/${moduleName}/package.json`,
    ];

    for (const checkPath of possibleModulePaths) {
      const resolved = vfsInstance.resolvePath(cwd, checkPath);
      const pkgFile = vfsInstance.getFile(resolved);
      if (pkgFile && pkgFile.content) {
        try {
          const parsed = JSON.parse(pkgFile.content);
          const mainFile = parsed.main || 'index.js';
          const entryPath = resolved.replace('package.json', mainFile);
          const entryNode = vfsInstance.getFile(entryPath);
          if (entryNode && entryNode.content) {
            const moduleObj = { exports: {} as any };
            const transpiled = transpileJavaScript(entryNode.content, entryPath.endsWith('.ts'));
            const modFn = new Function(
              'exports',
              'require',
              'module',
              '__filename',
              '__dirname',
              'console',
              'process',
              transpiled
            );
            modFn(moduleObj.exports, customRequire, moduleObj, entryPath, cwd, customConsole, customProcess);
            loadedModulesCache[moduleName] = moduleObj.exports;
            return moduleObj.exports;
          }
        } catch {}
      }
    }

    // Generic fallback mock package object
    const genericPackage = {
      name: moduleName,
      version: '1.0.0',
      default: {},
      ok: true,
    };
    loadedModulesCache[moduleName] = genericPackage;
    return genericPackage;
  };

  return customRequire;
}
