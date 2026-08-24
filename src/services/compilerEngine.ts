import { PREINSTALLED_COMPILERS } from '../data/compilers';

export interface CompilerResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  isRepl?: boolean;
  replPrompt?: string;
}

export function handleCompilerCommand(cmdLine: string, fileChecker?: (path: string) => { exists: boolean; content?: string }): CompilerResult | null {
  const parts = cmdLine.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const rawCmd = parts[0];
  const cmd = rawCmd.toLowerCase();
  const args = parts.slice(1);
  const argStr = args.join(' ');
  const firstArg = args[0]?.toLowerCase() || '';

  const isVersion = firstArg === '--version' || firstArg === '-v' || firstArg === '-version' || firstArg === '-V' || firstArg === 'version' || firstArg === '-v';
  const isHelp = firstArg === '--help' || firstArg === '-h' || firstArg === '-?' || firstArg === 'help';

  // 1. Python (python, python3, py)
  if (cmd === 'python' || cmd === 'python3' || cmd === 'py') {
    if (isVersion) {
      return { stdout: 'Python 3.12.4\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `usage: ${cmd} [option] ... [-c cmd | -m mod | file | -] [arg] ...\nOptions (and corresponding environment variables):\n-b     : issue warnings about str(bytes_instance), str(bytearray_instance)\n-c cmd : program passed in as string (terminates option list)\n-d     : turn on parser debugging output (for experts only)\n-E     : ignore PYTHON* environment variables (such as PYTHONPATH)\n-h     : print this help message and exit (also -? or --help)\n-i     : inspect interactively after running script\n-m mod : run library module as a script (terminates option list)\n-O     : remove assert and __debug__-dependent statements\n-OO    : do -O changes and also discard docstrings\n-q     : don't print version and copyright messages on interactive startup\n-s     : don't add user site directory to sys.path\n-S     : don't imply 'import site' on initialization\n-u     : force the stdout and stderr streams to be unbuffered\n-v     : verbose (trace import statements)\n-V     : print the Python version number and exit (also --version)\n-W arg : warning control (arg is action:message:category:module:lineno)\n-x     : skip first line of source, allowing use of non-Unix forms of #!\n-X opt : set implementation-specific option\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: 'Python 3.12.4 (main, Jun 12 2024, 18:28:41) [GCC 13.2.0] on linux\nType "help", "copyright", "credits" or "license" for more information.\n',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '>>> ',
      };
    }
    // File execution
    const targetFile = args.find(a => !a.startsWith('-'));
    if (targetFile && fileChecker) {
      const fileInfo = fileChecker(targetFile);
      if (!fileInfo.exists) {
        return {
          stdout: '',
          stderr: `${cmd}: can't open file '${targetFile}': [Errno 2] No such file or directory\n`,
          exitCode: 2,
        };
      }
    }
  }

  // 2. C++ Compiler (g++, clang++, c++)
  if (cmd === 'g++' || cmd === 'c++') {
    if (isVersion) {
      return {
        stdout: `g++ (Ubuntu 13.2.0-23ubuntu4) 13.2.0\nCopyright (C) 2023 Free Software Foundation, Inc.\nThis is free software; see the source for copying conditions.  There is NO\nwarranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (isHelp) {
      return {
        stdout: `Usage: g++ [options] file...\nOptions:\n  -pass-exit-codes         Exit with highest error code from a phase.\n  --help                   Display this information.\n  --target-help            Display target specific command line options.\n  --version                Display compiler version information.\n  -dumpspecs               Display all of the built in spec strings.\n  -dumpversion             Display the compiler version.\n  -dumpmachine             Display the compiler's target processor.\n  -std=<standard>          Assume that the input sources are for <standard>.\n  -Wall                    Enable most compiler warnings.\n  -O2, -O3                 Optimization levels.\n  -o <file>                Place the output into <file>.\n  -c                       Compile and assemble, but do not link.\n  -shared                  Create a shared library.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `g++: fatal error: no input files\ncompilation terminated.\n`,
        exitCode: 1,
      };
    }
    const targetFile = args.find(a => !a.startsWith('-') && (a.endsWith('.cpp') || a.endsWith('.cc') || a.endsWith('.cxx') || a.endsWith('.c') || a.endsWith('.h')));
    if (targetFile && fileChecker) {
      const fileInfo = fileChecker(targetFile);
      if (!fileInfo.exists) {
        return {
          stdout: '',
          stderr: `g++: error: ${targetFile}: No such file or directory\ng++: fatal error: no input files\ncompilation terminated.\n`,
          exitCode: 1,
        };
      }
    }
  }

  // 3. C Compiler (gcc, clang, cc)
  if (cmd === 'gcc' || cmd === 'cc') {
    if (isVersion) {
      return {
        stdout: `gcc (Ubuntu 13.2.0-23ubuntu4) 13.2.0\nCopyright (C) 2023 Free Software Foundation, Inc.\nThis is free software; see the source for copying conditions.  There is NO\nwarranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (isHelp) {
      return {
        stdout: `Usage: gcc [options] file...\nOptions:\n  --help                   Display this information.\n  --version                Display compiler version information.\n  -std=<standard>          Assume that the input sources are for <standard> (e.g. c17, c23).\n  -Wall                    Enable all standard warnings.\n  -O2, -O3                 Optimization levels.\n  -o <file>                Place the output into <file>.\n  -c                       Compile and assemble, but do not link.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `gcc: fatal error: no input files\ncompilation terminated.\n`,
        exitCode: 1,
      };
    }
    const targetFile = args.find(a => !a.startsWith('-') && (a.endsWith('.c') || a.endsWith('.h')));
    if (targetFile && fileChecker) {
      const fileInfo = fileChecker(targetFile);
      if (!fileInfo.exists) {
        return {
          stdout: '',
          stderr: `gcc: error: ${targetFile}: No such file or directory\ngcc: fatal error: no input files\ncompilation terminated.\n`,
          exitCode: 1,
        };
      }
    }
  }

  // 4. Clang / Clang++ (clang, clang++)
  if (cmd === 'clang' || cmd === 'clang++') {
    if (isVersion) {
      return {
        stdout: `Ubuntu clang version 18.1.3 (1ubuntu1)\nTarget: x86_64-pc-linux-gnu\nThread model: posix\nInstalledDir: /usr/bin\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `${cmd}: error: no input files\n`,
        exitCode: 1,
      };
    }
  }

  // 5. Rust Compiler & Package Manager (rustc, cargo)
  if (cmd === 'rustc') {
    if (isVersion) {
      return { stdout: 'rustc 1.80.1 (3f5fd8dd4 2024-08-06)\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Usage: rustc [OPTIONS] INPUT\n\nOptions:\n    -h, --help          Display this message\n        --cfg SPEC      Configure the compilation value\n    -L [KIND=]PATH      Add a directory to the library search path\n        --edition 2015|2018|2021|2024\n                        Specify which edition of the compiler to use\n    -g                  Equivalent to -C debuginfo=2\n    -O                  Equivalent to -C opt-level=2\n    -o FILENAME         Write output to <filename>\n        --out-dir DIR   Write output to compiler-chosen filename in <dir>\n    -V, --version       Print version info and exit\n    -v, --verbose       Use verbose output\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `error: no input filename given\n\nUsage: rustc [OPTIONS] INPUT\n\nFor more information, try '--help'.\n`,
        exitCode: 1,
      };
    }
  }

  if (cmd === 'cargo') {
    if (isVersion) {
      return { stdout: 'cargo 1.80.1 (3f5fd8dd4 2024-08-06)\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `Rust's package manager\n\nUsage: cargo [+toolchain] [OPTIONS] [COMMAND]\n\nOptions:\n  -V, --version           Print version info and exit\n  --list                  List installed commands\n  --explain <CODE>        Run rustc --explain CODE\n  -v, --verbose...        Use verbose output (-vv very verbose/build.rs output)\n  -q, --quiet             Do not print cargo log messages\n  --color <WHEN>          Coloring: auto, always, never\n  -h, --help              Print help\n\nSome common cargo commands are (see 'cargo help <command>' for more information):\n    build, b    Compile the current package\n    check, c    Analyze the current package and report errors, but don't build object files\n    clean       Remove the target directory\n    doc, d      Build this package's and its dependencies' documentation\n    new         Create a new cargo package at <path>\n    init        Create a new cargo package in an existing directory\n    run, r      Run a binary or example of the local package\n    test, t     Run the tests\n    bench       Run the benchmarks\n    update      Update dependencies listed in Cargo.lock\n    search      Search registry for crates\n    publish     Package and upload this package to the registry\n    install     Install a Rust binary. Default location is $HOME/.cargo/bin\n    uninstall   Uninstall a Rust binary\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (firstArg === 'build' || firstArg === 'b') {
      return {
        stdout: `   Compiling workspace v0.1.0 (/root/workspace)\n    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 0.42s\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 6. Go (go)
  if (cmd === 'go') {
    if (isVersion || firstArg === 'version') {
      return { stdout: 'go version go1.23.0 linux/amd64\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0 || isHelp || firstArg === 'help') {
      return {
        stdout: `Go is a tool for managing Go source code.\n\nUsage:\n\n\tgo <command> [arguments]\n\nThe commands are:\n\n\tbug         start a bug report\n\tbuild       compile packages and dependencies\n\tclean       remove object files and cached files\n\tdoc         show documentation for package or symbol\n\tenv         print Go environment information\n\tfix         update packages to use new APIs\n\tfmt         gofmt (reformat) package sources\n\tgenerate    generate Go files by processing source\n\tget         add dependencies to current module and install them\n\tinstall     compile and install packages and dependencies\n\tlist        list packages or modules\n\tmod         module maintenance\n\twork        workspace maintenance\n\trun         compile and run Go program\n\ttest        test packages\n\ttool        run specified go tool\n\tversion     print Go version\n\tvet         report likely mistakes in packages\n\nUse "go help <command>" for more information about a command.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 7. Java & Javac (java, javac)
  if (cmd === 'java') {
    if (isVersion) {
      return {
        stdout: `openjdk 21.0.4 2024-07-16\nOpenJDK Runtime Environment (build 21.0.4+7-Ubuntu-1ubuntu224.04)\nOpenJDK 64-Bit Server VM (build 21.0.4+7-Ubuntu-1ubuntu224.04, mixed mode, sharing)\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `Usage: java [options] <mainclass> [args...]\n   or  java [options] -jar <jarfile> [args...]\n   or  java [options] -m <module>[/<mainclass>] [args...]\n   or  java [options] --module <module>[/<mainclass>] [args...]\n\n Arguments following the main class, source file, -jar <jarfile>,\n -m or --module <module>/<mainclass> are passed as the arguments to\n the main class.\n\n where options include:\n    -cp <class search path>\n    -classpath <class search path>\n    --class-path <class search path>\n                  A : separated list of directories, JAR archives,\n                  and ZIP archives to search for class files.\n    -version      print product version to the error stream and exit\n    --version     print product version to the output stream and exit\n    -? -h --help  print this help message to the output stream and exit\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  if (cmd === 'javac') {
    if (isVersion) {
      return { stdout: 'javac 21.0.4\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `Usage: javac <options> <source files>\nuse --help for a list of possible options\n`,
        exitCode: 2,
      };
    }
  }

  // 8. C# / .NET (dotnet)
  if (cmd === 'dotnet') {
    if (isVersion) {
      return { stdout: '8.0.300\n', stderr: '', exitCode: 0 };
    }
    if (firstArg === '--info') {
      return {
        stdout: `.NET SDK:\n Version:   8.0.300\n Commit:    ae790d0b0c\n\nRuntime Environment:\n OS Name:     ubuntu\n OS Version:  24.04\n OS Platform: Linux\n RID:         linux-x64\n Base Path:   /usr/share/dotnet/sdk/8.0.300/\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `Usage: dotnet [runtime-options] [path-to-application] [arguments]\n\nExecute a .NET application.\n\nSDK commands:\n  new              Create a new .NET project or file.\n  restore          Restore dependencies specified in a .NET project.\n  build            Build a .NET project.\n  publish          Publish a .NET project for deployment.\n  run              Build and run a .NET project output.\n  test             Run unit tests using the test runner specified in a .NET project.\n  pack             Create a NuGet package.\n  migrate          Migrate a project.json project to an MSBuild project.\n  clean            Clean build outputs of a .NET project.\n  sln              Modify Visual Studio solution files.\n  add              Add a package or reference to a .NET project.\n  remove           Remove a package or reference from a .NET project.\n  list             List project references of a .NET project.\n  nuget            Provides additional NuGet commands.\n  msbuild          Runs Microsoft Build Engine (MSBuild) commands.\n  vstest           Runs Microsoft Test Execution Command Line Tool.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 9. PHP (php)
  if (cmd === 'php') {
    if (isVersion) {
      return {
        stdout: `PHP 8.3.10 (cli) (built: Jul 29 2024 16:32:00) (NTS)\nCopyright (c) The PHP Group\nZend Engine v4.3.10, Copyright (c) Zend Technologies\n    with Zend OPcache v8.3.10, Copyright (c), by Zend Technologies\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (isHelp) {
      return {
        stdout: `Usage: php [options] [-f] <file> [--] [args...]\n   php [options] -r <code> [--] [args...]\n   php [options] [-B <begin_code>] -R <code> [-E <end_code>] [--] [args...]\n   php [options] [-B <begin_code>] -F <file> [-E <end_code>] [--] [args...]\n   php [options] -S <addr>:<port> [-t docroot] [router]\n   php [options] -- [args...]\n   php [options] -a\n   php [options] -v\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: 'Interactive shell\n\nphp > ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: 'php > ',
      };
    }
  }

  // 10. Ruby (ruby, irb)
  if (cmd === 'ruby') {
    if (isVersion) {
      return { stdout: 'ruby 3.3.4 (2024-07-09 revision be1089c8ec) [x86_64-linux]\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Usage: ruby [switches] [--] [programfile] [arguments]\n  -0[octal]       specify record separator (\\0, if no argument)\n  -a              turn on autosplit mode when used with -n or -p\n  -c              check syntax only\n  -Cdirectory     cd to directory before executing your script\n  -d, --debug     set debugging flags (set $DEBUG to true)\n  -e 'command'    one line of script. Several -es allowed. Omit [programfile]\n  -h, --help      print this message\n  -v, --version   print version number, then turn on verbose mode\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 11. Swift (swift, swiftc)
  if (cmd === 'swift' || cmd === 'swiftc') {
    if (isVersion) {
      return { stdout: 'Swift version 6.0 (swift-6.0-RELEASE)\nTarget: x86_64-unknown-linux-gnu\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `OVERVIEW: Swift compiler\n\nUSAGE: swift [options] <inputs>\n\nMODES:\n  -repl                   Run interactive Swift REPL\n  -frontend               Run frontend directly\n\nOPTIONS:\n  -g                      Generate debug information\n  -O                      Compile with optimizations\n  -v                      Show commands to run and use verbose output\n  -version                Display compiler version information\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: 'Welcome to Swift version 6.0 (swift-6.0-RELEASE).\nType :help for assistance.\n1> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '1> ',
      };
    }
  }

  // 12. Kotlin (kotlinc, kotlin)
  if (cmd === 'kotlinc' || cmd === 'kotlin') {
    if (isVersion) {
      return { stdout: 'info: kotlinc-jvm 2.0.20 (JRE 21.0.4+7-Ubuntu-1ubuntu224.04)\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Usage: kotlinc <options> <source files>\nwhere possible options include:\n  -classpath (-cp) <path>   List of directories and JAR/ZIP archives to search for user class files\n  -d <directory|jar>        Destination for generated class files\n  -include-runtime          Include Kotlin runtime in to the resulting JAR\n  -jdk-home <path>          Include a custom JDK from the specified location\n  -jvm-target <version>     Target version of the generated JVM bytecode (1.8, 9 - 22)\n  -nowarn                   Generate no warnings\n  -verbose                  Enable verbose logging output\n  -version                  Display compiler version\n  -help (-h)                Print a synopsis of standard options\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: 'Welcome to Kotlin version 2.0.20 (JRE 21.0.4)\nType :help for help, :quit for quit\n>>> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '>>> ',
      };
    }
  }

  // 13. Dart (dart)
  if (cmd === 'dart') {
    if (isVersion) {
      return { stdout: 'Dart SDK version: 3.5.1 (stable) (Wed Aug 14 02:45:00 2024 +0000) on "linux_x64"\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `A command-line utility for Dart development.\n\nUsage: dart <command|dart-file> [arguments]\n\nGlobal options:\n-h, --help                   Print this usage information.\n-v, --verbose                Show additional command output.\n    --version                Print the Dart SDK version.\n\nAvailable commands:\n  analyze    Analyze Dart code in a directory.\n  compile    Compile Dart to various formats.\n  create     Create a new Dart project.\n  format     Idiomatically format Dart source code.\n  pub        Work with packages.\n  run        Run a Dart program.\n  test       Run tests for a project.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 14. Lua (lua, luac)
  if (cmd === 'lua') {
    if (isVersion) {
      return { stdout: 'Lua 5.4.7  Copyright (C) 1994-2024 Lua.org, PUC-Rio\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: 'Lua 5.4.7  Copyright (C) 1994-2024 Lua.org, PUC-Rio\n> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '> ',
      };
    }
  }

  // 15. R (Rscript, R)
  if (cmd === 'rscript' || cmd === 'r') {
    if (isVersion) {
      return { stdout: 'R scripting front-end version 4.4.1 (2024-06-14)\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Usage: Rscript [options] [-e expr] file [args]\n\nOptions:\n  --help             Print usage and exit\n  --version          Print version and exit\n  --verbose          Print information on progress\n  --default-packages=LIST  Where LIST is a comma-separated set\n                     of package names, or 'NULL'\n  -e expr            An expression to be evaluated\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 16. Perl (perl)
  if (cmd === 'perl') {
    if (isVersion) {
      return {
        stdout: `This is perl 5, version 38, subversion 2 (v5.38.2) built for x86_64-linux-gnu-thread-multi\n(with 44 registered patches, see perl -V for more detail)\n\nCopyright 1987-2023, Larry Wall\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (isHelp) {
      return {
        stdout: `Usage: perl [switches] [--] [programfile] [arguments]\n  -0[octal]         specify record separator (\\0, if no argument)\n  -a                turn on autosplit mode when used with -n or -p\n  -c                check syntax only\n  -e 'command'      one line of script. Several -es allowed.\n  -h                print this help summary\n  -v                print version number, patchlevel, etc.\n  -V                print configuration summary\n  -w                enable many useful warnings\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 17. Elixir & Erlang (elixir, iex, erl, escript)
  if (cmd === 'elixir' || cmd === 'iex') {
    if (isVersion) {
      return {
        stdout: `Erlang/OTP 27 [erts-15.0.1] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1]\n\nElixir 1.17.2 (compiled with Erlang/OTP 27)\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (cmd === 'iex' && args.length === 0) {
      return {
        stdout: 'Erlang/OTP 27 [erts-15.0.1] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1]\nInteractive Elixir (1.17.2) - press Ctrl+C to exit (type h() ENTER for help)\niex(1)> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: 'iex(1)> ',
      };
    }
  }

  if (cmd === 'erl' || cmd === 'escript') {
    if (isVersion) {
      return { stdout: 'Erlang (SMP,ASYNC_THREADS) (BEAM) emulator version 15.0.1\n', stderr: '', exitCode: 0 };
    }
  }

  // 18. Scala (scala, scalac)
  if (cmd === 'scala' || cmd === 'scalac') {
    if (isVersion) {
      return { stdout: 'Scala code runner version 3.5.0 -- Copyright 2002-2024, LAMP/EPFL\n', stderr: '', exitCode: 0 };
    }
  }

  // 19. Zig (zig)
  if (cmd === 'zig') {
    if (isVersion || firstArg === 'version') {
      return { stdout: '0.13.0\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `Usage: zig [command] [options]\n\nCommands:\n  build            Build project from build.zig\n  build-exe        Override build configuration to output executable\n  build-lib        Override build configuration to output library\n  build-obj        Override build configuration to output object\n  run              Create executable and run immediately\n  test             Create and run a test build\n  version          Print version number and exit\n  zen              Print Zen of Zig and exit\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 20. Haskell (ghc, runghc, ghci)
  if (cmd === 'ghc' || cmd === 'runghc' || cmd === 'ghci') {
    if (isVersion) {
      return { stdout: 'The Glorious Glasgow Haskell Compilation System, version 9.8.2\n', stderr: '', exitCode: 0 };
    }
    if (cmd === 'ghc' && args.length === 0) {
      return {
        stdout: `ghc: no input files\nUsage: For basic information, try the \`--help' option.\n`,
        stderr: '',
        exitCode: 1,
      };
    }
    if (cmd === 'ghci' && args.length === 0) {
      return {
        stdout: 'GHCi, version 9.8.2: https://www.haskell.org/ghc/  :? for help\nPrelude> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: 'Prelude> ',
      };
    }
  }

  // 21. Julia (julia)
  if (cmd === 'julia') {
    if (isVersion) {
      return { stdout: 'julia version 1.10.4\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: `               _
   _       _ _(_)_     |  Documentation: https://docs.julialang.org
  (_)     | (_) (_)    |
   _ _   _| |_  __ _   |  Type "?" for help, "]?" for Pkg help.
  | | | | | | |/ _\` |  |
  | | |_| | | | (_| |  |  Version 1.10.4 (2024-06-04)
 _/ |\\__'_|_|_|\\__'_|  |  Official https://julialang.org/ release
|__/                   |

julia> `,
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: 'julia> ',
      };
    }
  }

  // 22. Clojure (clojure, clj)
  if (cmd === 'clojure' || cmd === 'clj') {
    if (isVersion) {
      return { stdout: 'Clojure CLI version 1.12.0.1479\n', stderr: '', exitCode: 0 };
    }
  }

  // 23. Nim (nim, nimble)
  if (cmd === 'nim' || cmd === 'nimble') {
    if (isVersion) {
      return {
        stdout: `Nim Compiler Version 2.0.8 [Linux: amd64]\nCompiled at 2024-07-10\nCopyright (c) 2006-2024 by Andreas Rumpf\n\ngit hash: 9946e5349e5a4ee416c878b301c107e33550e50f\nactive boot switches: -d:release\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0 || isHelp) {
      return {
        stdout: `Nim Compiler Version 2.0.8 [Linux: amd64]\nUsage:\n  nim command [options] [projectfile] [arguments]\n\nCommand:\n  compile, c                compile project with default code generator (C)\n  r                         compile to $nimcache/projname and run it\n  doc                       generate documentation for a project\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 24. OCaml (ocaml, ocamlopt, ocamlc)
  if (cmd === 'ocaml' || cmd === 'ocamlopt' || cmd === 'ocamlc') {
    if (isVersion) {
      return { stdout: 'The OCaml toplevel, version 5.2.0\n', stderr: '', exitCode: 0 };
    }
    if (cmd === 'ocaml' && args.length === 0) {
      return {
        stdout: '        OCaml version 5.2.0\n\n# ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '# ',
      };
    }
  }

  // 25. SQLite (sqlite3)
  if (cmd === 'sqlite3') {
    if (isVersion) {
      return { stdout: '3.46.0 2024-05-23 11:25:27 96c14170f442d3ad8bb0e0b0409c256ab529d4d989f530e1ae58e87fb6f6ldal\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: 'SQLite version 3.46.0 2024-05-23 11:25:27\nEnter ".help" for usage hints.\nConnected to a transient in-memory database.\nUse ".open FILENAME" to reopen on a persistent database.\nsqlite> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: 'sqlite> ',
      };
    }
  }

  // 26. GNU Fortran (gfortran)
  if (cmd === 'gfortran') {
    if (isVersion) {
      return {
        stdout: `GNU Fortran (Ubuntu 13.2.0-23ubuntu4) 13.2.0\nCopyright (C) 2023 Free Software Foundation, Inc.\nThis is free software; see the source for copying conditions.  There is NO\nwarranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `gfortran: fatal error: no input files\ncompilation terminated.\n`,
        exitCode: 1,
      };
    }
  }

  // 27. WebAssembly (wat2wasm, wasmtime)
  if (cmd === 'wat2wasm') {
    if (isVersion) {
      return { stdout: '1.0.35\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: `wat2wasm: no input file given\nTry 'wat2wasm --help' for more information.\n`,
        exitCode: 1,
      };
    }
  }

  if (cmd === 'wasmtime') {
    if (isVersion) {
      return { stdout: 'wasmtime 24.0.0 (f1a0e14a2 2024-08-20)\n', stderr: '', exitCode: 0 };
    }
  }

  // 28. Node.js, TypeScript, NPM, NPX, NVM (node, npm, npx, nvm, tsc, ts-node)
  if (cmd === 'node' || cmd === 'nodejs') {
    if (isVersion) {
      return { stdout: 'v22.6.0\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Usage: node [options] [ script.js ] [arguments]
       node inspect [options] [ script.js | host:port ] [arguments]

Options:
  -                      script read from stdin (default if no file name is provided,
                         interactive mode if a tty)
  --                     indicate the end of node options
  -e, --eval=...         evaluate script
  -p, --print [...]      evaluate script and print result
  -c, --check            syntax check script without executing
  -i, --interactive      always enter the REPL even if stdin does not appear
                         to be a terminal
  -r, --require=...      module to prepend to the application
  -v, --version          print Node.js version
  --watch                run in watch mode
  --env-file=...         set environment variables from supplied file
  -h, --help             print node command line options
`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (args.length === 0) {
      return {
        stdout: 'Welcome to Node.js v22.6.0.\nType ".help" for more information.\n> ',
        stderr: '',
        exitCode: 0,
        isRepl: true,
        replPrompt: '> ',
      };
    }
  }

  if (cmd === 'npm') {
    if (isVersion) {
      return { stdout: '10.8.2\n', stderr: '', exitCode: 0 };
    }
    if (isHelp || firstArg === 'help') {
      return {
        stdout: `npm <command>

Usage:

npm install        install dependencies in package.json
npm install <pkg>  install a package and add to package.json
npm init [-y]      create a package.json file
npm run <script>   run an arbitrary package script
npm test           run package test script
npm start          run package start script
npm list           list installed packages
npm audit          run a security audit on dependencies
npm outdated       check for outdated packages
npm update         update packages
npm version        bump package version
npm help <term>    search for help on <term>

All commands:
    access, adduser, audit, bugs, cache, ci, completion,
    config, create, ddp, dedupe, deprecate, diff,
    dist-tag, docs, doctor, edit, exec, explain,
    explore, find-dupes, fund, get, help, help-search,
    hook, init, install, install-ci-test, install-test,
    link, ll, login, logout, ls, org, outdated, owner,
    pack, ping, pkg, prefix, profile, prune, publish,
    rebuild, repo, restart, root, run-script, search,
    set, set-script, shrinkwrap, star, stars, start,
    stop, team, test, token, uninstall, unpublish,
    unstar, update, v, version, view, whoami

Specify configs in the ini-formatted file:
    /root/.npmrc
or on the command line via: npm --key=val

More information: https://docs.npmjs.com/
`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  if (cmd === 'npx') {
    if (isVersion) {
      return { stdout: '10.8.2\n', stderr: '', exitCode: 0 };
    }
    if (isHelp || args.length === 0) {
      return {
        stdout: `Execute binaries from npm packages (either locally installed or fetched on-demand).

Usage:
  npx [options] <command>[@version] [command-arg]...

Options:
  --package, -p <pkg>     Package to be installed for execution
  --yes, -y               Automatically accept prompted questions (e.g. download approval)
  --no                    Do not install package if not present locally
  --version, -v           Show npx version
  --help, -h              Show this help output

Examples:
  npx cowsay "Hello from Qshell"
  npx prettier --write index.js
  npx ts-node main.ts
`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  if (cmd === 'nvm') {
    if (isVersion) {
      return { stdout: '0.39.7\n', stderr: '', exitCode: 0 };
    }
    if (isHelp || args.length === 0) {
      return {
        stdout: `Node Version Manager (v0.39.7)

Usage:
  nvm --help                                Show this message
  nvm --version                             Print nvm version
  nvm install <version>                     Download and install a version
  nvm use <version>                         Modify PATH to use <version>
  nvm run <version> [<args>]                Run <version> with <args> as arguments
  nvm current                               Display currently-activated version of Node
  nvm ls                                    List installed versions
  nvm ls-remote                             List remote versions available for install
  nvm alias [<pattern>]                     Show all aliases beginning with <pattern>
  nvm alias <name> <version>                Set an alias named <name> pointing to <version>

Example:
  nvm install --lts                         Install latest LTS Node.js
  nvm use 22                                Switch to Node.js v22.6.0
  nvm alias default 22                      Set default version
`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (firstArg === 'ls' || firstArg === 'list') {
      return {
        stdout: `->      v22.6.0 (current)
        v20.17.0 (lts/iron)
        v18.20.4 (lts/hydrogen)
default -> 22.6.0 (-> v22.6.0)
iojs -> N/A (default)
unstable -> N/A (default)
node -> stable (-> v22.6.0) (default)
stable -> 22.6 (-> v22.6.0) (default)
lts/* -> lts/iron (-> v20.17.0)
lts/argon -> v4.9.1 (-> N/A)
lts/boron -> v6.17.1 (-> N/A)
lts/carbon -> v8.17.0 (-> N/A)
lts/dubnium -> v10.24.1 (-> N/A)
lts/erbium -> v12.22.12 (-> N/A)
lts/fermium -> v14.21.3 (-> N/A)
lts/gallium -> v16.20.2 (-> N/A)
lts/hydrogen -> v18.20.4 (-> v18.20.4)
lts/iron -> v20.17.0 (-> v20.17.0)
lts/jod -> v22.6.0 (-> v22.6.0)
`,
        stderr: '',
        exitCode: 0,
      };
    }
    if (firstArg === 'current') {
      return { stdout: 'v22.6.0\n', stderr: '', exitCode: 0 };
    }
    if (firstArg === 'use') {
      const ver = args[1] || '22';
      return { stdout: `Now using node ${ver.startsWith('v') ? ver : 'v' + ver} (npm v10.8.2)\n`, stderr: '', exitCode: 0 };
    }
    if (firstArg === 'install') {
      const ver = args[1] || '--lts';
      const resolved = ver === '--lts' ? 'v20.17.0' : (ver.startsWith('v') ? ver : 'v' + ver);
      return {
        stdout: `Downloading and installing node ${resolved}...\nDownloading https://nodejs.org/dist/${resolved}/node-${resolved}-linux-x64.tar.xz...\n######################################################################## 100.0%\nComputing checksum with sha256sum\nChecksums matched!\nNow using node ${resolved} (npm v10.8.2)\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  if (cmd === 'tsc') {
    if (isVersion) {
      return { stdout: 'Version 5.5.4\n', stderr: '', exitCode: 0 };
    }
    if (isHelp) {
      return {
        stdout: `Version 5.5.4\nSyntax:   tsc [options] [file...]\n\nExamples: tsc hello.ts\n          tsc --outFile file.js file.ts\n          tsc @args.txt\n          tsc --build tsconfig.json\n\nCommon Options:\n  --help, -h               Print this message.\n  --version, -v            Print the compiler's version.\n  --project, -p            Compile the project given the path to its configuration file, or to a folder with a 'tsconfig.json'.\n  --watch, -w              Watch input files.\n  --target, -t             Set the JavaScript language version for emitted JavaScript and include compatible library declarations.\n  --module, -m             Specify what module code is generated.\n  --outDir                 Redirect output structure to the directory.\n  --outFile                Specify a file that bundles all outputs into one JavaScript file. If 'declaration' is true, also designates a file that bundles all .d.ts output.\n  --strict                 Enable all strict type-checking options.\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  // 29. Git, Make, Curl, Pip
  if (cmd === 'git') {
    if (isVersion) {
      return { stdout: 'git version 2.43.0\n', stderr: '', exitCode: 0 };
    }
  }

  if (cmd === 'curl') {
    if (isVersion) {
      return {
        stdout: `curl 8.5.0 (x86_64-pc-linux-gnu) libcurl/8.5.0 OpenSSL/3.0.13 zlib/1.3 brotli/1.1.0 zstd/1.5.5 libidn2/2.3.7 libpsl/0.21.2 (+libidn2/2.3.7) libssh/0.10.6/openssl/zlib nghttp2/1.59.0\nRelease-Date: 2023-12-06\nProtocols: dict file ftp ftps gopher gophers http https imap imaps ldap ldaps mqtt pop3 pop3s rtmp rtsp scp sftp smb smbs smtp smtps telnet tftp\nFeatures: alt-svc AsynchDNS brotli GSS-API HSTS HTTP2 HTTPS-proxy IDN IPv6 Kerberos Largefile libz NTLM PSL SPNEGO SSL threadsafe TLS-SRP UnixSockets zstd\n`,
        stderr: '',
        exitCode: 0,
      };
    }
  }

  if (cmd === 'make') {
    if (isVersion) {
      return { stdout: 'GNU Make 4.3\nBuilt for x86_64-pc-linux-gnu\nCopyright (C) 1988-2020 Free Software Foundation, Inc.\n', stderr: '', exitCode: 0 };
    }
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'make: *** No targets specified and no makefile found.  Stop.\n',
        exitCode: 2,
      };
    }
  }

  if (cmd === 'pip' || cmd === 'pip3') {
    if (isVersion) {
      return { stdout: 'pip 24.0 from /usr/lib/python3/dist-packages/pip (python 3.12)\n', stderr: '', exitCode: 0 };
    }
  }

  // 30. Compilers / runtimes listing
  if (cmd === 'compilers' || cmd === 'runtimes') {
    let out = `╔════════════════════════════════════════════════════════════════════════════════════════════╗\n`;
    out += `║                   ⚡ QSHELL 30 PRE-INSTALLED COMPILERS & TOOLCHAINS                        ║\n`;
    out += `╚════════════════════════════════════════════════════════════════════════════════════════════╝\n\n`;
    out += `  #   COMMAND         NAME / LANGUAGE            VERSION              CATEGORY\n`;
    out += ` ────────────────────────────────────────────────────────────────────────────────────────────\n`;
    PREINSTALLED_COMPILERS.forEach((c, idx) => {
      const num = String(idx + 1).padStart(2, ' ');
      const cmdPad = c.command.padEnd(15, ' ');
      const namePad = c.name.padEnd(26, ' ');
      const verPad = c.version.padEnd(20, ' ');
      out += ` ${num}. ${cmdPad} ${namePad} ${verPad} [${c.category}]\n`;
    });
    out += `\nType '<command> --version' or '<command> --help' for details.\n`;
    return { stdout: out, stderr: '', exitCode: 0 };
  }

  return null;
}
