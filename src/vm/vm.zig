const std = @import("std");

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

pub const VMError = error{
    InvalidMagic,
    DivisionByZero,
    StackOverflow,
    StackUnderflow,
    InvalidOpcode,
    InvalidAddress,
};

/// OkinawaRail VM (OKR1 v0.1)
pub const VM = struct {
    code: []const u8,
    ip: usize,
    stack: [STACK_SIZE]u16,
    sp: usize,
    vars: [MAX_VARS]u16,
    output_writer: ?std.fs.File.Writer,

    const STACK_SIZE = 256;
    const MAX_VARS = 32;
    const Self = @This();

    pub fn init() Self {
        return Self{
            .code = &[_]u8{},
            .ip = 0,
            .stack = [_]u16{0} ** STACK_SIZE,
            .sp = 0,
            .vars = [_]u16{0} ** MAX_VARS,
            .output_writer = null,
        };
    }

    pub fn setOutputWriter(self: *Self, writer: std.fs.File.Writer) void {
        self.output_writer = writer;
    }

    /// .🦅 ファイルを読み込んで実行
    pub fn loadAndRun(self: *Self, data: []const u8) VMError!void {
        // マジックチェック
        if (data.len < 6) return VMError.InvalidMagic;
        if (!std.mem.eql(u8, data[0..4], "OKR1")) {
            return VMError.InvalidMagic;
        }

        // コードサイズ取得 (little-endian)
        const code_size: u16 = @as(u16, data[4]) | (@as(u16, data[5]) << 8);
        _ = code_size;

        // バイトコード部分を設定
        self.code = data[6..];
        self.ip = 0;

        // 実行
        try self.run();
    }

    /// バイトコードを直接実行
    pub fn execute(self: *Self, code: []const u8) VMError!void {
        self.code = code;
        self.ip = 0;
        try self.run();
    }

    fn run(self: *Self) VMError!void {
        while (self.ip < self.code.len) {
            const opcode_byte = self.code[self.ip];
            self.ip += 1;

            // 未知のopcodeをチェック
            const op: OpCode = std.meta.intToEnum(OpCode, opcode_byte) catch {
                return VMError.InvalidOpcode;
            };

            switch (op) {
                .PUSH8 => {
                    const val = self.readByte();
                    try self.push(val);
                },
                .PUSH16 => {
                    const val = self.readU16();
                    try self.push(val);
                },
                .ADD => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(a +% b); // ラップアラウンド
                },
                .SUB => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(a -% b);
                },
                .MUL => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(a *% b);
                },
                .DIV => {
                    const b = try self.pop();
                    const a = try self.pop();
                    if (b == 0) {
                        self.printError("Error: Division by zero\n");
                        return VMError.DivisionByZero;
                    }
                    try self.push(a / b);
                },
                .LOAD => {
                    const slot = self.readByte();
                    if (slot >= MAX_VARS) return VMError.InvalidAddress;
                    try self.push(self.vars[slot]);
                },
                .STORE => {
                    const slot = self.readByte();
                    if (slot >= MAX_VARS) return VMError.InvalidAddress;
                    const val = try self.pop();
                    self.vars[slot] = val;
                },
                .LT => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(if (a < b) 1 else 0);
                },
                .GT => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(if (a > b) 1 else 0);
                },
                .EQ => {
                    const b = try self.pop();
                    const a = try self.pop();
                    try self.push(if (a == b) 1 else 0);
                },
                .JMP => {
                    const addr = self.readU16();
                    self.ip = addr;
                },
                .JZ => {
                    const addr = self.readU16();
                    const val = try self.pop();
                    if (val == 0) {
                        self.ip = addr;
                    }
                },
                .PRINTU => {
                    const val = try self.pop();
                    self.printValue(val);
                },
                .HALT => {
                    return;
                },
            }
        }
    }

    fn readByte(self: *Self) u8 {
        const val = self.code[self.ip];
        self.ip += 1;
        return val;
    }

    fn readU16(self: *Self) u16 {
        const low: u16 = self.code[self.ip];
        const high: u16 = self.code[self.ip + 1];
        self.ip += 2;
        return low | (high << 8);
    }

    fn push(self: *Self, val: u16) VMError!void {
        if (self.sp >= STACK_SIZE) {
            return VMError.StackOverflow;
        }
        self.stack[self.sp] = val;
        self.sp += 1;
    }

    fn pop(self: *Self) VMError!u16 {
        if (self.sp == 0) {
            return VMError.StackUnderflow;
        }
        self.sp -= 1;
        return self.stack[self.sp];
    }

    fn printValue(self: *Self, val: u16) void {
        if (self.output_writer) |writer| {
            writer.print("{d}\n", .{val}) catch {};
        } else {
            const stdout = std.io.getStdOut().writer();
            stdout.print("{d}\n", .{val}) catch {};
        }
    }

    fn printError(self: *Self, msg: []const u8) void {
        _ = self;
        const stderr = std.io.getStdErr().writer();
        stderr.writeAll(msg) catch {};
    }
};

test "vm simple arithmetic" {
    var vm = VM.init();

    // Assert the result without printing into Zig's test-runner protocol.
    const code = [_]u8{
        @intFromEnum(OpCode.PUSH8), 1,
        @intFromEnum(OpCode.PUSH8), 2,
        @intFromEnum(OpCode.ADD),   @intFromEnum(OpCode.STORE),
        0,                          @intFromEnum(OpCode.HALT),
    };

    try vm.execute(&code);
    try std.testing.expectEqual(@as(u16, 3), vm.vars[0]);
}

test "vm variable" {
    var vm = VM.init();

    // x = 42; y = x
    const code = [_]u8{
        @intFromEnum(OpCode.PUSH8),
        42,
        @intFromEnum(OpCode.STORE),
        0, // slot 0
        @intFromEnum(OpCode.LOAD),
        0,
        @intFromEnum(OpCode.STORE),
        1,
        @intFromEnum(OpCode.HALT),
    };

    try vm.execute(&code);
    try std.testing.expectEqual(@as(u16, 42), vm.vars[0]);
    try std.testing.expectEqual(@as(u16, 42), vm.vars[1]);
}

test "vm loop" {
    var vm = VM.init();

    // i = 0; aruku(i < 3) { i = i + 1 }
    // 最終的に i = 3
    const code = [_]u8{
        // i = 0
        @intFromEnum(OpCode.PUSH8), 0,
        @intFromEnum(OpCode.STORE),
        0,
        // loop start (addr 4)
        @intFromEnum(OpCode.LOAD),  0, // i
        @intFromEnum(OpCode.PUSH8), 3,
        @intFromEnum(OpCode.LT), // i < 3
        @intFromEnum(OpCode.JZ),   22,                        0, // jump to end if false
        // i = i + 1
        @intFromEnum(OpCode.LOAD), 0,                         @intFromEnum(OpCode.PUSH8),
        1,                         @intFromEnum(OpCode.ADD),  @intFromEnum(OpCode.STORE),
        0,
        // jump back to loop start
                                @intFromEnum(OpCode.JMP),  4,
        0,
        // end (addr 22)
                                @intFromEnum(OpCode.HALT),
    };

    try vm.execute(&code);
    try std.testing.expectEqual(@as(u16, 3), vm.vars[0]);
}
