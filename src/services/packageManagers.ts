import { vfsInstance } from './vfs';
import { cloudSyncService } from './cloudSync';
import { pythonPackageManager } from './pythonRuntime';

export interface PackageManagerResult {
  output: string;
  stdout?: string;
  stderr?: string;
  exitCode: number;
  newCwd?: string;
  openedFile?: string;
}

export class UniversalPackageManager {
  // 1. PIP / PIP3
  public handlePip(args: string[], cwd: string): PackageManagerResult {
    const res = pythonPackageManager.handlePipCommand(args, cwd);
    return {
      output: res.output,
      stdout: res.exitCode === 0 ? res.output : '',
      stderr: res.exitCode !== 0 ? res.output : '',
      exitCode: res.exitCode,
    };
  }

  // 2. Cargo (Rust)
  public handleCargo(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';

    if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
      return {
        output: `Rust's package manager\n\nUsage: cargo [+toolchain] [OPTIONS] [COMMAND]\n\nCommands:\n    add         Add dependencies to a Cargo.toml manifest file (e.g. cargo add serde tokio)\n    build, b    Compile the current package\n    check, c    Analyze the current package and report errors\n    clean       Remove the target directory\n    init        Create a new cargo package in an existing directory\n    install     Install a Rust binary\n    new         Create a new cargo package at <path>\n    run, r      Run a binary or example of the local package\n    test, t     Run the tests\n    update      Update dependencies listed in Cargo.lock`,
        exitCode: 0,
      };
    }

    if (sub === '-v' || sub === '--version' || sub === '-V' || sub === 'version') {
      return { output: 'cargo 1.80.1 (3f5fd8dd4 2024-08-06)', exitCode: 0 };
    }

    if (sub === 'add') {
      const crates = args.slice(1).filter(a => !a.startsWith('-'));
      if (crates.length === 0) {
        return { output: 'error: `cargo add` takes at least one crate argument', exitCode: 1 };
      }
      const tomlPath = vfsInstance.resolvePath(cwd, 'Cargo.toml');
      let tomlNode = vfsInstance.getFile(tomlPath);
      let tomlContent = tomlNode?.content || '';

      if (!tomlContent) {
        const pkgName = cwd.split('/').filter(Boolean).pop() || 'rust_app';
        tomlContent = `[package]\nname = "${pkgName}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`;
      }

      let out = '';
      for (const cr of crates) {
        const [cName, cVer] = cr.split('@');
        const ver = cVer || '1.0';
        out += `      Adding ${cName} v${ver} to dependencies.\n`;
        if (!tomlContent.includes(`\n${cName} =`)) {
          tomlContent += `${cName} = "${ver}"\n`;
        }
      }

      vfsInstance.writeFile(tomlPath, tomlContent);
      cloudSyncService.handleFileChange(tomlPath, 'modified');
      vfsInstance.notifyListeners();

      out += `    Updating crates.io index\n`;
      return { output: out.trimEnd(), exitCode: 0 };
    }

    if (sub === 'init' || sub === 'new') {
      const targetName = (sub === 'new' ? args[1] : '') || cwd.split('/').filter(Boolean).pop() || 'app';
      const tomlPath = vfsInstance.resolvePath(cwd, 'Cargo.toml');
      const srcDir = vfsInstance.resolvePath(cwd, 'src');
      vfsInstance.createDirectory(srcDir);
      
      const tomlContent = `[package]\nname = "${targetName}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`;
      vfsInstance.writeFile(tomlPath, tomlContent);
      
      const mainPath = `${srcDir}/main.rs`;
      if (!vfsInstance.getFile(mainPath)) {
        vfsInstance.writeFile(mainPath, `fn main() {\n    println!("== Qshell Rust v1.80 ==");\n    println!("Ready to build blazing-fast systems.");\n}\n`);
      }

      vfsInstance.notifyListeners();
      return { output: `     Created binary (application) \`${targetName}\` package`, exitCode: 0, openedFile: tomlPath };
    }

    if (sub === 'build' || sub === 'b') {
      return {
        output: `   Compiling ${cwd.split('/').pop() || 'workspace'} v0.1.0 (/root/workspace)\n    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 0.48s`,
        exitCode: 0,
      };
    }

    if (sub === 'check' || sub === 'c') {
      return {
        output: `    Checking ${cwd.split('/').pop() || 'workspace'} v0.1.0 (/root/workspace)\n    Finished \`dev\` profile in 0.12s`,
        exitCode: 0,
      };
    }

    return { output: `cargo: command '${sub}' completed.`, exitCode: 0 };
  }

  // 3. Ruby Gem & Bundler
  public handleGem(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
      return {
        output: `RubyGems is a sophisticated package manager for Ruby.\n\nUsage:\n  gem install <gem_name>      Install a gem (e.g. gem install rails sinatra rspec)\n  gem list                    List installed gems\n  gem info <gem_name>         Show gem details\n  gem --version               Show gem version`,
        exitCode: 0,
      };
    }
    if (sub === '-v' || sub === '--version' || sub === 'version') {
      return { output: '3.5.16', exitCode: 0 };
    }
    if (sub === 'install' || sub === 'i') {
      const gems = args.slice(1).filter(a => !a.startsWith('-'));
      if (gems.length === 0) return { output: 'ERROR: Please specify a gem to install', exitCode: 1 };
      const out = gems.map(g => `Fetching ${g}-3.2.0.gem\nSuccessfully installed ${g}-3.2.0\nParsing documentation for ${g}-3.2.0\nDone installing documentation for ${g} after 0 seconds\n1 gem installed`).join('\n');
      return { output: out, exitCode: 0 };
    }
    if (sub === 'list') {
      return { output: `*** LOCAL GEMS ***\n\nbundler (2.5.16)\nrack (3.1.7)\nrake (13.2.1)\nrspec (3.13.0)\nsinatra (4.0.0)`, exitCode: 0 };
    }
    return { output: `gem ${sub}: completed.`, exitCode: 0 };
  }

  // 4. Go modules & get
  public handleGo(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (!sub || sub === 'help' || sub === '--help') {
      return {
        output: `Go is a tool for managing Go source code.\n\nUsage:\n  go get <package>       Add dependencies to current module (e.g. go get github.com/gin-gonic/gin)\n  go install <pkg>       Compile and install packages and dependencies\n  go mod init <module>   Initialize new module in current directory\n  go mod tidy            Add missing and remove unused modules\n  go version             Print Go version`,
        exitCode: 0,
      };
    }
    if (sub === 'version') {
      return { output: 'go version go1.23.0 linux/amd64', exitCode: 0 };
    }
    if (sub === 'get') {
      const mod = args[1] || 'github.com/gin-gonic/gin';
      const modPath = vfsInstance.resolvePath(cwd, 'go.mod');
      let modFile = vfsInstance.getFile(modPath);
      let content = modFile?.content || `module workspace\n\ngo 1.23.0\n\nrequire (\n`;
      if (!content.includes(mod)) {
        content = content.replace(/\n\)$/, `\n\t${mod} v1.9.1\n)`);
        if (!content.includes('require (')) {
          content += `\nrequire ${mod} v1.9.1\n`;
        }
      }
      vfsInstance.writeFile(modPath, content);
      cloudSyncService.handleFileChange(modPath, 'modified');
      vfsInstance.notifyListeners();
      return { output: `go: downloading ${mod} v1.9.1\ngo: added ${mod} v1.9.1`, exitCode: 0 };
    }
    if (sub === 'mod') {
      const modSub = args[1]?.toLowerCase();
      if (modSub === 'init') {
        const modName = args[2] || 'workspace';
        const modPath = vfsInstance.resolvePath(cwd, 'go.mod');
        vfsInstance.writeFile(modPath, `module ${modName}\n\ngo 1.23.0\n`);
        cloudSyncService.handleFileChange(modPath, 'created');
        vfsInstance.notifyListeners();
        return { output: `go: creating new go.mod: module ${modName}`, exitCode: 0, openedFile: modPath };
      }
      if (modSub === 'tidy') {
        return { output: `go: finding module for package dependencies\ngo: downloading toolchains\ngo: verified go.mod and go.sum`, exitCode: 0 };
      }
    }
    return { output: `go: command '${sub}' completed.`, exitCode: 0 };
  }

  // 5. PHP Composer
  public handleComposer(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (!sub || sub === '--help' || sub === '-h') {
      return {
        output: `Composer 2.7.7\nUsage:\n  composer require <package>     Add package to composer.json\n  composer install               Install dependencies from composer.lock\n  composer update                Update dependencies to latest versions\n  composer init                  Create a composer.json file`,
        exitCode: 0,
      };
    }
    if (sub === '-v' || sub === '--version' || sub === 'version') {
      return { output: 'Composer version 2.7.7 2024-06-10 15:24:33', exitCode: 0 };
    }
    if (sub === 'require') {
      const pkg = args[1] || 'guzzlehttp/guzzle';
      const cPath = vfsInstance.resolvePath(cwd, 'composer.json');
      vfsInstance.writeFile(cPath, JSON.stringify({
        name: "root/workspace",
        require: { [pkg]: "^7.8" }
      }, null, 2));
      cloudSyncService.handleFileChange(cPath, 'modified');
      vfsInstance.notifyListeners();
      return { output: `Using version ^7.8 for ${pkg}\n./composer.json has been updated\nRunning composer update ${pkg}\nLoading composer repositories with package information\nUpdating dependencies\nLock file operations: 1 install, 0 updates, 0 removals\n  - Locking ${pkg} (7.8.1)\nWriting lock file\nInstalling dependencies from lock file\nPackage operations: 1 install, 0 updates, 0 removals\n  - Downloading ${pkg} (7.8.1)\n  - Installing ${pkg} (7.8.1): Extracting archive\nGenerating autoload files\n1 package you are using is looking for funding.`, exitCode: 0 };
    }
    return { output: `composer: command '${sub}' completed.`, exitCode: 0 };
  }

  // 6. Dotnet Package Manager
  public handleDotnet(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (sub === 'add') {
      const target = args[1]?.toLowerCase();
      if (target === 'package') {
        const pkgName = args[2] || 'Newtonsoft.Json';
        return {
          output: `  Determining projects to restore...\n  Writing /tmp/tmp29a8c.tmp\ninfo : Adding PackageReference for package '${pkgName}' into project '/root/workspace/app.csproj'.\ninfo :   Restoring packages for /root/workspace/app.csproj...\ninfo :   Package '${pkgName}' is compatible with all the specified frameworks in project '/root/workspace/app.csproj'.\ninfo :   Package '${pkgName}' version '13.0.3' was added to project '/root/workspace/app.csproj'.\ninfo : Generating MSBuild file /root/workspace/obj/app.csproj.nuget.g.props.\ninfo : Writing assets file to disk. Path: /root/workspace/obj/project.assets.json\nlog  : Restored /root/workspace/app.csproj (in 182 ms).`,
          exitCode: 0,
        };
      }
    }
    if (sub === 'list' && args[1] === 'package') {
      const out = `Project 'app' has the following package references\n   [net8.0]:\n   Top-level Package      Requested   Resolved\n   > Newtonsoft.Json      13.0.3      13.0.3`;
      return { output: out, stdout: out, exitCode: 0 };
    }
    const out = `dotnet: command '${sub}' executed.`;
    return { output: out, stdout: out, exitCode: 0 };
  }

  // 7. NPM (Node Package Manager)
  public handleNpm(args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (sub === '-v' || sub === '--version' || (sub === 'version' && args.length === 1)) {
      return { output: '10.8.2', stdout: '10.8.2', exitCode: 0 };
    }
    if (!sub || sub === '--help' || sub === '-h') {
      const out = `npm <command>\n\nUsage:\n  npm init [-y]           Create a package.json file\n  npm install [pkg...]    Install dependencies\n  npm uninstall <pkg...>  Remove dependencies\n  npm run <script>        Run an arbitrary package script\n  npm test                Run package test script\n  npm start               Run package start script\n  npm list                List installed packages\n  npm --version           Show npm version`;
      return { output: out, stdout: out, exitCode: 0 };
    }
    if (sub === 'install' || sub === 'i' || sub === 'add') {
      const pkgs = args.slice(1).filter(a => !a.startsWith('-'));
      const pkgPath = vfsInstance.resolvePath(cwd, 'package.json');
      let pkgData: any = { name: "workspace", version: "1.0.0", dependencies: {}, devDependencies: {} };
      try {
        const file = vfsInstance.getFile(pkgPath);
        if (file && file.content) pkgData = JSON.parse(file.content);
      } catch {}
      if (!pkgData.dependencies) pkgData.dependencies = {};
      if (pkgs.length > 0) {
        pkgs.forEach(p => {
          pkgData.dependencies[p] = "^1.0.0";
        });
      }
      vfsInstance.writeFile(pkgPath, JSON.stringify(pkgData, null, 2));
      cloudSyncService.handleFileChange(pkgPath, 'modified');
      vfsInstance.notifyListeners();
      const count = pkgs.length || Object.keys(pkgData.dependencies).length || 1;
      const out = `added ${count} packages in 0.35s\n\nfound 0 vulnerabilities`;
      return { output: out, stdout: out, exitCode: 0 };
    }
    const out = `npm: command '${sub}' completed.`;
    return { output: out, stdout: out, exitCode: 0 };
  }

  // 8. Yarn / PNPM / Bun Node Package Managers
  public handleYarn(args: string[], cwd: string): PackageManagerResult {
    return this.handleAltNodePM('yarn', args, cwd);
  }

  public handlePnpm(args: string[], cwd: string): PackageManagerResult {
    return this.handleAltNodePM('pnpm', args, cwd);
  }

  public handleBun(args: string[], cwd: string): PackageManagerResult {
    return this.handleAltNodePM('bun', args, cwd);
  }

  public handleAltNodePM(manager: 'yarn' | 'pnpm' | 'bun', args: string[], cwd: string): PackageManagerResult {
    const sub = args[0]?.toLowerCase() || '';
    if (sub === '-v' || sub === '--version' || sub === 'version') {
      const versions: Record<string, string> = { yarn: '1.22.22', pnpm: '9.7.0', bun: '1.1.24' };
      const out = versions[manager] || '1.0.0';
      return { output: out, stdout: out, exitCode: 0 };
    }
    if (sub === 'add' || sub === 'install' || sub === 'i') {
      const pkgs = args.slice(1).filter(a => !a.startsWith('-'));
      const pkgPath = vfsInstance.resolvePath(cwd, 'package.json');
      let pkgData: any = { name: "workspace", version: "1.0.0", dependencies: {} };
      try {
        const file = vfsInstance.getFile(pkgPath);
        if (file && file.content) pkgData = JSON.parse(file.content);
      } catch {}
      if (!pkgData.dependencies) pkgData.dependencies = {};
      pkgs.forEach(p => {
        pkgData.dependencies[p] = "^1.0.0";
      });
      vfsInstance.writeFile(pkgPath, JSON.stringify(pkgData, null, 2));
      cloudSyncService.handleFileChange(pkgPath, 'modified');
      vfsInstance.notifyListeners();
      const out = `[${manager}] Successfully installed ${pkgs.length || 1} packages.\nLockfile updated in ${cwd}.`;
      return {
        output: out,
        stdout: out,
        exitCode: 0,
      };
    }
    const out = `${manager}: command '${sub}' completed.`;
    return { output: out, stdout: out, exitCode: 0 };
  }
}

export const universalPackageManager = new UniversalPackageManager();
