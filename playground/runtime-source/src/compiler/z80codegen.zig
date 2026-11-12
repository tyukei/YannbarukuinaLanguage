const std = @import("std");
const ast = @import("ast.zig");
const lexer = @import("lexer.zig");
const Node = ast.Node;
const NodeType = ast.NodeType;
const TokenType = lexer.TokenType;

/// Z80 Code Generator for CP/M target
pub const Z80CodeGen = struct {
    output: std.ArrayList(u8),
    variables: std.StringHashMap(u8),
    next_slot: u8,
    label_counter: u32,
    allocator: std.mem.Allocator,

    // ループのジャンプ先管理（break/continue用）
    loop_start_labels: std.ArrayList([]const u8),
    loop_end_labels: std.ArrayList([]const u8),

    const Self = @This();
    const MAX_VARIABLES = 32;

    // CP/M constants
    const BDOS = 0x0005;
    const VAR_BASE = 0x8000;
    const STK_BASE = 0x7F00;

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .output = std.ArrayList(u8).init(allocator),
            .variables = std.StringHashMap(u8).init(allocator),
            .next_slot = 0,
            .label_counter = 0,
            .allocator = allocator,
            .loop_start_labels = std.ArrayList([]const u8).init(allocator),
            .loop_end_labels = std.ArrayList([]const u8).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.output.deinit();
        // コピーした変数名を解放
        var it = self.variables.keyIterator();
        while (it.next()) |key| {
            self.allocator.free(key.*);
        }
        self.variables.deinit();

        // ラベル文字列を解放
        for (self.loop_start_labels.items) |label| {
            self.allocator.free(label);
        }
        self.loop_start_labels.deinit();
        for (self.loop_end_labels.items) |label| {
            self.allocator.free(label);
        }
        self.loop_end_labels.deinit();
    }

    /// ASTからZ80アセンブリを生成
    pub fn generate(self: *Self, root: *Node) !void {
        try self.emitPrologue();
        try self.compileNode(root);
        try self.emitEpilogue();
    }

    /// 生成されたアセンブリテキストを取得
    pub fn getOutput(self: *Self) []u8 {
        return self.output.items;
    }

    fn emitPrologue(self: *Self) !void {
        try self.emit("; YanbaruKwina Z80 Compiler Output\n");
        try self.emit("; Target: CP/M (.COM)\n");
        try self.emit("\n");
        try self.emit("        ORG     0100h\n");
        try self.emit("\n");
        try self.emit("; Constants\n");
        try self.emitFmt("BDOS    EQU     {X:0>4}h\n", .{BDOS});
        try self.emitFmt("VAR_BASE EQU    {X:0>4}h\n", .{VAR_BASE});
        try self.emitFmt("STK_BASE EQU    {X:0>4}h\n", .{STK_BASE});
        try self.emit("\n");
        try self.emit("; Program entry\n");
        try self.emit("_START:\n");
        try self.emit("        LD      IX, STK_BASE    ; Initialize software stack\n");
        try self.emit("        LD      HL, VAR_BASE    ; Zero all global variable slots\n");
        try self.emit("        LD      (HL), 0\n");
        try self.emit("        LD      DE, VAR_BASE + 1\n");
        try self.emitFmt("        LD      BC, {d}\n", .{MAX_VARIABLES * 2 - 1});
        try self.emit("        LDIR\n");
        try self.emit("\n");
        try self.emit("; === Generated Code ===\n");
    }

    fn emitEpilogue(self: *Self) !void {
        try self.emit("\n");
        try self.emit("; Program exit\n");
        try self.emit("        JP      0               ; Return to CP/M\n");
        try self.emit("\n");
        try self.emitRuntimeLibrary();
        try self.emit("\n");
        try self.emit("        END     _START\n");
    }

    fn emitRuntimeLibrary(self: *Self) !void {
        try self.emit("; === Runtime Library ===\n");
        try self.emit("\n");

        // 16-bit multiplication
        try self.emit("; 16-bit multiply: HL = HL * DE\n");
        try self.emit("_MUL16:\n");
        try self.emit("        PUSH    BC\n");
        try self.emit("        LD      B, 16\n");
        try self.emit("        LD      A, L\n");
        try self.emit("        LD      C, H\n");
        try self.emit("        LD      HL, 0\n");
        try self.emit("_MUL16_LOOP:\n");
        try self.emit("        SRL     C\n");
        try self.emit("        RRA\n");
        try self.emit("        JR      NC, _MUL16_SKIP\n");
        try self.emit("        ADD     HL, DE\n");
        try self.emit("_MUL16_SKIP:\n");
        try self.emit("        SLA     E\n");
        try self.emit("        RL      D\n");
        try self.emit("        DJNZ    _MUL16_LOOP\n");
        try self.emit("        POP     BC\n");
        try self.emit("        RET\n");
        try self.emit("\n");

        // 16-bit division
        try self.emit("; 16-bit divide: HL = HL / DE, remainder in BC\n");
        try self.emit("_DIV16:\n");
        try self.emit("        PUSH    AF\n");
        try self.emit("        LD      A, D\n");
        try self.emit("        OR      E\n");
        try self.emit("        JR      Z, _DIV_ZERO\n");
        try self.emit("        LD      B, 16\n");
        try self.emit("        LD      A, H\n");
        try self.emit("        LD      C, L\n");
        try self.emit("        LD      HL, 0\n");
        try self.emit("_DIV16_LOOP:\n");
        try self.emit("        SLA     C\n");
        try self.emit("        RL      A\n");
        try self.emit("        ADC     HL, HL\n");
        try self.emit("        SBC     HL, DE\n");
        try self.emit("        JR      NC, _DIV16_BIT\n");
        try self.emit("        ADD     HL, DE\n");
        try self.emit("        JR      _DIV16_NEXT\n");
        try self.emit("_DIV16_BIT:\n");
        try self.emit("        INC     C\n");
        try self.emit("_DIV16_NEXT:\n");
        try self.emit("        DJNZ    _DIV16_LOOP\n");
        try self.emit("        PUSH    HL                ; Save the complete remainder\n");
        try self.emit("        LD      H, A\n");
        try self.emit("        LD      L, C              ; Quotient in HL\n");
        try self.emit("        POP     BC                ; Remainder in BC\n");
        try self.emit("        POP     AF\n");
        try self.emit("        RET\n");
        try self.emit("\n");

        // Division by zero handler
        try self.emit("_DIV_ZERO:\n");
        try self.emit("        LD      DE, _DIV_MSG\n");
        try self.emit("        LD      C, 9              ; BDOS print string\n");
        try self.emit("        CALL    BDOS\n");
        try self.emit("        JP      0\n");
        try self.emit("_DIV_MSG:\n");
        try self.emit("        DB      'Error: Division by zero', 13, 10, '$'\n");
        try self.emit("\n");

        // Print unsigned 16-bit number
        try self.emit("; Print unsigned 16-bit number in HL\n");
        try self.emit("_PRINT_U16:\n");
        try self.emit("        PUSH    BC\n");
        try self.emit("        PUSH    DE\n");
        try self.emit("        PUSH    HL\n");
        try self.emit("        LD      DE, _NUM_BUF + 5\n");
        try self.emit("        XOR     A\n");
        try self.emit("        LD      (DE), A           ; Null terminator\n");
        try self.emit("_P16_LOOP:\n");
        try self.emit("        DEC     DE\n");
        try self.emit("        LD      BC, 10\n");
        try self.emit("        CALL    _DIV_HL_BC\n");
        try self.emit("        ADD     A, '0'\n");
        try self.emit("        LD      (DE), A\n");
        try self.emit("        LD      A, H\n");
        try self.emit("        OR      L\n");
        try self.emit("        JR      NZ, _P16_LOOP\n");
        try self.emit("_P16_PRINT:\n");
        try self.emit("        LD      A, (DE)\n");
        try self.emit("        OR      A\n");
        try self.emit("        JR      Z, _P16_NEWLINE\n");
        try self.emit("        PUSH    DE\n");
        try self.emit("        LD      E, A\n");
        try self.emit("        LD      C, 2              ; BDOS console output\n");
        try self.emit("        CALL    BDOS\n");
        try self.emit("        POP     DE\n");
        try self.emit("        INC     DE\n");
        try self.emit("        JR      _P16_PRINT\n");
        try self.emit("_P16_NEWLINE:\n");
        try self.emit("        LD      E, 13\n");
        try self.emit("        LD      C, 2\n");
        try self.emit("        CALL    BDOS\n");
        try self.emit("        LD      E, 10\n");
        try self.emit("        LD      C, 2\n");
        try self.emit("        CALL    BDOS\n");
        try self.emit("        POP     HL\n");
        try self.emit("        POP     DE\n");
        try self.emit("        POP     BC\n");
        try self.emit("        RET\n");
        try self.emit("\n");

        // Helper: HL / BC, quotient in HL, remainder in A
        try self.emit("; HL = HL / BC, A = remainder\n");
        try self.emit("_DIV_HL_BC:\n");
        try self.emit("        PUSH    DE\n");
        try self.emit("        LD      D, B\n");
        try self.emit("        LD      E, C\n");
        try self.emit("        CALL    _DIV16\n");
        try self.emit("        LD      A, C              ; Remainder low byte\n");
        try self.emit("        POP     DE\n");
        try self.emit("        RET\n");
        try self.emit("\n");

        // Number buffer
        try self.emit("_NUM_BUF:\n");
        try self.emit("        DS      6                 ; Buffer for digits\n");
    }

    fn compileNode(self: *Self, node: *Node) anyerror!void {
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

    fn compileProgram(self: *Self, node: *Node) anyerror!void {
        const statements = node.data.program.statements;
        for (statements.items) |stmt| {
            try self.compileNode(stmt);
        }
    }

    fn compileBlock(self: *Self, node: *Node) anyerror!void {
        const statements = node.data.block.statements;
        for (statements.items) |stmt| {
            try self.compileNode(stmt);
        }
    }

    fn compileAssign(self: *Self, node: *Node) anyerror!void {
        const data = node.data.assign_stmt;

        try self.emitFmt("; {s} = ...\n", .{data.name});

        // 値をスタックにプッシュ
        try self.compileNode(data.value);

        // スタックからポップしてHLへ
        try self.emitStackPop();

        // 変数スロットを取得または割り当て
        const slot = try self.getOrCreateSlot(data.name);

        // 変数に保存
        try self.emitFmt("        LD      (VAR_BASE + {d}), HL\n", .{@as(u16, slot) * 2});
    }

    fn compilePrint(self: *Self, node: *Node) anyerror!void {
        const data = node.data.print_stmt;

        try self.emit("; naku(...)\n");

        // 式をスタックにプッシュ
        try self.compileNode(data.expression);

        // スタックからポップしてHLへ
        try self.emitStackPop();

        // 出力
        try self.emit("        CALL    _PRINT_U16\n");
    }

    fn compileIf(self: *Self, node: *Node) anyerror!void {
        const data = node.data.if_stmt;

        const else_label = try self.newLabel();
        const end_label = try self.newLabel();

        try self.emit("; moshi (...)\n");

        // 条件式を評価
        try self.compileNode(data.condition);

        // スタックからポップして条件チェック
        try self.emitStackPop();
        try self.emit("        LD      A, H\n");
        try self.emit("        OR      L\n");
        try self.emitFmt("        JP      Z, {s}\n", .{else_label});

        // then ブロック
        try self.compileNode(data.then_branch);

        if (data.else_branch) |else_branch| {
            try self.emitFmt("        JP      {s}\n", .{end_label});
            try self.emitFmt("{s}:\n", .{else_label});
            try self.compileNode(else_branch);
            try self.emitFmt("{s}:\n", .{end_label});
        } else {
            try self.emitFmt("{s}:\n", .{else_label});
        }

        self.allocator.free(else_label);
        self.allocator.free(end_label);
    }

    fn compileWhile(self: *Self, node: *Node) anyerror!void {
        const data = node.data.while_stmt;

        const start_label = try self.newLabel();
        const end_label = try self.newLabel();

        // ラベルスタックにプッシュ (duplicateを保持)
        const start_label_dup = try self.allocator.dupe(u8, start_label);
        const end_label_dup = try self.allocator.dupe(u8, end_label);
        try self.loop_start_labels.append(start_label_dup);
        try self.loop_end_labels.append(end_label_dup);

        try self.emit("; aruku (...)\n");
        try self.emitFmt("{s}:\n", .{start_label});

        // 条件式を評価
        try self.compileNode(data.condition);

        // スタックからポップして条件チェック
        try self.emitStackPop();
        try self.emit("        LD      A, H\n");
        try self.emit("        OR      L\n");
        try self.emitFmt("        JP      Z, {s}\n", .{end_label});

        // ループ本体
        try self.compileNode(data.body);

        // ループ開始へ戻る
        try self.emitFmt("        JP      {s}\n", .{start_label});

        try self.emitFmt("{s}:\n", .{end_label});

        // ラベルスタックからポップして解放
        _ = self.loop_start_labels.pop();
        _ = self.loop_end_labels.pop();
        self.allocator.free(start_label_dup);
        self.allocator.free(end_label_dup);

        // 元のラベルを解放
        self.allocator.free(start_label);
        self.allocator.free(end_label);
    }

    fn compileBreak(self: *Self) anyerror!void {
        if (self.loop_end_labels.items.len > 0) {
            const label = self.loop_end_labels.items[self.loop_end_labels.items.len - 1];
            try self.emit("; tobu (break)\n");
            try self.emitFmt("        JP      {s}\n", .{label});
        }
    }

    fn compileContinue(self: *Self) anyerror!void {
        if (self.loop_start_labels.items.len > 0) {
            const label = self.loop_start_labels.items[self.loop_start_labels.items.len - 1];
            try self.emit("; hashiru (continue)\n");
            try self.emitFmt("        JP      {s}\n", .{label});
        }
    }

    fn compileBinary(self: *Self, node: *Node) anyerror!void {
        const data = node.data.binary;

        // 左辺を評価してスタックへ
        try self.compileNode(data.left);

        // 右辺を評価してスタックへ
        try self.compileNode(data.right);

        // 右辺をDEへポップ
        try self.emitStackPop();
        try self.emit("        EX      DE, HL\n");

        // 左辺をHLへポップ
        try self.emitStackPop();

        // 演算子に応じた命令を出力
        const op = data.operator.type;
        switch (op) {
            .plus => {
                try self.emit("        ADD     HL, DE\n");
            },
            .minus => {
                try self.emit("        OR      A               ; Clear carry\n");
                try self.emit("        SBC     HL, DE\n");
            },
            .star => {
                try self.emit("        CALL    _MUL16\n");
            },
            .slash => {
                try self.emit("        CALL    _DIV16\n");
            },
            .less => {
                // a < b : a - b で borrowが出れば真
                const true_label = try self.newLabel();
                const end_label = try self.newLabel();
                try self.emit("        OR      A\n");
                try self.emit("        SBC     HL, DE\n");
                try self.emitFmt("        JP      C, {s}\n", .{true_label});
                try self.emit("        LD      HL, 0\n");
                try self.emitFmt("        JP      {s}\n", .{end_label});
                try self.emitFmt("{s}:\n", .{true_label});
                try self.emit("        LD      HL, 1\n");
                try self.emitFmt("{s}:\n", .{end_label});
                self.allocator.free(true_label);
                self.allocator.free(end_label);
            },
            .greater => {
                // a > b : b - a で borrowが出れば真
                const true_label = try self.newLabel();
                const end_label = try self.newLabel();
                try self.emit("        EX      DE, HL\n");
                try self.emit("        OR      A\n");
                try self.emit("        SBC     HL, DE\n");
                try self.emitFmt("        JP      C, {s}\n", .{true_label});
                try self.emit("        LD      HL, 0\n");
                try self.emitFmt("        JP      {s}\n", .{end_label});
                try self.emitFmt("{s}:\n", .{true_label});
                try self.emit("        LD      HL, 1\n");
                try self.emitFmt("{s}:\n", .{end_label});
                self.allocator.free(true_label);
                self.allocator.free(end_label);
            },
            .equal_equal => {
                const true_label = try self.newLabel();
                const end_label = try self.newLabel();
                try self.emit("        OR      A\n");
                try self.emit("        SBC     HL, DE\n");
                try self.emitFmt("        JP      Z, {s}\n", .{true_label});
                try self.emit("        LD      HL, 0\n");
                try self.emitFmt("        JP      {s}\n", .{end_label});
                try self.emitFmt("{s}:\n", .{true_label});
                try self.emit("        LD      HL, 1\n");
                try self.emitFmt("{s}:\n", .{end_label});
                self.allocator.free(true_label);
                self.allocator.free(end_label);
            },
            else => {},
        }

        // 結果をスタックへプッシュ
        try self.emitStackPush();
    }

    fn compileLiteral(self: *Self, node: *Node) anyerror!void {
        const value = node.data.literal.value.number;
        try self.emitFmt("        LD      HL, {d}\n", .{value});
        try self.emitStackPush();
    }

    fn compileIdentifier(self: *Self, node: *Node) anyerror!void {
        const name = node.data.identifier.name;

        // Allocate on first reference, including reads before the first assignment.
        // The prologue initializes every slot, so later loop iterations read updates.
        const slot = try self.getOrCreateSlot(name);
        try self.emitFmt("        LD      HL, (VAR_BASE + {d})\n", .{@as(u16, slot) * 2});
        try self.emitStackPush();
    }

    fn compileGrouping(self: *Self, node: *Node) anyerror!void {
        try self.compileNode(node.data.grouping.expression);
    }

    // スタック操作ヘルパー

    fn emitStackPush(self: *Self) !void {
        try self.emit("        LD      (IX+0), L\n");
        try self.emit("        LD      (IX+1), H\n");
        try self.emit("        INC     IX\n");
        try self.emit("        INC     IX\n");
    }

    fn emitStackPop(self: *Self) !void {
        try self.emit("        DEC     IX\n");
        try self.emit("        DEC     IX\n");
        try self.emit("        LD      L, (IX+0)\n");
        try self.emit("        LD      H, (IX+1)\n");
    }

    // 出力ヘルパー

    fn emit(self: *Self, text: []const u8) !void {
        try self.output.appendSlice(text);
    }

    fn emitFmt(self: *Self, comptime fmt: []const u8, args: anytype) !void {
        var buf: [256]u8 = undefined;
        const slice = try std.fmt.bufPrint(&buf, fmt, args);
        try self.output.appendSlice(slice);
    }

    fn newLabel(self: *Self) ![]const u8 {
        const label = try std.fmt.allocPrint(self.allocator, "_L{d}", .{self.label_counter});
        self.label_counter += 1;
        return label;
    }

    fn getOrCreateSlot(self: *Self, name: []const u8) !u8 {
        if (self.variables.get(name)) |slot| {
            return slot;
        }

        if (self.next_slot >= MAX_VARIABLES) {
            return error.TooManyVariables;
        }

        const slot = self.next_slot;
        self.next_slot += 1;

        const name_copy = try self.allocator.dupe(u8, name);
        try self.variables.put(name_copy, slot);

        return slot;
    }
};
