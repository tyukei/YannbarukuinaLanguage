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
    ExpectedSemicolon,
    ExpectedClosingParen,
    ExpectedClosingBrace,
    OutOfMemory,
};

pub const Parser = struct {
    lex: *Lexer,
    current: Token,
    previous: Token,
    tree: Ast,
    had_error: bool,
    error_message: ?[]const u8,

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
        };
    }

    pub fn deinit(self: *Self) void {
        self.tree.deinit();
    }

    pub fn parse(self: *Self) ParseError!*Node {
        var statements = std.ArrayList(*Node).init(self.tree.allocator);

        while (!self.isAtEnd()) {
            if (self.declaration()) |stmt| {
                statements.append(stmt) catch return ParseError.OutOfMemory;
            } else |_| {
                self.synchronize();
            }
        }

        return self.tree.createNode(
            .program,
            .{ .program = .{ .statements = statements } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn declaration(self: *Self) ParseError!*Node {
        if (self.match(.kw_let)) {
            return self.varDeclaration();
        }
        if (self.match(.kw_const)) {
            return self.constDeclaration();
        }
        if (self.match(.kw_fn)) {
            return self.functionDeclaration();
        }
        return self.statement();
    }

    fn varDeclaration(self: *Self) ParseError!*Node {
        const name = self.current.lexeme;
        if (!self.match(.identifier)) {
            return ParseError.ExpectedIdentifier;
        }

        var initializer: ?*Node = null;
        if (self.match(.equal)) {
            initializer = try self.expression();
        }

        if (!self.match(.semicolon)) {
            return ParseError.ExpectedSemicolon;
        }

        return self.tree.createNode(
            .var_decl,
            .{ .var_decl = .{ .name = name, .initializer = initializer } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn constDeclaration(self: *Self) ParseError!*Node {
        const name = self.current.lexeme;
        if (!self.match(.identifier)) {
            return ParseError.ExpectedIdentifier;
        }

        if (!self.match(.equal)) {
            return ParseError.UnexpectedToken;
        }

        const initializer = try self.expression();

        if (!self.match(.semicolon)) {
            return ParseError.ExpectedSemicolon;
        }

        return self.tree.createNode(
            .const_decl,
            .{ .const_decl = .{ .name = name, .initializer = initializer } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn functionDeclaration(self: *Self) ParseError!*Node {
        const name = self.current.lexeme;
        if (!self.match(.identifier)) {
            return ParseError.ExpectedIdentifier;
        }

        if (!self.match(.left_paren)) {
            return ParseError.UnexpectedToken;
        }

        var parameters = std.ArrayList([]const u8).init(self.tree.allocator);
        if (!self.check(.right_paren)) {
            while (true) {
                const param_name = self.current.lexeme;
                if (!self.match(.identifier)) {
                    return ParseError.ExpectedIdentifier;
                }
                parameters.append(param_name) catch return ParseError.OutOfMemory;

                if (!self.match(.comma)) break;
            }
        }

        if (!self.match(.right_paren)) {
            return ParseError.ExpectedClosingParen;
        }

        const body = try self.block();

        return self.tree.createNode(
            .function_decl,
            .{ .function_decl = .{ .name = name, .parameters = parameters, .body = body } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn statement(self: *Self) ParseError!*Node {
        if (self.match(.kw_print)) {
            return self.printStatement();
        }
        if (self.match(.kw_if)) {
            return self.ifStatement();
        }
        if (self.match(.kw_while)) {
            return self.whileStatement();
        }
        if (self.match(.kw_for)) {
            return self.forStatement();
        }
        if (self.match(.kw_return)) {
            return self.returnStatement();
        }
        if (self.match(.left_brace)) {
            return self.block();
        }
        return self.expressionStatement();
    }

    fn printStatement(self: *Self) ParseError!*Node {
        const value = try self.expression();
        if (!self.match(.semicolon)) {
            return ParseError.ExpectedSemicolon;
        }
        return self.tree.createNode(
            .print_stmt,
            .{ .print_stmt = .{ .expression = value } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn ifStatement(self: *Self) ParseError!*Node {
        const condition = try self.expression();
        const then_branch = try self.block();

        var else_branch: ?*Node = null;
        if (self.match(.kw_else)) {
            else_branch = try self.block();
        }

        return self.tree.createNode(
            .if_stmt,
            .{ .if_stmt = .{ .condition = condition, .then_branch = then_branch, .else_branch = else_branch } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn whileStatement(self: *Self) ParseError!*Node {
        const condition = try self.expression();
        const body = try self.block();

        return self.tree.createNode(
            .while_stmt,
            .{ .while_stmt = .{ .condition = condition, .body = body } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn forStatement(self: *Self) ParseError!*Node {
        const variable = self.current.lexeme;
        if (!self.match(.identifier)) {
            return ParseError.ExpectedIdentifier;
        }

        if (!self.match(.colon)) {
            return ParseError.UnexpectedToken;
        }

        const iterable = try self.expression();
        const body = try self.block();

        return self.tree.createNode(
            .for_stmt,
            .{ .for_stmt = .{ .variable = variable, .iterable = iterable, .body = body } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn returnStatement(self: *Self) ParseError!*Node {
        var value: ?*Node = null;
        if (!self.check(.semicolon)) {
            value = try self.expression();
        }

        if (!self.match(.semicolon)) {
            return ParseError.ExpectedSemicolon;
        }

        return self.tree.createNode(
            .return_stmt,
            .{ .return_stmt = .{ .value = value } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn block(self: *Self) ParseError!*Node {
        if (!self.check(.left_brace) and self.previous.type != .left_brace) {
            if (!self.match(.left_brace)) {
                return ParseError.UnexpectedToken;
            }
        }

        var statements = std.ArrayList(*Node).init(self.tree.allocator);

        while (!self.check(.right_brace) and !self.isAtEnd()) {
            if (self.declaration()) |stmt| {
                statements.append(stmt) catch return ParseError.OutOfMemory;
            } else |_| {
                self.synchronize();
            }
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

    fn expressionStatement(self: *Self) ParseError!*Node {
        const expr = try self.expression();
        if (!self.match(.semicolon)) {
            return ParseError.ExpectedSemicolon;
        }
        return self.tree.createNode(
            .expression_stmt,
            .{ .expression_stmt = .{ .expression = expr } },
            null,
        ) catch ParseError.OutOfMemory;
    }

    fn expression(self: *Self) ParseError!*Node {
        return self.equality();
    }

    fn equality(self: *Self) ParseError!*Node {
        var left = try self.comparison();

        while (self.match(.equal_equal) or self.match(.bang_equal)) {
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

        while (self.match(.less) or self.match(.less_equal) or self.match(.greater) or self.match(.greater_equal)) {
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
        var left = try self.unary();

        while (self.match(.star) or self.match(.slash) or self.match(.percent)) {
            const operator = self.previous;
            const right = try self.unary();
            left = self.tree.createNode(
                .binary,
                .{ .binary = .{ .left = left, .operator = operator, .right = right } },
                null,
            ) catch return ParseError.OutOfMemory;
        }

        return left;
    }

    fn unary(self: *Self) ParseError!*Node {
        if (self.match(.bang) or self.match(.minus)) {
            const operator = self.previous;
            const operand = try self.unary();
            return self.tree.createNode(
                .unary,
                .{ .unary = .{ .operator = operator, .operand = operand } },
                null,
            ) catch ParseError.OutOfMemory;
        }

        return self.call();
    }

    fn call(self: *Self) ParseError!*Node {
        var expr = try self.primary();

        while (true) {
            if (self.match(.left_paren)) {
                var arguments = std.ArrayList(*Node).init(self.tree.allocator);

                if (!self.check(.right_paren)) {
                    while (true) {
                        const arg = try self.expression();
                        arguments.append(arg) catch return ParseError.OutOfMemory;
                        if (!self.match(.comma)) break;
                    }
                }

                if (!self.match(.right_paren)) {
                    return ParseError.ExpectedClosingParen;
                }

                expr = self.tree.createNode(
                    .call,
                    .{ .call = .{ .callee = expr, .arguments = arguments } },
                    null,
                ) catch return ParseError.OutOfMemory;
            } else {
                break;
            }
        }

        return expr;
    }

    fn primary(self: *Self) ParseError!*Node {
        if (self.match(.number)) {
            const value = std.fmt.parseFloat(f64, self.previous.lexeme) catch 0.0;
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .number = value } } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.string)) {
            const lexeme = self.previous.lexeme;
            const str = if (lexeme.len >= 2) lexeme[1 .. lexeme.len - 1] else lexeme;
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .string = str } } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.kw_true)) {
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .boolean = true } } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.kw_false)) {
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .boolean = false } } },
                self.previous,
            ) catch ParseError.OutOfMemory;
        }

        if (self.match(.kw_null)) {
            return self.tree.createNode(
                .literal,
                .{ .literal = .{ .value = .{ .null_val = {} } } },
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
            if (self.previous.type == .semicolon) return;

            switch (self.current.type) {
                .kw_fn, .kw_let, .kw_const, .kw_for, .kw_if, .kw_while, .kw_print, .kw_return => return,
                else => {},
            }

            self.advance();
        }
    }
};

test "parser simple expression" {
    var lex = Lexer.init("42;");
    var parser = Parser.initWithLexer(&lex, std.testing.allocator);
    defer parser.deinit();

    const result = parser.parse();
    try std.testing.expect(result != error.ExpectedExpression);
}
