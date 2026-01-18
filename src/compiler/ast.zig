const std = @import("std");
const lexer = @import("lexer.zig");
const Token = lexer.Token;

pub const NodeType = enum {
    // 式
    literal,
    identifier,
    binary,
    unary,
    call,
    grouping,

    // 文
    expression_stmt,
    print_stmt,
    var_decl,
    const_decl,
    block,
    if_stmt,
    while_stmt,
    for_stmt,
    function_decl,
    return_stmt,

    // プログラム
    program,
};

pub const Value = union(enum) {
    number: f64,
    string: []const u8,
    boolean: bool,
    null_val: void,
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
    unary: UnaryData,
    call: CallData,
    grouping: GroupingData,
    expression_stmt: ExpressionStmtData,
    print_stmt: PrintStmtData,
    var_decl: VarDeclData,
    const_decl: ConstDeclData,
    block: BlockData,
    if_stmt: IfStmtData,
    while_stmt: WhileStmtData,
    for_stmt: ForStmtData,
    function_decl: FunctionDeclData,
    return_stmt: ReturnStmtData,
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

pub const UnaryData = struct {
    operator: Token,
    operand: *Node,
};

pub const CallData = struct {
    callee: *Node,
    arguments: std.ArrayList(*Node),
};

pub const GroupingData = struct {
    expression: *Node,
};

pub const ExpressionStmtData = struct {
    expression: *Node,
};

pub const PrintStmtData = struct {
    expression: *Node,
};

pub const VarDeclData = struct {
    name: []const u8,
    initializer: ?*Node,
};

pub const ConstDeclData = struct {
    name: []const u8,
    initializer: *Node,
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

pub const ForStmtData = struct {
    variable: []const u8,
    iterable: *Node,
    body: *Node,
};

pub const FunctionDeclData = struct {
    name: []const u8,
    parameters: std.ArrayList([]const u8),
    body: *Node,
};

pub const ReturnStmtData = struct {
    value: ?*Node,
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
    var ast = Ast.init(std.testing.allocator);
    defer ast.deinit();

    const node = try ast.createNode(
        .literal,
        .{ .literal = .{ .value = .{ .number = 42.0 } } },
        null,
    );

    try std.testing.expectEqual(NodeType.literal, node.node_type);
}
