"""One bounded native compilation and actual Z80 execution, isolated per request.

This is a local development demo, not an untrusted-code hosting sandbox.
The CPU emulator is kosarev/z80 (Python extension), NOT written in Queena.
Only CP/M BDOS console functions 2 and 9 are simulated; no disk/OS boot.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

MAX_SOURCE = 16_384
MAX_OUTPUT = 16_384
MAX_BINARY = 0x7000 - 0x100  # Keep generated code below software stack/variables.


class RunError(Exception):
    def __init__(self, stage: str, message: str, output: str = ""):
        super().__init__(message)
        self.stage, self.output = stage, output


def adapt_assembly(source: str) -> str:
    """Translate compiler assembler syntax only; never interpret YKW source."""
    source = re.sub(r"\b([0-9][0-9A-Fa-f]*)h\b", r"0x\1", source)
    source = re.sub(r"^(\w+)\s+EQU\s+", r"\1: EQU ", source, flags=re.M)
    source = re.sub(r"^\s*END\s+_START\s*$", "", source, flags=re.M)
    return re.sub(r"'([^']*)'", lambda m: ",".join(str(ord(c)) for c in m[1]), source)


def command(args: list[str], stage: str, directory: Path) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(args, cwd=directory, capture_output=True, timeout=5)
    except subprocess.TimeoutExpired:
        raise RunError(stage, "処理の時間制限に達しました。コードを短くして試してください。") from None
    if result.returncode:
        detail = (result.stderr + result.stdout).decode("utf-8", "replace")[:4000]
        raise RunError(stage, detail or f"処理が終了しました (exit {result.returncode})。")
    return result


def execute(binary: bytes, seconds: float = 2.0) -> dict:
    from z80 import Z80Machine

    machine = Z80Machine()
    machine.set_memory_block(0x100, binary)
    machine.pc, machine.sp = 0x100, 0xFF00
    machine.set_breakpoint(0)
    machine.set_breakpoint(5)
    output = bytearray()
    calls = 0
    deadline = time.monotonic() + seconds

    def append(value: int) -> None:
        if len(output) >= MAX_OUTPUT:
            raise RunError("execute", "出力上限 (16 KiB) に達しました。", output.decode("latin1"))
        output.append(value)

    while time.monotonic() < deadline:
        machine.ticks_to_stop = 100_000
        machine.run()
        if machine.pc == 0:
            text = output.decode("latin1")
            # Current backend emits this message and JP 0 for zero division.
            if "Division by zero" in text:
                raise RunError("execute", "ゼロ除算で停止しました。", text)
            return {"output": text, "exit": "JP 0", "bdos_calls": calls}
        if machine.pc == 5:
            calls += 1
            if machine.c == 2:
                append(machine.e)
            elif machine.c == 9:
                pointer = machine.de
                for _ in range(65536):
                    value = machine.memory[pointer]
                    pointer = (pointer + 1) & 65535
                    if value == 36:
                        break
                    append(value)
                else:
                    raise RunError("execute", "BDOS 文字列の終端が見つかりません。")
            else:
                raise RunError("execute", f"未対応の BDOS 呼び出し: {machine.c}")
            machine.pc = machine.memory[machine.sp] | machine.memory[(machine.sp + 1) & 65535] << 8
            machine.sp = (machine.sp + 2) & 65535
        elif machine.halted:
            raise RunError("execute", "Z80 が HALT で停止しました。", output.decode("latin1"))
    raise RunError("execute", "実行時間の上限 (2 秒) に達しました。ループの終了条件を確認してください。", output.decode("latin1"))


def run(source: str, compiler: Path) -> dict:
    if not isinstance(source, str) or not source.strip():
        raise RunError("input", "コードを入力してください。")
    if len(source.encode("utf-8")) > MAX_SOURCE:
        raise RunError("input", "コードは 16 KiB 以内にしてください。")
    if not compiler.is_file():
        raise RunError("setup", "コンパイラが見つかりません。README のビルド手順を実行してください。")
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="queena-run-") as directory:
        directory = Path(directory)
        input_path, asm_path = directory / "input.ykw", directory / "output.z80"
        input_path.write_text(source, encoding="utf-8")
        result = command([str(compiler), "z80", str(input_path), "-o", str(asm_path)], "compile", directory)
        # The existing CLI can report parse errors with exit 0. Require an artifact.
        if not asm_path.is_file():
            detail = result.stderr.decode("utf-8", "replace").strip()
            raise RunError("compile", detail[:4000] or "コンパイルできませんでした。")
        assembly = asm_path.read_text()
        converted, binary_path = directory / "output.asm", directory / "output.com"
        converted.write_text(adapt_assembly(assembly))
        command([sys.executable, "-m", "pyz80.pyz80", f"--obj={binary_path}", str(converted)], "assemble", directory)
        binary = binary_path.read_bytes()
        if len(binary) > MAX_BINARY:
            raise RunError("assemble", "生成コードがデモのメモリ上限を超えました。")
        result = execute(binary)
        return {"ok": True, **result, "assembly": assembly, "binary_bytes": len(binary),
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "engine": "native YKW → pyz80 → kosarev/z80 + BDOS console shim"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--compiler", type=Path, required=True)
    args = parser.parse_args()
    # Limits contain accidents. They are not a multi-tenant security sandbox.
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024,) * 2)
        resource.setrlimit(resource.RLIMIT_FSIZE, (4 * 1024 * 1024,) * 2)
    except (ImportError, ValueError, OSError):
        pass  # Process timeouts and source/output limits still apply on Windows.
    try:
        source = sys.stdin.buffer.read(MAX_SOURCE + 1).decode("utf-8")
        result = run(source, args.compiler.resolve())
    except RunError as error:
        result = {"ok": False, "stage": error.stage, "error": str(error), "output": error.output}
    except Exception as error:
        result = {"ok": False, "stage": "internal", "error": f"実行環境エラー: {type(error).__name__}: {error}", "output": ""}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
