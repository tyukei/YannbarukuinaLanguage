const std = @import("std");
const lexer = @import("lexer.zig");
const Token = lexer.Token;

pub const NodeType = enum {
    // 式
    literal,
    identifier,
    binary,
    grouping,

    // 文
    assign_stmt,
    print_stmt,
    block,
    if_stmt,
    while_stmt,
    break_stmt,
    continue_stmt,

    // プログラム
    program,
};

pub const Value = union(enum) {
    number: u16, // YKWはu16のみ
};

pub const Node = struct {
    node_type: NodeType,
    data: NodeData,
    token: ?Token,

    const Self = @This();

    pub fn init(node_type: NodeType, data: NodeData, token: ?Token) Self {
        return Self{
            .node_type = node_type,
            .data = data,
            .token = token,
        };
    }
};

pub const NodeData = union(enum) {
    literal: LiteralData,
    identifier: IdentifierData,
    binary: BinaryData,
    grouping: GroupingData,
    assign_stmt: AssignStmtData,
    print_stmt: PrintStmtData,
    block: BlockData,
    if_stmt: IfStmtData,
    while_stmt: WhileStmtData,
    break_stmt: void,
    continue_stmt: void,
    program: ProgramData,
};

pub const LiteralData = struct {
    value: Value,
};

pub const IdentifierData = struct {
    name: []const u8,
};

pub const BinaryData = struct {
    left: *Node,
    operator: Token,
    right: *Node,
};

pub const GroupingData = struct {
    expression: *Node,
};

pub const AssignStmtData = struct {
    name: []const u8,
    value: *Node,
};

pub const PrintStmtData = struct {
    expression: *Node,
};

pub const BlockData = struct {
    statements: std.ArrayList(*Node),
};

pub const IfStmtData = struct {
    condition: *Node,
    then_branch: *Node,
    else_branch: ?*Node,
};

pub const WhileStmtData = struct {
    condition: *Node,
    body: *Node,
};

pub const ProgramData = struct {
    statements: std.ArrayList(*Node),
};

pub const Ast = struct {
    root: ?*Node,
    allocator: std.mem.Allocator,
    nodes: std.ArrayList(*Node),

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .root = null,
            .allocator = allocator,
            .nodes = std.ArrayList(*Node).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        // ノード内のArrayListを先に解放
        for (self.nodes.items) |node| {
            switch (node.data) {
                .block => |*data| data.statements.deinit(),
                .program => |*data| data.statements.deinit(),
                else => {},
            }
        }
        // ノード自体を解放
        for (self.nodes.items) |node| {
            self.allocator.destroy(node);
        }
        self.nodes.deinit();
    }

    pub fn createNode(self: *Self, node_type: NodeType, data: NodeData, token: ?Token) !*Node {
        const node = try self.allocator.create(Node);
        node.* = Node.init(node_type, data, token);
        try self.nodes.append(node);
        return node;
    }
};

test "ast node creation" {
    var tree = Ast.init(std.testing.allocator);
    defer tree.deinit();

    const node = try tree.createNode(
        .literal,
        .{ .literal = .{ .value = .{ .number = 42 } } },
        null,
    );

    try std.testing.expectEqual(NodeType.literal, node.node_type);
}
