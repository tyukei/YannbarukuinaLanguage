const std = @import("std");
const ast = @import("ast.zig");
const lexer = @import("lexer.zig");
const Node = ast.Node;
const NodeType = ast.NodeType;
const TokenType = lexer.TokenType;

/// OkinawaRail VM Opcodes (OKR1 v0.1)
pub const OpCode = enum(u8) {
    PUSH8 = 0x01,
    PUSH16 = 0x02,
    ADD = 0x10,
    SUB = 0x11,
    MUL = 0x12,
    DIV = 0x13,
    LOAD = 0x20,
    STORE = 0x21,
    LT = 0x24,
    GT = 0x25,
    EQ = 0x26,
    JMP = 0x30,
    JZ = 0x31,
    PRINTU = 0x40,
    HALT = 0xFF,
};

pub const CodeGenError = error{
    TooManyVariables,
    UndefinedVariable,
    OutOfMemory,
    InvalidNode,
};

/// OKR1 バイトコード生成器
pub const CodeGen = struct {
    code: std.ArrayList(u8),
    variables: std.StringHashMap(u8),
    next_slot: u8,
    allocator: std.mem.Allocator,

    // ループのジャンプ先管理（break/continue用）
    loop_start_stack: std.ArrayList(u16),
    loop_end_patches: std.ArrayList(std.ArrayList(u16)),

    const Self = @This();
    const MAX_VARIABLES = 32;
    const MAGIC = "OKR1";

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .code = std.ArrayList(u8).init(allocator),
            .variables = std.StringHashMap(u8).init(allocator),
            .next_slot = 0,
            .allocator = allocator,
            .loop_start_stack = std.ArrayList(u16).init(allocator),
            .loop_end_patches = std.ArrayList(std.ArrayList(u16)).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.code.deinit();
        // コピーした変数名を解放
        var it = self.variables.keyIterator();
        while (it.next()) |key| {
            self.allocator.free(key.*);
        }
        self.variables.deinit();
        self.loop_start_stack.deinit();
        for (self.loop_end_patches.items) |*patches| {
            patches.deinit();
        }
        self.loop_end_patches.deinit();
    }

    /// ASTからバイトコードを生成
    pub fn generate(self: *Self, root: *Node) CodeGenError!void {
        try self.compileNode(root);
        try self.emit(.HALT);
    }

    /// .🦅 ファイル形式で出力
    pub fn toOkrFormat(self: *Self) CodeGenError![]u8 {
        const code_size: u16 = @intCast(self.code.items.len);
        const total_size = 4 + 2 + self.code.items.len; // magic + size + code

        var result = self.allocator.alloc(u8, total_size) catch return CodeGenError.OutOfMemory;

        // Magic "OKR1"
        result[0] = 'O';
        result[1] = 'K';
        result[2] = 'R';
        result[3] = '1';

        // Code size (little-endian)
        result[4] = @intCast(code_size & 0xFF);
        result[5] = @intCast((code_size >> 8) & 0xFF);

        // Bytecode
        @memcpy(result[6..], self.code.items);

        return result;
    }

    /// バイトコードのみを取得
    pub fn getCode(self: *Self) []u8 {
        return self.code.items;
    }

    fn compileNode(self: *Self, node: *Node) CodeGenError!void {
        switch (node.node_type) {
            .program => try self.compileProgram(node),
            .block => try self.compileBlock(node),
            .assign_stmt => try self.compileAssign(node),
            .print_stmt => try self.compilePrint(node),
            .if_stmt => try self.compileIf(node),
            .while_stmt => try self.compileWhile(node),
            .break_stmt => try self.compileBreak(),
            .continue_stmt => try self.compileContinue(),
            .binary => try self.compileBinary(node),
            .literal => try self.compileLiteral(node),
            .identifier => try self.compileIdentifier(node),
            .grouping => try self.compileGrouping(node),
        }
    }

    fn compileProgram(self: *Self, node: *Node) CodeGenError!void {
        const statements = node.data.program.statements;
        for (statements.items) |stmt| {
            try self.compileNode(stmt);
        }
    }

    fn compileBlock(self: *Self, node: *Node) CodeGenError!void {
        const statements = node.data.block.statements;
        for (statements.items) |stmt| {
            try self.compileNode(stmt);
        }
    }

    fn compileAssign(self: *Self, node: *Node) CodeGenError!void {
        const data = node.data.assign_stmt;

        // 値をスタックにプッシュ
        try self.compileNode(data.value);

        // 変数スロットを取得または割り当て
        const slot = try self.getOrCreateSlot(data.name);

        // STORE slot
        try self.emit(.STORE);
        try self.emitByte(slot);
    }

    fn compilePrint(self: *Self, node: *Node) CodeGenError!void {
        const data = node.data.print_stmt;

        // 式をスタックにプッシュ
        try self.compileNode(data.expression);

        // PRINTU
        try self.emit(.PRINTU);
    }

    fn compileIf(self: *Self, node: *Node) CodeGenError!void {
        const data = node.data.if_stmt;

        // 条件式を評価
        try self.compileNode(data.condition);

        // JZ (条件が偽なら else/end へジャンプ)
        try self.emit(.JZ);
        const jump_to_else = self.currentAddress();
        try self.emitU16(0); // プレースホルダー

        // then ブロック
        try self.compileNode(data.then_branch);

        if (data.else_branch) |else_branch| {
            // JMP (else をスキップ)
            try self.emit(.JMP);
            const jump_to_end = self.currentAddress();
            try self.emitU16(0); // プレースホルダー

            // else のジャンプ先をパッチ
            self.patchJump(jump_to_else, self.currentAddress());

            // else ブロック
            try self.compileNode(else_branch);

            // end のジャンプ先をパッチ
            self.patchJump(jump_to_end, self.currentAddress());
        } else {
            // else がない場合
            self.patchJump(jump_to_else, self.currentAddress());
        }
    }

    fn compileWhile(self: *Self, node: *Node) CodeGenError!void {
        const data = node.data.while_stmt;

        // ループ開始位置を記録
        const loop_start = self.currentAddress();
        try self.loop_start_stack.append(loop_start);

        // break用のパッチリストを作成
        const break_patches = std.ArrayList(u16).init(self.allocator);
        try self.loop_end_patches.append(break_patches);

        // 条件式を評価
        try self.compileNode(data.condition);

        // JZ (条件が偽ならループ終了へジャンプ)
        try self.emit(.JZ);
        const jump_to_end = self.currentAddress();
        try self.emitU16(0); // プレースホルダー

        // ループ本体
        try self.compileNode(data.body);

        // JMP (ループ開始へ戻る)
        try self.emit(.JMP);
        try self.emitU16(loop_start);

        // ループ終了位置
        const loop_end = self.currentAddress();

        // JZ のジャンプ先をパッチ
        self.patchJump(jump_to_end, loop_end);

        // break のジャンプ先をパッチ
        if (self.loop_end_patches.items.len > 0) {
            const last_idx = self.loop_end_patches.items.len - 1;
            var patches = self.loop_end_patches.items[last_idx];
            _ = self.loop_end_patches.orderedRemove(last_idx);
            for (patches.items) |patch_addr| {
                self.patchJump(patch_addr, loop_end);
            }
            patches.deinit();
        }

        _ = self.loop_start_stack.pop();
    }

    fn compileBreak(self: *Self) CodeGenError!void {
        // JMP (ループ終了へ - 後でパッチ)
        try self.emit(.JMP);
        const patch_addr = self.currentAddress();
        try self.emitU16(0); // プレースホルダー

        // パッチリストに追加
        if (self.loop_end_patches.items.len > 0) {
            var patches = &self.loop_end_patches.items[self.loop_end_patches.items.len - 1];
            try patches.append(patch_addr);
        }
    }

    fn compileContinue(self: *Self) CodeGenError!void {
        // JMP (ループ開始へ)
        try self.emit(.JMP);
        if (self.loop_start_stack.items.len > 0) {
            const loop_start = self.loop_start_stack.items[self.loop_start_stack.items.len - 1];
            try self.emitU16(loop_start);
        } else {
            try self.emitU16(0);
        }
    }

    fn compileBinary(self: *Self, node: *Node) CodeGenError!void {
        const data = node.data.binary;

        // 左辺を評価
        try self.compileNode(data.left);

        // 右辺を評価
        try self.compileNode(data.right);

        // 演算子に応じた命令を出力
        const op = data.operator.type;
        switch (op) {
            .plus => try self.emit(.ADD),
            .minus => try self.emit(.SUB),
            .star => try self.emit(.MUL),
            .slash => try self.emit(.DIV),
            .less => try self.emit(.LT),
            .greater => try self.emit(.GT),
            .equal_equal => try self.emit(.EQ),
            else => return CodeGenError.InvalidNode,
        }
    }

    fn compileLiteral(self: *Self, node: *Node) CodeGenError!void {
        const value = node.data.literal.value.number;

        if (value <= 255) {
            // PUSH8
            try self.emit(.PUSH8);
            try self.emitByte(@intCast(value));
        } else {
            // PUSH16
            try self.emit(.PUSH16);
            try self.emitU16(value);
        }
    }

    fn compileIdentifier(self: *Self, node: *Node) CodeGenError!void {
        const name = node.data.identifier.name;

        // Every global has a zero-initialized slot, even when first used in a read.
        const slot = try self.getOrCreateSlot(name);
        try self.emit(.LOAD);
        try self.emitByte(slot);
    }

    fn compileGrouping(self: *Self, node: *Node) CodeGenError!void {
        try self.compileNode(node.data.grouping.expression);
    }

    // ヘルパー関数

    fn emit(self: *Self, op: OpCode) CodeGenError!void {
        self.code.append(@intFromEnum(op)) catch return CodeGenError.OutOfMemory;
    }

    fn emitByte(self: *Self, byte: u8) CodeGenError!void {
        self.code.append(byte) catch return CodeGenError.OutOfMemory;
    }

    fn emitU16(self: *Self, value: u16) CodeGenError!void {
        // little-endian
        self.code.append(@intCast(value & 0xFF)) catch return CodeGenError.OutOfMemory;
        self.code.append(@intCast((value >> 8) & 0xFF)) catch return CodeGenError.OutOfMemory;
    }

    fn currentAddress(self: *Self) u16 {
        return @intCast(self.code.items.len);
    }

    fn patchJump(self: *Self, addr: u16, target: u16) void {
        self.code.items[addr] = @intCast(target & 0xFF);
        self.code.items[addr + 1] = @intCast((target >> 8) & 0xFF);
    }

    fn getOrCreateSlot(self: *Self, name: []const u8) CodeGenError!u8 {
        if (self.variables.get(name)) |slot| {
            return slot;
        }

        if (self.next_slot >= MAX_VARIABLES) {
            return CodeGenError.TooManyVariables;
        }

        const slot = self.next_slot;
        self.next_slot += 1;

        // 名前をコピーして保存
        const name_copy = self.allocator.dupe(u8, name) catch return CodeGenError.OutOfMemory;
        self.variables.put(name_copy, slot) catch return CodeGenError.OutOfMemory;

        return slot;
    }
};

// デバッグ用：バイトコードを人間が読める形式で出力
pub fn disassemble(code: []const u8, writer: anytype) !void {
    var i: usize = 0;
    while (i < code.len) {
        try writer.print("{d:04}: ", .{i});

        const op: OpCode = @enumFromInt(code[i]);
        i += 1;

        switch (op) {
            .PUSH8 => {
                const val = code[i];
                i += 1;
                try writer.print("PUSH8 {d}\n", .{val});
            },
            .PUSH16 => {
                const val: u16 = @as(u16, code[i]) | (@as(u16, code[i + 1]) << 8);
                i += 2;
                try writer.print("PUSH16 {d}\n", .{val});
            },
            .ADD => try writer.print("ADD\n", .{}),
            .SUB => try writer.print("SUB\n", .{}),
            .MUL => try writer.print("MUL\n", .{}),
            .DIV => try writer.print("DIV\n", .{}),
            .LOAD => {
                const slot = code[i];
                i += 1;
                try writer.print("LOAD {d}\n", .{slot});
            },
            .STORE => {
                const slot = code[i];
                i += 1;
                try writer.print("STORE {d}\n", .{slot});
            },
            .LT => try writer.print("LT\n", .{}),
            .GT => try writer.print("GT\n", .{}),
            .EQ => try writer.print("EQ\n", .{}),
            .JMP => {
                const addr: u16 = @as(u16, code[i]) | (@as(u16, code[i + 1]) << 8);
                i += 2;
                try writer.print("JMP {d}\n", .{addr});
            },
            .JZ => {
                const addr: u16 = @as(u16, code[i]) | (@as(u16, code[i + 1]) << 8);
                i += 2;
                try writer.print("JZ {d}\n", .{addr});
            },
            .PRINTU => try writer.print("PRINTU\n", .{}),
            .HALT => try writer.print("HALT\n", .{}),
        }
    }
}

test "codegen simple" {
    const allocator = std.testing.allocator;
    var codegen = CodeGen.init(allocator);
    defer codegen.deinit();

    // 手動でテスト用ASTを作成するのは複雑なので、
    // 実際のテストはparser経由で行う
}
