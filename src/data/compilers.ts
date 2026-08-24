import { CompilerRuntime } from '../types';

export const PREINSTALLED_COMPILERS: CompilerRuntime[] = [
  {
    id: 'python',
    name: 'Python',
    version: '3.12.4',
    category: 'Web & Scripting',
    extension: 'py',
    command: 'python3',
    runCommand: 'python3 {file}',
    icon: 'FileCode2',
    description: 'Modern high-level dynamic language with vast scientific and web libraries.',
    popularRank: 1,
    installed: true,
    replSupported: true,
    replPrompt: '>>> ',
    sampleCode: `def fibonacci(n):
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    return sequence

print("== Qshell Python 3.12 Runtime ==")
numbers = fibonacci(10)
print(f"Generated Fibonacci (10 terms): {numbers}")
print(f"Sum of terms: {sum(numbers)}")
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    version: 'v22.6.0',
    category: 'Web & Scripting',
    extension: 'js',
    command: 'node',
    runCommand: 'node {file}',
    icon: 'FileCode',
    description: 'V8 JavaScript runtime built for scalable network applications and scripting.',
    popularRank: 2,
    installed: true,
    replSupported: true,
    replPrompt: '> ',
    sampleCode: `console.log("== Qshell Node.js v22 Runtime ==");
const os = {
  platform: "Qshell-DualOS",
  arch: "x86_64",
  kernel: "6.8.0",
  cores: 8
};

console.log("Environment Platform:", os);
const items = ["Compilers", "Terminal", "VS Code Editor", "GitHub Sync", "Firebase"];
console.log("Ready Modules:", items.join(" • "));
`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    version: '5.5.4',
    category: 'Web & Scripting',
    extension: 'ts',
    command: 'tsc',
    runCommand: 'ts-node {file}',
    compileCommand: 'tsc {file}',
    icon: 'FileCode',
    description: 'Typed superset of JavaScript that compiles to clean JavaScript output.',
    popularRank: 3,
    installed: true,
    replSupported: true,
    replPrompt: 'ts> ',
    sampleCode: `interface WorkspaceMetric {
  id: string;
  name: string;
  status: "active" | "standby";
  latencyMs: number;
}

const metrics: WorkspaceMetric[] = [
  { id: "node-1", name: "In-Browser VFS", status: "active", latencyMs: 0.4 },
  { id: "node-2", name: "Cloud Container", status: "active", latencyMs: 12.8 }
];

console.log("== TypeScript 5.5 Runner ==");
metrics.forEach(m => console.log(\`[\${m.status.toUpperCase()}] \${m.name} (\${m.latencyMs}ms)\`));
`,
  },
  {
    id: 'c',
    name: 'C (GCC / Clang)',
    version: 'GCC 14.2 / Clang 18.1',
    category: 'Compiled & Native',
    extension: 'c',
    command: 'gcc',
    runCommand: 'gcc {file} -o main && ./main',
    compileCommand: 'gcc -O3 {file} -o main',
    icon: 'Cpu',
    description: 'High-performance foundational systems programming language with C23 standard.',
    popularRank: 4,
    installed: true,
    replSupported: false,
    sampleCode: `#include <stdio.h>

int main() {
    printf("== Qshell GCC 14.2 Native Compiler ==\\n");
    int sum = 0;
    for (int i = 1; i <= 100; i++) {
        sum += i;
    }
    printf("Sum from 1 to 100 calculated in C: %d\\n", sum);
    printf("Memory pointer check: %p\\n", &sum);
    return 0;
}
`,
  },
  {
    id: 'cpp',
    name: 'C++ (G++ / Clang++)',
    version: 'G++ 14.2 (C++23)',
    category: 'Compiled & Native',
    extension: 'cpp',
    command: 'g++',
    runCommand: 'g++ -std=c++23 {file} -o app && ./app',
    compileCommand: 'g++ -std=c++23 {file} -o app',
    icon: 'Cpu',
    description: 'General-purpose systems and graphics programming language with modern STL.',
    popularRank: 5,
    installed: true,
    replSupported: false,
    sampleCode: `#include <iostream>
#include <vector>
#include <numeric>
#include <string>

int main() {
    std::cout << "== Qshell G++ (C++23) Compiler ==" << std::endl;
    std::vector<std::string> tools = {"Qshell Editor", "Root Terminal", "Dual Execution", "Sync Engine"};
    
    std::cout << "Initialized tools count: " << tools.size() << std::endl;
    for (const auto& tool : tools) {
        std::cout << " -> " << tool << std::endl;
    }
    return 0;
}
`,
  },
  {
    id: 'rust',
    name: 'Rust (rustc / Cargo)',
    version: '1.80.1 (edition 2021)',
    category: 'Compiled & Native',
    extension: 'rs',
    command: 'rustc',
    runCommand: 'rustc {file} -o main && ./main',
    compileCommand: 'cargo build --release',
    icon: 'Shield',
    description: 'Empowering everyone to build reliable and efficient memory-safe software.',
    popularRank: 6,
    installed: true,
    replSupported: false,
    sampleCode: `fn main() {
    println!("== Qshell Rust 1.80 Native Compiler ==");
    let languages = vec!["Rust", "Go", "C++", "Python", "TypeScript"];
    
    let filtered: Vec<&str> = languages.into_iter().filter(|l| l.len() > 3).collect();
    println!("Languages with length > 3: {:?}", filtered);
    println!("Zero-cost abstractions & memory safety: Verified.");
}
`,
  },
  {
    id: 'go',
    name: 'Go (Golang)',
    version: 'go1.23.0',
    category: 'Compiled & Native',
    extension: 'go',
    command: 'go',
    runCommand: 'go run {file}',
    compileCommand: 'go build -o app {file}',
    icon: 'Layers',
    description: 'Open source programming language that makes it easy to build simple, fast software.',
    popularRank: 7,
    installed: true,
    replSupported: false,
    sampleCode: `package main

import (
	"fmt"
	"time"
)

func main() {
	fmt.Println("== Qshell Go 1.23 Runtime ==")
	ch := make(chan string)

	go func() {
		time.Sleep(10 * time.Millisecond)
		ch <- "Goroutine completed successfully with channel sync!"
	}()

	msg := <-ch
	fmt.Println("Channel message:", msg)
}
`,
  },
  {
    id: 'java',
    name: 'Java (OpenJDK)',
    version: '21.0.4 LTS',
    category: 'Compiled & Native',
    extension: 'java',
    command: 'javac',
    runCommand: 'javac {file} && java Main',
    compileCommand: 'javac {file}',
    icon: 'Coffee',
    description: 'Robust, object-oriented multiplatform language running on Java Virtual Machine.',
    popularRank: 8,
    installed: true,
    replSupported: true,
    replPrompt: 'jshell> ',
    sampleCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("== Qshell OpenJDK 21 LTS ==");
        var greeting = "Hello from Virtual Machine execution";
        System.out.println("Status: " + greeting);
        System.out.println("Process ID: " + ProcessHandle.current().pid());
    }
}
`,
  },
  {
    id: 'csharp',
    name: 'C# (.NET SDK)',
    version: '.NET 8.0.300',
    category: 'Compiled & Native',
    extension: 'cs',
    command: 'dotnet',
    runCommand: 'dotnet run {file}',
    compileCommand: 'dotnet build',
    icon: 'Binary',
    description: 'Modern, object-oriented, and type-safe programming language by Microsoft.',
    popularRank: 9,
    installed: true,
    replSupported: true,
    replPrompt: 'csharp> ',
    sampleCode: `using System;

class Program {
    static void Main() {
        Console.WriteLine("== Qshell .NET 8.0 Runtime ==");
        var now = DateTime.UtcNow;
        Console.WriteLine($"Current UTC Time: {now:yyyy-MM-dd HH:mm:ss}");
        Console.WriteLine("Cloud sandbox ready.");
    }
}
`,
  },
  {
    id: 'php',
    name: 'PHP CLI',
    version: '8.3.10',
    category: 'Web & Scripting',
    extension: 'php',
    command: 'php',
    runCommand: 'php {file}',
    icon: 'Globe',
    description: 'Popular general-purpose scripting language that is especially suited to web dev.',
    popularRank: 10,
    installed: true,
    replSupported: true,
    replPrompt: 'php > ',
    sampleCode: `<?php
echo "== Qshell PHP 8.3 CLI Runtime ==" . PHP_EOL;
$data = [
    "platform" => "Qshell",
    "version" => "8.3.10",
    "jit_enabled" => true,
    "runtimes_supported" => 30
];
echo json_encode($data, JSON_PRETTY_PRINT) . PHP_EOL;
`,
  },
  {
    id: 'ruby',
    name: 'Ruby (CRuby)',
    version: '3.3.4',
    category: 'Web & Scripting',
    extension: 'rb',
    command: 'ruby',
    runCommand: 'ruby {file}',
    icon: 'Gem',
    description: 'Dynamic, open source programming language with a focus on simplicity and productivity.',
    popularRank: 11,
    installed: true,
    replSupported: true,
    replPrompt: 'irb(main):001:0> ',
    sampleCode: `puts "== Qshell Ruby 3.3.4 Interpreter =="
class Workspace
  attr_reader :name, :tier
  def initialize(name, tier)
    @name = name
    @tier = tier
  end
  def summary
    "#{@name} is operating in #{@tier} mode."
  end
end

ws = Workspace.new("Qshell Web IDE", "Dual Cloud/Browser")
puts ws.summary
`,
  },
  {
    id: 'swift',
    name: 'Swift',
    version: '6.0 Release',
    category: 'Compiled & Native',
    extension: 'swift',
    command: 'swift',
    runCommand: 'swift {file}',
    icon: 'Zap',
    description: 'Powerful and intuitive programming language created by Apple for multiplatform apps.',
    popularRank: 12,
    installed: true,
    replSupported: true,
    replPrompt: '1> ',
    sampleCode: `import Foundation

print("== Qshell Swift 6.0 Runtime ==")
let languages: [String] = ["Swift", "Rust", "C++", "Go"]
let mapped = languages.map { "Language: \\($0)" }
for item in mapped {
    print(item)
}
`,
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    version: '2.0.20',
    category: 'Compiled & Native',
    extension: 'kt',
    command: 'kotlinc',
    runCommand: 'kotlinc {file} -include-runtime -d app.jar && java -jar app.jar',
    icon: 'Sparkles',
    description: 'Modern concise cross-platform statically typed language by JetBrains.',
    popularRank: 13,
    installed: true,
    replSupported: true,
    replPrompt: '>>> ',
    sampleCode: `fun main() {
    println("== Qshell Kotlin 2.0 Runner ==")
    val numbers = (1..5).map { it * it }
    println("Squares list: $numbers")
    println("Max value: \${numbers.maxOrNull()}")
}
`,
  },
  {
    id: 'dart',
    name: 'Dart SDK',
    version: '3.5.1',
    category: 'Web & Scripting',
    extension: 'dart',
    command: 'dart',
    runCommand: 'dart run {file}',
    icon: 'Terminal',
    description: 'Client-optimized language for fast apps on any platform by Google.',
    popularRank: 14,
    installed: true,
    replSupported: false,
    sampleCode: `void main() {
  print('== Qshell Dart 3.5 SDK ==');
  final map = {'system': 'Qshell', 'tier': 'Root Terminal', 'version': 3.5};
  map.forEach((k, v) => print('$k -> $v'));
}
`,
  },
  {
    id: 'lua',
    name: 'Lua',
    version: '5.4.7',
    category: 'Web & Scripting',
    extension: 'lua',
    command: 'lua',
    runCommand: 'lua {file}',
    icon: 'Moon',
    description: 'Powerful, efficient, lightweight, embeddable scripting language.',
    popularRank: 15,
    installed: true,
    replSupported: true,
    replPrompt: '> ',
    sampleCode: `print("== Qshell Lua 5.4 Script Engine ==")
function factorial(n)
  if n == 0 then return 1 else return n * factorial(n - 1) end
end

print("Factorial of 6:", factorial(6))
`,
  },
  {
    id: 'r',
    name: 'R (Statistical Computing)',
    version: '4.4.1',
    category: 'Data & Scientific',
    extension: 'r',
    command: 'Rscript',
    runCommand: 'Rscript {file}',
    icon: 'BarChart2',
    description: 'Language and environment for statistical computing, graphics, and data science.',
    popularRank: 16,
    installed: true,
    replSupported: true,
    replPrompt: '> ',
    sampleCode: `cat("== Qshell R 4.4 Statistical Environment ==\\n")
data_points <- c(12, 19, 3, 5, 2, 3, 20, 15)
cat("Mean:", mean(data_points), "\\n")
cat("Standard Deviation:", sd(data_points), "\\n")
`,
  },
  {
    id: 'perl',
    name: 'Perl',
    version: '5.38.2',
    category: 'Web & Scripting',
    extension: 'pl',
    command: 'perl',
    runCommand: 'perl {file}',
    icon: 'Code',
    description: 'Highly capable, feature-rich programming language with 36 years of development.',
    popularRank: 17,
    installed: true,
    replSupported: false,
    sampleCode: `#!/usr/bin/perl
use strict;
use warnings;

print "== Qshell Perl 5.38 Runtime ==\\n";
my @tools = ('sed', 'awk', 'grep', 'perl');
print "Text processing utilities: " . join(", ", @tools) . "\\n";
`,
  },
  {
    id: 'elixir',
    name: 'Elixir (Erlang/OTP)',
    version: '1.17.2',
    category: 'Functional & Modern',
    extension: 'exs',
    command: 'elixir',
    runCommand: 'elixir {file}',
    icon: 'Flame',
    description: 'Dynamic, functional language for building scalable and maintainable applications on BEAM.',
    popularRank: 18,
    installed: true,
    replSupported: true,
    replPrompt: 'iex(1)> ',
    sampleCode: `IO.puts("== Qshell Elixir 1.17 Engine ==")
list = [1, 2, 3, 4, 5]
sum = list |> Enum.map(&(&1 * 2)) |> Enum.sum()
IO.puts("Pipeline processed sum (doubled): #{sum}")
`,
  },
  {
    id: 'scala',
    name: 'Scala 3',
    version: '3.5.0',
    category: 'Functional & Modern',
    extension: 'scala',
    command: 'scala',
    runCommand: 'scala {file}',
    icon: 'Box',
    description: 'Scala combines object-oriented and functional programming in one concise high-level language.',
    popularRank: 19,
    installed: true,
    replSupported: true,
    replPrompt: 'scala> ',
    sampleCode: `@main def hello(): Unit =
  println("== Qshell Scala 3.5 Runtime ==")
  val numbers = List(10, 20, 30, 40)
  println(s"Reduced sum: \${numbers.reduce(_ + _)}")
`,
  },
  {
    id: 'zig',
    name: 'Zig Compiler',
    version: '0.13.0',
    category: 'Compiled & Native',
    extension: 'zig',
    command: 'zig',
    runCommand: 'zig run {file}',
    compileCommand: 'zig build-exe -O ReleaseSafe {file}',
    icon: 'FastForward',
    description: 'General-purpose programming language and toolchain for maintaining robust software.',
    popularRank: 20,
    installed: true,
    replSupported: false,
    sampleCode: `const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("== Qshell Zig 0.13 Native Compiler ==\\n", .{});
    try stdout.print("Safety, speed, and maintainable systems code.\\n", .{});
}
`,
  },
  {
    id: 'haskell',
    name: 'Haskell (GHC)',
    version: '9.8.2',
    category: 'Functional & Modern',
    extension: 'hs',
    command: 'ghc',
    runCommand: 'runghc {file}',
    compileCommand: 'ghc -O2 {file} -o app',
    icon: 'Infinity',
    description: 'Purely functional programming language with expressive type system and lazy evaluation.',
    popularRank: 21,
    installed: true,
    replSupported: true,
    replPrompt: 'Prelude> ',
    sampleCode: `main :: IO ()
main = do
    putStrLn "== Qshell GHC 9.8 Glasgow Haskell =="
    let primes = take 5 [x | x <- [2..], all (\\d -> x \`mod\` d /= 0) [2..x-1]]
    putStrLn ("First 5 primes: " ++ show primes)
`,
  },
  {
    id: 'bash',
    name: 'GNU Bash & Shell',
    version: '5.2.21',
    category: 'System',
    extension: 'sh',
    command: 'bash',
    runCommand: 'bash {file}',
    icon: 'Terminal',
    description: 'The standard sh-compatible shell language for Unix systems and automation.',
    popularRank: 22,
    installed: true,
    replSupported: true,
    replPrompt: 'root@qshell:~# ',
    sampleCode: `#!/bin/bash
echo "== Qshell GNU Bash 5.2 Executor =="
echo "Operating System: $(uname -s) $(uname -r)"
echo "Current User: $(whoami) (UID: 0)"
echo "Active Shell: $SHELL"
`,
  },
  {
    id: 'julia',
    name: 'Julia (High Performance)',
    version: '1.10.4',
    category: 'Data & Scientific',
    extension: 'jl',
    command: 'julia',
    runCommand: 'julia {file}',
    icon: 'Activity',
    description: 'High-level, high-performance dynamic programming language for numerical computing.',
    popularRank: 23,
    installed: true,
    replSupported: true,
    replPrompt: 'julia> ',
    sampleCode: `println("== Qshell Julia 1.10 Numerical Engine ==")
A = [1 2; 3 4]
b = [5; 6]
x = A \\ b
println("Solved Linear System Ax = b:")
println(x)
`,
  },
  {
    id: 'clojure',
    name: 'Clojure (JVM Lisp)',
    version: '1.12.0',
    category: 'Functional & Modern',
    extension: 'clj',
    command: 'clojure',
    runCommand: 'clj -M {file}',
    icon: 'Code2',
    description: 'Dynamic, general-purpose language, combining the approachability of a scripting language with JVM robustness.',
    popularRank: 24,
    installed: true,
    replSupported: true,
    replPrompt: 'user=> ',
    sampleCode: `(println "== Qshell Clojure 1.12 Lisp Engine ==")
(defn square [x] (* x x))
(println "Mapped squares:" (map square [1 2 3 4 5]))
`,
  },
  {
    id: 'nim',
    name: 'Nim Compiler',
    version: '2.0.8',
    category: 'Compiled & Native',
    extension: 'nim',
    command: 'nim',
    runCommand: 'nim c -r {file}',
    compileCommand: 'nim c -d:release {file}',
    icon: 'Crown',
    description: 'Statically typed compiled systems programming language with expressive syntax.',
    popularRank: 25,
    installed: true,
    replSupported: false,
    sampleCode: `import strformat

echo "== Qshell Nim 2.0 Compiler =="
let msg = "Expressive, efficient, elegant systems programming."
echo fmt"Status: {msg}"
`,
  },
  {
    id: 'ocaml',
    name: 'OCaml Native',
    version: '5.2.0',
    category: 'Functional & Modern',
    extension: 'ml',
    command: 'ocaml',
    runCommand: 'ocaml {file}',
    compileCommand: 'ocamlopt {file} -o app',
    icon: 'Disc',
    description: 'Industrial strength functional programming language with type inference and pattern matching.',
    popularRank: 26,
    installed: true,
    replSupported: true,
    replPrompt: '# ',
    sampleCode: `let () =
  print_endline "== Qshell OCaml 5.2 Native Runner ==";
  let rec fib n = if n <= 1 then n else fib (n - 1) + fib (n - 2) in
  Printf.printf "Fibonacci 8: %d\\n" (fib 8)
`,
  },
  {
    id: 'sql',
    name: 'SQLite / SQL Relational Engine',
    version: '3.46.0',
    category: 'Data & Scientific',
    extension: 'sql',
    command: 'sqlite3',
    runCommand: 'sqlite3 :memory: < {file}',
    icon: 'Database',
    description: 'Self-contained, serverless, transactional SQL database engine with ACID compliance.',
    popularRank: 27,
    installed: true,
    replSupported: true,
    replPrompt: 'sqlite> ',
    sampleCode: `-- Qshell SQLite 3.46 Relational Query Engine
CREATE TABLE workspaces (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    storage_sync TEXT NOT NULL,
    compilers_count INTEGER
);

INSERT INTO workspaces (name, storage_sync, compilers_count)
VALUES ('Main Development Hub', 'GitHub & Firebase Dual', 30);

SELECT * FROM workspaces;
`,
  },
  {
    id: 'fortran',
    name: 'GNU Fortran (gfortran)',
    version: 'gfortran 14.2',
    category: 'Data & Scientific',
    extension: 'f90',
    command: 'gfortran',
    runCommand: 'gfortran {file} -o app && ./app',
    compileCommand: 'gfortran -O3 {file} -o app',
    icon: 'Binary',
    description: 'High-performance numerical computation and scientific engineering language standard.',
    popularRank: 28,
    installed: true,
    replSupported: false,
    sampleCode: `program hello
    implicit none
    print *, "== Qshell GNU Fortran 14 Scientific Runner =="
    print *, "Scientific & High Performance Vector Math Engine Ready."
end program hello
`,
  },
  {
    id: 'erlang',
    name: 'Erlang (OTP 27)',
    version: '27.0.1',
    category: 'Functional & Modern',
    extension: 'erl',
    command: 'erl',
    runCommand: 'escript {file}',
    icon: 'Radio',
    description: 'Programming language used to build massively scalable soft real-time systems.',
    popularRank: 29,
    installed: true,
    replSupported: true,
    replPrompt: '1> ',
    sampleCode: `main(_) ->
    io:format("== Qshell Erlang/OTP 27 Concurrent Runtime =~n"),
    io:format("Actor model and distributed fault tolerance verified.~n").
`,
  },
  {
    id: 'wasm',
    name: 'WebAssembly (Wasm & WAT)',
    version: '1.0 / Wasmtime 24.0',
    category: 'Compiled & Native',
    extension: 'wat',
    command: 'wat2wasm',
    runCommand: 'wasmtime {file}',
    compileCommand: 'wat2wasm {file} -o module.wasm',
    icon: 'Boxes',
    description: 'Binary instruction format for a stack-based virtual machine designed for high performance.',
    popularRank: 30,
    installed: true,
    replSupported: false,
    sampleCode: `(module
  (import "console" "log" (func $log (param i32)))
  (func (export "main")
    i32.const 42
    call $log
  )
)
`,
  },
];
