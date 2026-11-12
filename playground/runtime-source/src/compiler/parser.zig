const std = @import("std");
const lexer = @import("lexer.zig");
const ast = @import("ast.zig");
const Lexer = lexer.Lexer;
const Token = lexer.Token;
const TokenType = lexer.TokenType;
const Node = ast.Node;
const NodeType = ast.NodeType;
const Ast = ast.Ast;

pub const ParseError = error{
    UnexpectedToken,
    ExpectedExpression,
    ExpectedIdentifier,
    ExpectedClosingParen,
    ExpectedClosingBrace,
    BreakOutsideLoop,
    ContinueOutsideLoop,
    InvalidNumber,
    OutOfMemory,
};

pub const Parser = struct {
    lex: *Lexer,
    current: Token,
    previous: Token,
    tree: Ast,
    had_error: bool,
    error_message: ?[]const u8,
    loop_depth: usize,

    const Self = @This();

    pub fn init(source: []const u8, allocator: std.mem.Allocator) Self {
        var lex = Lexer.init(source);
        const first_token = lex.nextToken();
        return Self{
            .lex = &lex,
            .current = first_token,
            .previous = first_token,
            .tree = Ast.init(allocator),
            .had_error = false,
            .error_message = null,
            .loop_depth = 0,
        };
    }

    pub fn initWithLexer(lex: *Lexer, allocator: std.mem.Allocator) Self {
        const first_token = lex.nextToken();
        return Self{
            .lex = lex,
            .current = first_token,
            .previous = first_token,
            .tree = Ast.init(allocator),
            .had_error = false,
            .error_message = null,
            .loop_depth = 0,
        };
    }

    pub fn deinit(self: *Self) void {
        self.tree.deinit();
    }

    pub fn parse(self: *Self) ParseError!*Node {
        var statements = std.ArrayList(*Node).init(self.tree.allocator);
        errdefer statements.deinit();

        while (!self.isAtEnd()) {
            const stmt = try self.statement();
            statements.append(stmt) catch return ParseError.OutOfMemory;
        }

        return self.tree.createNode(
            .program,
            .{ .program = .{ .statements = statements } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn statement(self: *Self) ParseError!*Node {
        // naku(expr) - print文
        if (self.match(.kw_print)) {
            return self.printStatement();
        }
        // moshi(expr) block - if文
        if (self.match(.kw_if)) {
            return self.ifStatement();
        }
        // aruku(expr) block - while文
        if (self.match(.kw_while)) {
            return self.whileStatement();
        }
        // tobu - break文
        if (self.match(.kw_break)) {
            return self.breakStatement();
        }
        // hashiru - continue文
        if (self.match(.kw_continue)) {
            return self.continueStatement();
        }
        // 代入文: IDENT = expr
        return self.assignStatement();
    }

    fn printStatement(self: *Self) ParseError!*Node {
        // naku(expr)
        if (!self.match(.left_paren)) {
            return ParseError.UnexpectedToken;
        }
        const value = try self.expression();
        if (!self.match(.right_paren)) {
            return ParseError.ExpectedClosingParen;
        }
        return self.tree.createNode(
            .print_stmt,
            .{ .print_stmt = .{ .expression = value } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn ifStatement(self: *Self) ParseError!*Node {
        // moshi(condition) block (mata(condition) block)* (hoka block)?
        if (!self.match(.left_paren)) {
            return ParseError.UnexpectedToken;
        }
        const condition = try self.expression();
        if (!self.match(.right_paren)) {
            return ParseError.ExpectedClosingParen;
        }
        const then_branch = try self.block();

        // mata (else if) のリストを処理
        var else_branch: ?*Node = null;
        var else_tail: ?*Node = null;

        // mata (else if) チェーン
        while (self.match(.kw_else_if)) {
            if (!self.match(.left_paren)) {
                return ParseError.UnexpectedToken;
            }
            const elif_condition = try self.expression();
            if (!self.match(.right_paren)) {
                return ParseError.ExpectedClosingParen;
            }
            const elif_branch = try self.block();

            // else if を入れ子の if として構築
            const elif_node = self.tree.createNode(
                .if_stmt,
                .{ .if_stmt = .{ .condition = elif_condition, .then_branch = elif_branch, .else_branch = null } },
                null,
            ) catch return ParseError.OutOfMemory;

            if (else_tail) |tail| {
                tail.data.if_stmt.else_branch = elif_node;
            } else {
                else_branch = elif_node;
            }
            else_tail = elif_node;
        }

        // hoka (else) ブロック
        if (self.match(.kw_else)) {
            const else_block = try self.block();
            if (else_tail) |tail| {
                tail.data.if_stmt.else_branch = else_block;
            } else {
                else_branch = else_block;
            }
        }

        return self.tree.createNode(
            .if_stmt,
            .{ .if_stmt = .{ .condition = condition, .then_branch = then_branch, .else_branch = else_branch } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn whileStatement(self: *Self) ParseError!*Node {
        // aruku(condition) block
        if (!self.match(.left_paren)) {
            return ParseError.UnexpectedToken;
        }
        const condition = try self.expression();
        if (!self.match(.right_paren)) {
            return ParseError.ExpectedClosingParen;
        }

        self.loop_depth += 1;
        defer self.loop_depth -= 1;
        const body = try self.block();

        return self.tree.createNode(
            .while_stmt,
            .{ .while_stmt = .{ .condition = condition, .body = body } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn breakStatement(self: *Self) ParseError!*Node {
        if (self.loop_depth == 0) {
            return ParseError.BreakOutsideLoop;
        }
        return self.tree.createNode(
            .break_stmt,
            .{ .break_stmt = {} },
            self.previous,
        ) catch ParseError.OutOfMemory;
    }

    fn continueStatement(self: *Self) ParseError!*Node {
        if (self.loop_depth == 0) {
            return ParseError.ContinueOutsideLoop;
        }
        return self.tree.createNode(
            .continue_stmt,
            .{ .continue_stmt = {} },
            self.previous,
        ) catch ParseError.OutOfMemory;
    }

    fn assignStatement(self: *Self) ParseError!*Node {
        // IDENT = expr
        const name = self.current.lexeme;
        if (!self.match(.identifier)) {
            return ParseError.ExpectedIdentifier;
        }

        if (!self.match(.equal)) {
            return ParseError.UnexpectedToken;
        }

        const value = try self.expression();

        return self.tree.createNode(
            .assign_stmt,
            .{ .assign_stmt = .{ .name = name, .value = value } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn block(self: *Self) ParseError!*Node {
        if (!self.match(.left_brace)) {
            return ParseError.ExpectedClosingBrace;
        }

        var statements = std.ArrayList(*Node).init(self.tree.allocator);
        errdefer statements.deinit();

        while (!self.check(.right_brace) and !self.isAtEnd()) {
            const stmt = try self.statement();
            statements.append(stmt) catch return ParseError.OutOfMemory;
        }

        if (!self.match(.right_brace)) {
            return ParseError.ExpectedClosingBrace;
        }

        return self.tree.createNode(
            .block,
            .{ .block = .{ .statements = statements } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn expression(self: *Self) ParseError!*Node {
        return self.equality();
    }

    fn equality(self: *Self) ParseError!*Node {
        var left = try self.comparison();

        while (self.match(.equal_equal)) {
            const operator = self.previous;
            const right = try self.comparison();
            left = self.tree.createNode(
                .binary,
                .{ .binary = .{ .left = left, .operator = operator, .right = right } },
                null,
            ) catch return ParseError.OutOfMemory;
        }

        return left;
    }

    fn comparison(self: *Self) ParseError!*Node {
        var left = try self.term();

        // 比較演算は1回のみ許可（連鎖比較は非許可）
        if (self.match(.less) or self.match(.greater)) {
            const operator = self.previous;
            const right = try self.term();
            left = self.tree.createNode(
                .binary,
                .{ .binary = .{ .left = left, .operator = operator, .right = right } },
                null,
            ) catch return ParseError.OutOfMemory;
        }

        return left;
    }

    fn term(self: *Self) ParseError!*Node {
        var left = try self.factor();

        while (self.match(.plus) or self.match(.minus)) {
            const operator = self.previous;
            const right = try self.factor();
            left = self.tree.createNode(
                .binary,
                .{ .binary = .{ .left = left, .operator = operator, .right = right } },
                null,
            ) catch return ParseError.OutOfMemory;
        }

        return left;
    }

    fn factor(self: *Self) ParseError!*Node {
        var left = try self.primary();

        while (self.match(.star) or self.match(.slash)) {
            const operator = self.previous;
            const right = try self.primary();
            left = self.tree.createNode(
                .binary,
                .{ .binary = .{ .left = left, .operator = operator, .right = right } },
                null,
            ) catch return ParseError.OutOfMemory;
        }

        return left;
    }

    fn primary(self: *Self) ParseError!*Node {
        if (self.match(.number)) {
            // YKWはu16整数のみ
            const value = std.fmt.parseInt(u16, self.previous.lexeme, 10) catch return ParseError.InvalidNumber;
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .number = value } } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.identifier)) {
            return self.tree.createNode(
                .identifier,
                .{ .identifier = .{ .name = self.previous.lexeme } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.left_paren)) {
            const expr = try self.expression();
            if (!self.match(.right_paren)) {
                return ParseError.ExpectedClosingParen;
            }
            return self.tree.createNode(
                .grouping,
                .{ .grouping = .{ .expression = expr } },
                null,
            ) catch ParseError.OutOfMemory;
        }

        return ParseError.ExpectedExpression;
    }

    fn match(self: *Self, token_type: TokenType) bool {
        if (self.check(token_type)) {
            self.advance();
            return true;
        }
        return false;
    }

    fn check(self: *Self, token_type: TokenType) bool {
        return self.current.type == token_type;
    }

    fn advance(self: *Self) void {
        self.previous = self.current;
        self.current = self.lex.nextToken();
    }

    fn isAtEnd(self: *Self) bool {
        return self.current.type == .eof;
    }

    fn synchronize(self: *Self) void {
        self.advance();

        while (!self.isAtEnd()) {
            switch (self.current.type) {
                .kw_if, .kw_while, .kw_print, .kw_break, .kw_continue => return,
                else => {},
            }

            self.advance();
        }
    }
};

test "parser simple expression" {
    var lex = Lexer.init("x = 42");
    var parser = Parser.initWithLexer(&lex, std.testing.allocator);
    defer parser.deinit();

    const result = parser.parse();
    try std.testing.expect(result != error.ExpectedExpression);
}

test "parser preserves all mata branches and final hoka" {
    var lex = Lexer.init("moshi(0){naku(10)} mata(1){naku(20)} mata(2){naku(30)} hoka{naku(40)}");
    var p = Parser.initWithLexer(&lex, std.testing.allocator);
    defer p.deinit();
    const root = try p.parse();
    const initial = root.data.program.statements.items[0];
    const first = initial.data.if_stmt.else_branch.?;
    const second = first.data.if_stmt.else_branch.?;
    const fallback = second.data.if_stmt.else_branch.?;
    try std.testing.expectEqual(@as(u16, 1), first.data.if_stmt.condition.data.literal.value.number);
    try std.testing.expectEqual(@as(u16, 2), second.data.if_stmt.condition.data.literal.value.number);
    try std.testing.expectEqual(NodeType.block, fallback.node_type);
    try std.testing.expectEqual(@as(usize, 1), fallback.data.block.statements.items.len);
}

test "parser preserves mata chain without hoka" {
    var lex = Lexer.init("moshi(0){} mata(0){} mata(1){}");
    var p = Parser.initWithLexer(&lex, std.testing.allocator);
    defer p.deinit();
    const root = try p.parse();
    const initial = root.data.program.statements.items[0];
    const last = initial.data.if_stmt.else_branch.?.data.if_stmt.else_branch.?;
    try std.testing.expectEqual(@as(u16, 1), last.data.if_stmt.condition.data.literal.value.number);
    try std.testing.expect(last.data.if_stmt.else_branch == null);
}

test "parser rejects invalid input without swallowing errors" {
    const cases = .{
        .{ "naku(", ParseError.ExpectedExpression },
        .{ "naku(1", ParseError.ExpectedClosingParen },
        .{ "moshi(1){naku(2)", ParseError.ExpectedClosingBrace },
        .{ "tobu", ParseError.BreakOutsideLoop },
        .{ "hashiru", ParseError.ContinueOutsideLoop },
        .{ "naku(65536)", ParseError.InvalidNumber },
        .{ "naku(1.5)", ParseError.InvalidNumber },
    };
    inline for (cases) |case| {
        var lex = Lexer.init(case[0]);
        var p = Parser.initWithLexer(&lex, std.testing.allocator);
        defer p.deinit();
        try std.testing.expectError(case[1], p.parse());
    }
}
