const std = @import("std");
pub fn build(b: *std.Build) void {
 const target = b.resolveTargetQuery(.{.cpu_arch=.wasm32,.os_tag=.freestanding});
 const exe = b.addExecutable(.{.name="queena", .root_source_file=b.path("src/browser.zig"),.target=target,.optimize=.ReleaseSafe});
 exe.entry = .disabled; exe.rdynamic = true;
 exe.max_memory=32*1024*1024; exe.stack_size=1024*1024;
 b.installArtifact(exe);
}
