const std = @import("std");
const lexer = @import("compiler/lexer.zig");
const parser = @import("compiler/parser.zig");
const ast = @import("compiler/ast.zig");
const codegen = @import("compiler/codegen.zig");
const z80codegen = @import("compiler/z80codegen.zig");
const vm = @import("vm/vm.zig");

const Lexer = lexer.Lexer;
const Parser = parser.Parser;
const CodeGen = codegen.CodeGen;
const VM = vm.VM;

pub fn main() void {
    runMain() catch |err| {
        std.io.getStdErr().writer().print("Error: {s}\n", .{@errorName(err)}) catch {};
        std.process.exit(1);
    };
}

fn runMain() !void {
    const stdout = std.io.getStdOut().writer();
    const stderr = std.io.getStdErr().writer();
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 2) {
        try printUsage(stdout);
        return;
    }

    const command = args[1];

    if (std.mem.eql(u8, command, "z80")) {
        // Z80アセンブリ生成: .ykw -> .z80
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            try stderr.print("Usage: ykw z80 <input.ykw> [-o output.z80]\n", .{});
            return;
        }
        const input_file = args[2];
        var output_file: []const u8 = "output.z80";

        // -o オプションをチェック
        var i: usize = 3;
        while (i < args.len) : (i += 1) {
            if (std.mem.eql(u8, args[i], "-o") and i + 1 < args.len) {
                output_file = args[i + 1];
                break;
            }
        }

        try compileZ80File(input_file, output_file, allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "compile") or std.mem.eql(u8, command, "c")) {
        // コンパイル: .ykw -> .🦅
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            try stderr.print("Usage: ykw compile <input.ykw> [-o output.🦅]\n", .{});
            return;
        }
        const input_file = args[2];
        var output_file: []const u8 = "output.🦅";

        // -o オプションをチェック
        var i: usize = 3;
        while (i < args.len) : (i += 1) {
            if (std.mem.eql(u8, args[i], "-o") and i + 1 < args.len) {
                output_file = args[i + 1];
                break;
            }
        }

        try compileFile(input_file, output_file, allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "run") or std.mem.eql(u8, command, "r")) {
        // 実行: .🦅 を実行
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            try stderr.print("Usage: ykw run <program.🦅>\n", .{});
            return;
        }
        const input_file = args[2];
        try runOkrFile(input_file, allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "exec") or std.mem.eql(u8, command, "e")) {
        // コンパイル＆実行
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            try stderr.print("Usage: ykw exec <input.ykw>\n", .{});
            return;
        }
        const input_file = args[2];
        try execFile(input_file, allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "--tokens")) {
        // トークン表示（教材用）
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            return;
        }
        try showTokens(args[2], allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "--bc") or std.mem.eql(u8, command, "--bytecode")) {
        // バイトコード表示（教材用）
        if (args.len < 3) {
            try stderr.print("Error: No input file specified\n", .{});
            return;
        }
        try showBytecode(args[2], allocator, stdout, stderr);
    } else if (std.mem.eql(u8, command, "help") or std.mem.eql(u8, command, "-h") or std.mem.eql(u8, command, "--help")) {
        try printUsage(stdout);
    } else {
        // ファイル名として解釈（簡易モード）
        if (std.mem.endsWith(u8, command, ".ykw") or std.mem.endsWith(u8, command, ".🐧")) {
            try execFile(command, allocator, stdout, stderr);
        } else if (std.mem.endsWith(u8, command, ".🦅")) {
            try runOkrFile(command, allocator, stdout, stderr);
        } else {
            try stderr.print("Error: Unknown command '{s}'\n", .{command});
            try printUsage(stderr);
        }
    }
}

fn printUsage(writer: anytype) !void {
    try writer.print(
        \\YanbaruKwina (YKW) Compiler & OkinawaRail VM v0.1.0
        \\
        \\Usage:
        \\  ykw compile <input.ykw> [-o output.🦅]  Compile .ykw to .🦅
        \\  ykw z80 <input.ykw> [-o output.z80]     Compile .ykw to Z80 asm
        \\  ykw run <program.🦅>                    Run .🦅 bytecode
        \\  ykw exec <input.ykw>                     Compile and run
        \\  ykw <file.ykw>                           Shorthand for exec
        \\  ykw <file.🦅>                           Shorthand for run
        \\
        \\Options (for learning):
        \\  ykw --tokens <file.ykw>     Show tokens
        \\  ykw --bc <file.ykw>         Show bytecode
        \\
        \\Examples:
        \\  ykw compile hello.ykw -o hello.🦅
        \\  ykw z80 hello.ykw -o hello.z80
        \\  ykw run hello.🦅
        \\  ykw exec hello.ykw
        \\
    , .{});
}

fn compileFile(input_path: []const u8, output_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    // ソースファイルを読み込む
    const source = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(source);

    // コンパイル
    const okr_data = try compile(source, allocator, stderr);
    defer allocator.free(okr_data);

    // 出力ファイルに書き込む
    const file = std.fs.cwd().createFile(output_path, .{}) catch |err| {
        try stderr.print("Error: Cannot create file '{s}': {}\n", .{ output_path, err });
        return;
    };
    defer file.close();

    file.writeAll(okr_data) catch |err| {
        try stderr.print("Error: Cannot write to file '{s}': {}\n", .{ output_path, err });
        return;
    };

    try stdout.print("Compiled: {s} -> {s} ({d} bytes)\n", .{ input_path, output_path, okr_data.len });
}

fn runOkrFile(input_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    _ = stdout;

    const data = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(data);

    var virtual_machine = VM.init();
    virtual_machine.loadAndRun(data) catch |err| {
        try stderr.print("Runtime error: {}\n", .{err});
        return;
    };
}

fn execFile(input_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    _ = stdout;

    const source = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(source);

    // コンパイル
    const okr_data = try compile(source, allocator, stderr);
    defer allocator.free(okr_data);

    // 実行
    var virtual_machine = VM.init();
    virtual_machine.loadAndRun(okr_data) catch |err| {
        try stderr.print("Runtime error: {}\n", .{err});
        return;
    };
}

fn showTokens(input_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    const source = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(source);

    try stdout.print("=== Tokens ===\n", .{});

    var lex = Lexer.init(source);
    while (true) {
        const token = lex.nextToken();
        try stdout.print("{d}:{d} {s} '{s}'\n", .{
            token.line,
            token.column,
            @tagName(token.type),
            token.lexeme,
        });
        if (token.type == .eof) break;
    }
}

fn showBytecode(input_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    const source = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(source);

    // コンパイル（バイトコードのみ）
    var lex = Lexer.init(source);
    var p = Parser.initWithLexer(&lex, allocator);
    defer p.deinit();

    const root = p.parse() catch |err| {
        try stderr.print("Parse error at {d}:{d}: {}\n", .{ p.current.line, p.current.column, err });
        return error.CompileFailed;
    };

    var cg = CodeGen.init(allocator);
    defer cg.deinit();

    cg.generate(root) catch |err| {
        try stderr.print("Compile error: {}\n", .{err});
        return;
    };

    try stdout.print("=== Bytecode ===\n", .{});
    try codegen.disassemble(cg.getCode(), stdout);
}

fn compile(source: []const u8, allocator: std.mem.Allocator, stderr: anytype) ![]u8 {
    var lex = Lexer.init(source);
    var p = Parser.initWithLexer(&lex, allocator);
    defer p.deinit();

    const root = p.parse() catch |err| {
        try stderr.print("Parse error at {d}:{d}: {}\n", .{ p.current.line, p.current.column, err });
        return error.CompileFailed;
    };

    var cg = CodeGen.init(allocator);
    defer cg.deinit();

    cg.generate(root) catch |err| {
        try stderr.print("Compile error: {}\n", .{err});
        return error.CompileFailed;
    };

    return cg.toOkrFormat() catch {
        try stderr.print("Error: Out of memory\n", .{});
        return error.CompileFailed;
    };
}

fn compileZ80File(input_path: []const u8, output_path: []const u8, allocator: std.mem.Allocator, stdout: anytype, stderr: anytype) !void {
    // ソースファイルを読み込む
    const source = readFile(input_path, allocator) catch |err| {
        try stderr.print("Error: Cannot open file '{s}': {}\n", .{ input_path, err });
        return;
    };
    defer allocator.free(source);

    // Z80アセンブリに変換
    const asm_output = try compileToZ80(source, allocator, stderr);
    defer allocator.free(asm_output);

    // 出力ファイルに書き込む
    const file = std.fs.cwd().createFile(output_path, .{}) catch |err| {
        try stderr.print("Error: Cannot create file '{s}': {}\n", .{ output_path, err });
        return;
    };
    defer file.close();

    file.writeAll(asm_output) catch |err| {
        try stderr.print("Error: Cannot write to file '{s}': {}\n", .{ output_path, err });
        return;
    };

    try stdout.print("Compiled to Z80: {s} -> {s} ({d} bytes)\n", .{ input_path, output_path, asm_output.len });
}

fn compileToZ80(source: []const u8, allocator: std.mem.Allocator, stderr: anytype) ![]u8 {
    var lex = Lexer.init(source);
    var p = Parser.initWithLexer(&lex, allocator);
    defer p.deinit();

    const root = p.parse() catch |err| {
        try stderr.print("Parse error at {d}:{d}: {}\n", .{ p.current.line, p.current.column, err });
        return error.CompileFailed;
    };

    var z80cg = z80codegen.Z80CodeGen.init(allocator);
    defer z80cg.deinit();

    z80cg.generate(root) catch |err| {
        try stderr.print("Z80 Compile error: {}\n", .{err});
        return error.CompileFailed;
    };

    // 出力を複製して返す
    const output = z80cg.getOutput();
    return try allocator.dupe(u8, output);
}

fn readFile(path: []const u8, allocator: std.mem.Allocator) ![]u8 {
    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();
    return try file.readToEndAlloc(allocator, 1024 * 1024);
}

test "lexer keywords" {
    const source = "moshi aruku naku";
    var lex = Lexer.init(source);

    const t1 = lex.nextToken();
    try std.testing.expectEqual(lexer.TokenType.kw_if, t1.type);

    const t2 = lex.nextToken();
    try std.testing.expectEqual(lexer.TokenType.kw_while, t2.type);

    const t3 = lex.nextToken();
    try std.testing.expectEqual(lexer.TokenType.kw_print, t3.type);
}
