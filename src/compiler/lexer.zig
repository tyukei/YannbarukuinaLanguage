const std = @import("std");

pub const TokenType = enum {
    // リテラル
    number,
    string,
    identifier,

    // 演算子
    plus, // +
    minus, // -
    star, // *
    slash, // /
    percent, // %
    equal, // =
    equal_equal, // ==
    bang, // !
    bang_equal, // !=
    less, // <
    less_equal, // <=
    greater, // >
    greater_equal, // >=

    // 区切り文字
    left_paren, // (
    right_paren, // )
    left_brace, // {
    right_brace, // }
    left_bracket, // [
    right_bracket, // ]
    comma, // ,
    dot, // .
    colon, // :
    semicolon, // ;

    // キーワード（やんばるくいな語）
    kw_if, // もし
    kw_else, // でなければ
    kw_while, // 繰り返す
    kw_for, // 各々
    kw_fn, // 関数
    kw_return, // 返す
    kw_let, // 変数
    kw_const, // 定数
    kw_true, // 真
    kw_false, // 偽
    kw_null, // 無
    kw_print, // 表示

    // 特殊
    eof,
    invalid,
};

pub const Token = struct {
    type: TokenType,
    lexeme: []const u8,
    line: usize,
    column: usize,

    pub fn init(token_type: TokenType, lexeme: []const u8, line: usize, column: usize) Token {
        return Token{
            .type = token_type,
            .lexeme = lexeme,
            .line = line,
            .column = column,
        };
    }
};

pub const Lexer = struct {
    source: []const u8,
    current: usize,
    start: usize,
    line: usize,
    column: usize,

    const Self = @This();

    pub fn init(source: []const u8) Self {
        return Self{
            .source = source,
            .current = 0,
            .start = 0,
            .line = 1,
            .column = 1,
        };
    }

    pub fn nextToken(self: *Self) Token {
        self.skipWhitespace();
        self.start = self.current;

        if (self.isAtEnd()) {
            return self.makeToken(.eof);
        }

        const c = self.advance();

        if (isDigit(c)) return self.number();
        if (isAlpha(c)) return self.identifier();

        return switch (c) {
            '(' => self.makeToken(.left_paren),
            ')' => self.makeToken(.right_paren),
            '{' => self.makeToken(.left_brace),
            '}' => self.makeToken(.right_brace),
            '[' => self.makeToken(.left_bracket),
            ']' => self.makeToken(.right_bracket),
            ',' => self.makeToken(.comma),
            '.' => self.makeToken(.dot),
            ':' => self.makeToken(.colon),
            ';' => self.makeToken(.semicolon),
            '+' => self.makeToken(.plus),
            '-' => self.makeToken(.minus),
            '*' => self.makeToken(.star),
            '/' => self.makeToken(.slash),
            '%' => self.makeToken(.percent),
            '=' => if (self.match('=')) self.makeToken(.equal_equal) else self.makeToken(.equal),
            '!' => if (self.match('=')) self.makeToken(.bang_equal) else self.makeToken(.bang),
            '<' => if (self.match('=')) self.makeToken(.less_equal) else self.makeToken(.less),
            '>' => if (self.match('=')) self.makeToken(.greater_equal) else self.makeToken(.greater),
            '"' => self.string(),
            else => self.makeToken(.invalid),
        };
    }

    fn advance(self: *Self) u8 {
        const c = self.source[self.current];
        self.current += 1;
        self.column += 1;
        return c;
    }

    fn peek(self: *Self) u8 {
        if (self.isAtEnd()) return 0;
        return self.source[self.current];
    }

    fn match(self: *Self, expected: u8) bool {
        if (self.isAtEnd()) return false;
        if (self.source[self.current] != expected) return false;
        self.current += 1;
        self.column += 1;
        return true;
    }

    fn isAtEnd(self: *Self) bool {
        return self.current >= self.source.len;
    }

    fn makeToken(self: *Self, token_type: TokenType) Token {
        return Token.init(
            token_type,
            self.source[self.start..self.current],
            self.line,
            self.column - (self.current - self.start),
        );
    }

    fn skipWhitespace(self: *Self) void {
        while (!self.isAtEnd()) {
            const c = self.peek();
            switch (c) {
                ' ', '\r', '\t' => _ = self.advance(),
                '\n' => {
                    self.line += 1;
                    self.column = 0;
                    _ = self.advance();
                },
                '/' => {
                    if (self.current + 1 < self.source.len and self.source[self.current + 1] == '/') {
                        while (!self.isAtEnd() and self.peek() != '\n') {
                            _ = self.advance();
                        }
                    } else {
                        return;
                    }
                },
                else => return,
            }
        }
    }

    fn number(self: *Self) Token {
        while (!self.isAtEnd() and isDigit(self.peek())) {
            _ = self.advance();
        }

        if (!self.isAtEnd() and self.peek() == '.' and self.current + 1 < self.source.len and isDigit(self.source[self.current + 1])) {
            _ = self.advance();
            while (!self.isAtEnd() and isDigit(self.peek())) {
                _ = self.advance();
            }
        }

        return self.makeToken(.number);
    }

    fn string(self: *Self) Token {
        while (!self.isAtEnd() and self.peek() != '"') {
            if (self.peek() == '\n') {
                self.line += 1;
                self.column = 0;
            }
            _ = self.advance();
        }

        if (self.isAtEnd()) {
            return self.makeToken(.invalid);
        }

        _ = self.advance();
        return self.makeToken(.string);
    }

    fn identifier(self: *Self) Token {
        while (!self.isAtEnd() and (isAlpha(self.peek()) or isDigit(self.peek()))) {
            _ = self.advance();
        }

        const text = self.source[self.start..self.current];
        const token_type = self.identifierType(text);
        return self.makeToken(token_type);
    }

    fn identifierType(self: *Self, text: []const u8) TokenType {
        _ = self;
        const keywords = .{
            .{ "もし", TokenType.kw_if },
            .{ "でなければ", TokenType.kw_else },
            .{ "繰り返す", TokenType.kw_while },
            .{ "各々", TokenType.kw_for },
            .{ "関数", TokenType.kw_fn },
            .{ "返す", TokenType.kw_return },
            .{ "変数", TokenType.kw_let },
            .{ "定数", TokenType.kw_const },
            .{ "真", TokenType.kw_true },
            .{ "偽", TokenType.kw_false },
            .{ "無", TokenType.kw_null },
            .{ "表示", TokenType.kw_print },
        };

        inline for (keywords) |kw| {
            if (std.mem.eql(u8, text, kw[0])) {
                return kw[1];
            }
        }

        return .identifier;
    }
};

fn isDigit(c: u8) bool {
    return c >= '0' and c <= '9';
}

fn isAlpha(c: u8) bool {
    return (c >= 'a' and c <= 'z') or
        (c >= 'A' and c <= 'Z') or
        c == '_' or
        c >= 0x80;
}

test "lexer basic tokens" {
    var lexer = Lexer.init("123 + 456");
    const t1 = lexer.nextToken();
    try std.testing.expectEqual(TokenType.number, t1.type);
    const t2 = lexer.nextToken();
    try std.testing.expectEqual(TokenType.plus, t2.type);
    const t3 = lexer.nextToken();
    try std.testing.expectEqual(TokenType.number, t3.type);
}
