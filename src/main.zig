const std = @import("std");
const lexer = @import("compiler/lexer.zig");
const parser = @import("compiler/parser.zig");
const ast = @import("compiler/ast.zig");
const vm = @import("vm/vm.zig");

const Lexer = lexer.Lexer;
const Parser = parser.Parser;
const VM = vm.VM;
const Chunk = vm.Chunk;

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 2) {
        try stdout.print("やんばるくいな言語 インタプリタ v0.1.0\n", .{});
        try stdout.print("使い方: yannbarukuina <ファイル.ybk>\n", .{});
        try stdout.print("\nREPLモード:\n", .{});
        try repl(allocator);
        return;
    }

    const filename = args[1];
    try runFile(filename, allocator);
}

fn repl(allocator: std.mem.Allocator) !void {
    const stdin = std.io.getStdIn().reader();
    const stdout = std.io.getStdOut().writer();

    var virtual_machine = VM.init(allocator);
    defer virtual_machine.deinit();

    try stdout.print("> ", .{});

    var buf: [1024]u8 = undefined;
    while (stdin.readUntilDelimiterOrEof(&buf, '\n')) |maybe_line| {
        const line = maybe_line orelse break;

        if (line.len == 0) {
            try stdout.print("> ", .{});
            continue;
        }

        if (std.mem.eql(u8, line, "終了") or std.mem.eql(u8, line, "exit")) {
            try stdout.print("さようなら！\n", .{});
            break;
        }

        var lex = Lexer.init(line);
        var p = Parser.initWithLexer(&lex, allocator);
        defer p.deinit();

        if (p.parse()) |_| {
            try stdout.print("[パース成功]\n", .{});
        } else |err| {
            try stdout.print("パースエラー: {}\n", .{err});
        }

        try stdout.print("> ", .{});
    } else |err| {
        try stdout.print("入力エラー: {}\n", .{err});
    }
}

fn runFile(filename: []const u8, allocator: std.mem.Allocator) !void {
    const stdout = std.io.getStdOut().writer();

    const file = std.fs.cwd().openFile(filename, .{}) catch |err| {
        try stdout.print("ファイルを開けません: {s} ({any})\n", .{ filename, err });
        return;
    };
    defer file.close();

    const source = file.readToEndAlloc(allocator, 1024 * 1024) catch |err| {
        try stdout.print("ファイル読み込みエラー: {any}\n", .{err});
        return;
    };
    defer allocator.free(source);

    var lex = Lexer.init(source);
    var p = Parser.initWithLexer(&lex, allocator);
    defer p.deinit();

    if (p.parse()) |_| {
        try stdout.print("[パース成功] {s}\n", .{filename});
    } else |err| {
        try stdout.print("パースエラー: {}\n", .{err});
    }
}

test "lexer integration" {
    const source = "変数 x = 42;";
    var lex = Lexer.init(source);

    const t1 = lex.nextToken();
    try std.testing.expectEqual(lexer.TokenType.kw_let, t1.type);
}

test "vm integration" {
    var virtual_machine = VM.init(std.testing.allocator);
    defer virtual_machine.deinit();

    var chunk = Chunk.init(std.testing.allocator);
    defer chunk.deinit();

    const idx = try chunk.addConstant(.{ .number = 100.0 });
    try chunk.writeOpCode(.op_constant, 1);
    try chunk.write(idx, 1);
    try chunk.writeOpCode(.op_halt, 1);

    try virtual_machine.interpret(&chunk);
}
