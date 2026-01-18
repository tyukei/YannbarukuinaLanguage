const std = @import("std");

pub const OpCode = enum(u8) {
    // スタック操作
    op_constant,
    op_pop,

    // 算術演算
    op_add,
    op_subtract,
    op_multiply,
    op_divide,
    op_modulo,
    op_negate,

    // 比較演算
    op_equal,
    op_not_equal,
    op_less,
    op_less_equal,
    op_greater,
    op_greater_equal,

    // 論理演算
    op_not,

    // 変数操作
    op_get_local,
    op_set_local,
    op_get_global,
    op_set_global,

    // ジャンプ
    op_jump,
    op_jump_if_false,
    op_loop,

    // 関数
    op_call,
    op_return,

    // その他
    op_print,
    op_null,
    op_true,
    op_false,
    op_halt,
};

pub const Value = union(enum) {
    number: f64,
    boolean: bool,
    null_val: void,
    string: []const u8,
    function: *Function,

    pub fn asNumber(self: Value) ?f64 {
        return switch (self) {
            .number => |n| n,
            else => null,
        };
    }

    pub fn asBoolean(self: Value) ?bool {
        return switch (self) {
            .boolean => |b| b,
            else => null,
        };
    }

    pub fn isTruthy(self: Value) bool {
        return switch (self) {
            .null_val => false,
            .boolean => |b| b,
            else => true,
        };
    }

    pub fn format(self: Value, writer: anytype) !void {
        switch (self) {
            .number => |n| try writer.print("{d}", .{n}),
            .boolean => |b| try writer.print("{}", .{b}),
            .null_val => try writer.writeAll("無"),
            .string => |s| try writer.writeAll(s),
            .function => |f| try writer.print("<関数 {s}>", .{f.name}),
        }
    }
};

pub const Function = struct {
    name: []const u8,
    arity: u8,
    chunk: Chunk,

    pub fn init(name: []const u8, allocator: std.mem.Allocator) Function {
        return Function{
            .name = name,
            .arity = 0,
            .chunk = Chunk.init(allocator),
        };
    }

    pub fn deinit(self: *Function) void {
        self.chunk.deinit();
    }
};

pub const Chunk = struct {
    code: std.ArrayList(u8),
    constants: std.ArrayList(Value),
    lines: std.ArrayList(usize),

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .code = std.ArrayList(u8).init(allocator),
            .constants = std.ArrayList(Value).init(allocator),
            .lines = std.ArrayList(usize).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.code.deinit();
        self.constants.deinit();
        self.lines.deinit();
    }

    pub fn write(self: *Self, byte: u8, line: usize) !void {
        try self.code.append(byte);
        try self.lines.append(line);
    }

    pub fn writeOpCode(self: *Self, op: OpCode, line: usize) !void {
        try self.write(@intFromEnum(op), line);
    }

    pub fn addConstant(self: *Self, value: Value) !u8 {
        try self.constants.append(value);
        return @intCast(self.constants.items.len - 1);
    }
};

pub const CallFrame = struct {
    function: *Function,
    ip: usize,
    slots_offset: usize,
};

pub const VM = struct {
    chunk: *Chunk,
    ip: usize,
    stack: [STACK_MAX]Value,
    stack_top: usize,
    globals: std.StringHashMap(Value),
    allocator: std.mem.Allocator,
    frames: [FRAMES_MAX]CallFrame,
    frame_count: usize,
    output_writer: ?std.fs.File.Writer,

    const STACK_MAX = 256;
    const FRAMES_MAX = 64;
    const Self = @This();

    pub const InterpretError = error{
        CompileError,
        RuntimeError,
    };

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .chunk = undefined,
            .ip = 0,
            .stack = undefined,
            .stack_top = 0,
            .globals = std.StringHashMap(Value).init(allocator),
            .allocator = allocator,
            .frames = undefined,
            .frame_count = 0,
            .output_writer = null,
        };
    }

    pub fn deinit(self: *Self) void {
        self.globals.deinit();
    }

    pub fn setOutputWriter(self: *Self, writer: std.fs.File.Writer) void {
        self.output_writer = writer;
    }

    pub fn interpret(self: *Self, chunk: *Chunk) InterpretError!void {
        self.chunk = chunk;
        self.ip = 0;
        return self.run();
    }

    fn run(self: *Self) InterpretError!void {
        while (true) {
            const instruction: OpCode = @enumFromInt(self.readByte());

            switch (instruction) {
                .op_constant => {
                    const constant = self.readConstant();
                    self.push(constant);
                },
                .op_null => self.push(.{ .null_val = {} }),
                .op_true => self.push(.{ .boolean = true }),
                .op_false => self.push(.{ .boolean = false }),
                .op_pop => _ = self.pop(),
                .op_add => try self.binaryOp(.add),
                .op_subtract => try self.binaryOp(.subtract),
                .op_multiply => try self.binaryOp(.multiply),
                .op_divide => try self.binaryOp(.divide),
                .op_modulo => try self.binaryOp(.modulo),
                .op_negate => {
                    const value = self.pop();
                    if (value.asNumber()) |n| {
                        self.push(.{ .number = -n });
                    } else {
                        return InterpretError.RuntimeError;
                    }
                },
                .op_not => {
                    const value = self.pop();
                    self.push(.{ .boolean = !value.isTruthy() });
                },
                .op_equal => {
                    const b = self.pop();
                    const a = self.pop();
                    self.push(.{ .boolean = self.valuesEqual(a, b) });
                },
                .op_not_equal => {
                    const b = self.pop();
                    const a = self.pop();
                    self.push(.{ .boolean = !self.valuesEqual(a, b) });
                },
                .op_less => try self.comparisonOp(.less),
                .op_less_equal => try self.comparisonOp(.less_equal),
                .op_greater => try self.comparisonOp(.greater),
                .op_greater_equal => try self.comparisonOp(.greater_equal),
                .op_get_global => {
                    const index = self.readByte();
                    const name = self.chunk.constants.items[index].string;
                    if (self.globals.get(name)) |value| {
                        self.push(value);
                    } else {
                        return InterpretError.RuntimeError;
                    }
                },
                .op_set_global => {
                    const index = self.readByte();
                    const name = self.chunk.constants.items[index].string;
                    const value = self.peek(0);
                    self.globals.put(name, value) catch return InterpretError.RuntimeError;
                },
                .op_get_local => {
                    const slot = self.readByte();
                    self.push(self.stack[slot]);
                },
                .op_set_local => {
                    const slot = self.readByte();
                    self.stack[slot] = self.peek(0);
                },
                .op_jump => {
                    const offset = self.readShort();
                    self.ip += offset;
                },
                .op_jump_if_false => {
                    const offset = self.readShort();
                    if (!self.peek(0).isTruthy()) {
                        self.ip += offset;
                    }
                },
                .op_loop => {
                    const offset = self.readShort();
                    self.ip -= offset;
                },
                .op_print => {
                    const value = self.pop();
                    if (self.output_writer) |writer| {
                        value.format(writer) catch {};
                        writer.writeAll("\n") catch {};
                    } else {
                        const stdout = std.io.getStdOut().writer();
                        value.format(stdout) catch {};
                        stdout.writeAll("\n") catch {};
                    }
                },
                .op_call => {
                    _ = self.readByte();
                },
                .op_return => {
                    return;
                },
                .op_halt => {
                    return;
                },
            }
        }
    }

    fn readByte(self: *Self) u8 {
        const byte = self.chunk.code.items[self.ip];
        self.ip += 1;
        return byte;
    }

    fn readShort(self: *Self) u16 {
        const high: u16 = @intCast(self.chunk.code.items[self.ip]);
        const low: u16 = @intCast(self.chunk.code.items[self.ip + 1]);
        self.ip += 2;
        return (high << 8) | low;
    }

    fn readConstant(self: *Self) Value {
        const index = self.readByte();
        return self.chunk.constants.items[index];
    }

    fn push(self: *Self, value: Value) void {
        self.stack[self.stack_top] = value;
        self.stack_top += 1;
    }

    fn pop(self: *Self) Value {
        self.stack_top -= 1;
        return self.stack[self.stack_top];
    }

    fn peek(self: *Self, distance: usize) Value {
        return self.stack[self.stack_top - 1 - distance];
    }

    const BinaryOp = enum { add, subtract, multiply, divide, modulo };

    fn binaryOp(self: *Self, op: BinaryOp) InterpretError!void {
        const b = self.pop();
        const a = self.pop();

        const num_a = a.asNumber() orelse return InterpretError.RuntimeError;
        const num_b = b.asNumber() orelse return InterpretError.RuntimeError;

        const result = switch (op) {
            .add => num_a + num_b,
            .subtract => num_a - num_b,
            .multiply => num_a * num_b,
            .divide => num_a / num_b,
            .modulo => @mod(num_a, num_b),
        };

        self.push(.{ .number = result });
    }

    const ComparisonOp = enum { less, less_equal, greater, greater_equal };

    fn comparisonOp(self: *Self, op: ComparisonOp) InterpretError!void {
        const b = self.pop();
        const a = self.pop();

        const num_a = a.asNumber() orelse return InterpretError.RuntimeError;
        const num_b = b.asNumber() orelse return InterpretError.RuntimeError;

        const result = switch (op) {
            .less => num_a < num_b,
            .less_equal => num_a <= num_b,
            .greater => num_a > num_b,
            .greater_equal => num_a >= num_b,
        };

        self.push(.{ .boolean = result });
    }

    fn valuesEqual(self: *Self, a: Value, b: Value) bool {
        _ = self;
        return switch (a) {
            .number => |n| if (b.asNumber()) |m| n == m else false,
            .boolean => |x| if (b.asBoolean()) |y| x == y else false,
            .null_val => b == .null_val,
            .string => |s| switch (b) {
                .string => |t| std.mem.eql(u8, s, t),
                else => false,
            },
            .function => false,
        };
    }
};

test "vm basic arithmetic" {
    var vm = VM.init(std.testing.allocator);
    defer vm.deinit();

    var chunk = Chunk.init(std.testing.allocator);
    defer chunk.deinit();

    const idx = try chunk.addConstant(.{ .number = 42.0 });
    try chunk.writeOpCode(.op_constant, 1);
    try chunk.write(idx, 1);
    try chunk.writeOpCode(.op_halt, 1);

    try vm.interpret(&chunk);
    try std.testing.expectEqual(@as(f64, 42.0), vm.stack[0].number);
}
