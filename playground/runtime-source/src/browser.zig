const std = @import("std");
const lexer = @import("compiler/lexer.zig");
const parser = @import("compiler/parser.zig");
const tokens_json = @import("tokens_json.zig");
const ast_json = @import("ast_json.zig");
const z80 = @import("compiler/z80codegen.zig");
var input: [65536]u8 = undefined;
var output: [1048576]u8 = undefined;
var out_len: usize = 0;
var ast_output: [2 * 1024 * 1024]u8 = undefined;
var ast_len: usize = 0;
var tokens_output: [2 * 1024 * 1024]u8 = undefined;
var tokens_len: usize = 0;
export fn tokens_ptr() usize { return @intFromPtr(&tokens_output); }
export fn tokens_length() usize { return tokens_len; }
var arena_mem: [16 * 1024 * 1024]u8 = undefined;
export fn ast_ptr() usize {
    return @intFromPtr(&ast_output);
}
export fn ast_length() usize {
    return ast_len;
}
export fn input_ptr() usize {
    return @intFromPtr(&input);
}
export fn output_ptr() usize {
    return @intFromPtr(&output);
}
export fn output_len() usize {
    return out_len;
}
fn fail(message: []const u8) u32 {
    out_len = @min(message.len, output.len);
    @memcpy(output[0..out_len], message[0..out_len]);
    return 1;
}
export fn compile(len: usize) u32 {
    out_len = 0;
    ast_len = 0;
    tokens_len = 0;
    if (len > input.len) return fail("Source exceeds 64 KiB");
    var fba = std.heap.FixedBufferAllocator.init(&arena_mem);
    const alloc = fba.allocator();
    var token_stream = std.io.fixedBufferStream(&tokens_output);
    tokens_json.write(input[0..len], token_stream.writer()) catch return fail("Token serialization exceeds visualization size limit");
    tokens_len = token_stream.pos;
    var lex = lexer.Lexer.init(input[0..len]);
    var p = parser.Parser.initWithLexer(&lex, alloc);
    const root = p.parse() catch |err| {
        const msg = std.fmt.bufPrint(&output, "Parse error at line {d}, column {d}: {s}", .{ p.current.line, p.current.column, @errorName(err) }) catch return fail("Parse error");
        out_len = msg.len;
        return 1;
    };
    var ast_stream = std.io.fixedBufferStream(&ast_output);
    var next_id: usize = 0;
    ast_json.write(root, "", ast_stream.writer(), alloc, &next_id) catch |err| {
        return fail(if (err == error.NoSpaceLeft) "AST exceeds visualization size limit" else "AST serialization failed");
    };
    ast_len = ast_stream.pos;
    var gen = z80.Z80CodeGen.init(alloc);
    gen.generate(root) catch |err| {
        return fail(@errorName(err));
    };
    const result = gen.getOutput();
    if (result.len > output.len) return fail("Assembly too large");
    @memcpy(output[0..result.len], result);
    out_len = result.len;
    return 0;
}
