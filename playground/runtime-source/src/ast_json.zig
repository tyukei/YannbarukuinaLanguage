const std = @import("std");
const ast = @import("compiler/ast.zig");

// Serialization only: this walks the parser's exact Node graph. No re-parsing
// or reconstruction from source/assembly takes place.
pub fn write(node: *const ast.Node, role: []const u8, writer: anytype, alloc: std.mem.Allocator, next_id: *usize) anyerror!void {
    const id = next_id.*;
    next_id.* += 1;
    const title: []const u8 = switch (node.data) {
        .program => "Program",
        .block => "Block",
        .literal => |d| try std.fmt.allocPrint(alloc, "Literal: {d}", .{d.value.number}),
        .identifier => |d| try std.fmt.allocPrint(alloc, "Identifier: {s}", .{d.name}),
        .binary => |d| try std.fmt.allocPrint(alloc, "Binary: {s}", .{d.operator.lexeme}),
        .grouping => "Grouping ( )",
        .assign_stmt => |d| try std.fmt.allocPrint(alloc, "Assign: {s}", .{d.name}),
        .print_stmt => "Print: naku",
        .if_stmt => "If: moshi / mata",
        .while_stmt => "While: aruku",
        .break_stmt => "Break: tobu",
        .continue_stmt => "Continue: hashiru",
    };
    const label = if (role.len == 0) title else try std.fmt.allocPrint(alloc, "{s} · {s}", .{ role, title });
    try writer.print("{{\"id\":{d},\"kind\":", .{id});
    try std.json.stringify(@tagName(node.node_type), .{}, writer);
    try writer.writeAll(",\"label\":");
    try std.json.stringify(label, .{}, writer);
    try writer.writeAll(",\"role\":");
    try std.json.stringify(role, .{}, writer);
    if (node.token) |token| {
        try writer.print(",\"line\":{d},\"column\":{d}", .{ token.line, token.column });
    } else {
        try writer.writeAll(",\"line\":null,\"column\":null");
    }
    try writer.writeAll(",\"children\":[");
    switch (node.data) {
        .program => |d| for (d.statements.items, 0..) |child, i| {
            if (i != 0) try writer.writeByte(',');
            try write(child, "statement", writer, alloc, next_id);
        },
        .block => |d| for (d.statements.items, 0..) |child, i| {
            if (i != 0) try writer.writeByte(',');
            try write(child, "statement", writer, alloc, next_id);
        },
        .binary => |d| {
            try write(d.left, "left", writer, alloc, next_id);
            try writer.writeByte(',');
            try write(d.right, "right", writer, alloc, next_id);
        },
        .grouping => |d| try write(d.expression, "expression", writer, alloc, next_id),
        .assign_stmt => |d| try write(d.value, "value", writer, alloc, next_id),
        .print_stmt => |d| try write(d.expression, "expression", writer, alloc, next_id),
        .if_stmt => |d| {
            try write(d.condition, "condition", writer, alloc, next_id);
            try writer.writeByte(',');
            try write(d.then_branch, "then", writer, alloc, next_id);
            if (d.else_branch) |branch| {
                try writer.writeByte(',');
                try write(branch, "else", writer, alloc, next_id);
            }
        },
        .while_stmt => |d| {
            try write(d.condition, "condition", writer, alloc, next_id);
            try writer.writeByte(',');
            try write(d.body, "body", writer, alloc, next_id);
        },
        else => {},
    }
    try writer.writeAll("]}");
}
