const std = @import("std");
const lexer = @import("compiler/lexer.zig");

// Exact production lexer, run to EOF before parsing. No alternate tokenization.
pub fn write(source: []const u8, writer: anytype) !void {
    var lex = lexer.Lexer.init(source);
    try writer.writeAll("[");
    var first = true;
    while (true) {
        const token = lex.nextToken();
        if (!first) try writer.writeAll(",");
        first = false;
        try writer.writeAll("{\"kind\":");
        try std.json.stringify(@tagName(token.type), .{}, writer);
        try writer.writeAll(",\"lexeme\":");
        if (std.unicode.utf8ValidateSlice(token.lexeme)) {
            try std.json.stringify(token.lexeme, .{}, writer);
        } else {
            // The byte-oriented lexer can split a non-ASCII character into
            // invalid one-byte tokens. Preserve each byte visibly and losslessly.
            try writer.writeAll("\"");
            for (token.lexeme) |byte| try writer.print("\\\\x{X:0>2}", .{byte});
            try writer.writeAll("\",\"lexeme_encoding\":\"escaped-bytes\"");
        }
        try writer.print(",\"line\":{d},\"column\":{d}}}", .{token.line, token.column});
        if (token.type == .eof) break;
    }
    try writer.writeAll("]");
}
