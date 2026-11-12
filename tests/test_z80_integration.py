"""Real Z80 CPU integration tests with a minimal CP/M console service.

Build first with `zig build`, then run with the Python environment documented
in tests/README.md. This does not boot a complete CP/M BIOS or disk image.
"""
from pathlib import Path
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unittest

from z80 import Z80Machine

ROOT = Path(__file__).resolve().parents[1]
COMPILER = Path(os.environ.get("YKW_COMPILER", ROOT / "zig-out/bin/YannbarukuinaLanguage"))
ASSEMBLER = shutil.which("pyz80") or str(Path(sys.executable).with_name("pyz80"))


def assembler_dialect(source):
    """Translate spelling only; preserve every instruction and data byte."""
    source = re.sub(r"\b([0-9][0-9A-Fa-f]*)h\b", r"0x\1", source)
    source = re.sub(r"^(\w+)\s+EQU\s+", r"\1: EQU ", source, flags=re.M)
    source = re.sub(r"^\s*END\s+_START\s*$", "", source, flags=re.M)
    return re.sub(r"'([^']*)'", lambda m: ",".join(str(ord(c)) for c in m[1]), source)


def emulate(image):
    if len(image) >= 0x7F00 - 0x100:
        raise AssertionError("Test image overlaps the compiler's fixed software stack")
    cpu = Z80Machine()
    # CP/M does not guarantee zero RAM. This catches missing variable setup.
    cpu.set_memory_block(0, bytes([0xA5]) * 65536)
    cpu.set_memory_block(0x100, image)
    cpu.pc = 0x100
    cpu.sp = 0xFF00
    cpu.set_breakpoint(0)
    cpu.set_breakpoint(5)
    output = bytearray()
    deadline = time.monotonic() + 3
    for _ in range(10000):
        if time.monotonic() > deadline:
            break
        cpu.ticks_to_stop = 1000000
        cpu.run()
        if cpu.pc == 0:
            return output.decode("ascii").replace("\r\n", "\n")
        if cpu.pc == 5:
            if cpu.c == 2:
                output.append(cpu.e)
            elif cpu.c == 9:
                addr = cpu.de
                for _ in range(65536):
                    byte = cpu.memory[addr]
                    addr = (addr + 1) & 0xFFFF
                    if byte == ord("$"):
                        break
                    output.append(byte)
                else:
                    raise AssertionError("Unterminated BDOS string")
            else:
                raise AssertionError(f"Unexpected BDOS function {cpu.c}")
            cpu.pc = cpu.memory[cpu.sp] | cpu.memory[(cpu.sp + 1) & 0xFFFF] << 8
            cpu.sp = (cpu.sp + 2) & 0xFFFF
        elif cpu.halted:
            raise AssertionError("Unexpected HALT before CP/M exit")
    raise AssertionError(f"Z80 execution limit reached at {cpu.pc:04x}")


class Z80IntegrationTests(unittest.TestCase):
    def run_source(self, source):
        with tempfile.TemporaryDirectory(prefix="ykw-z80-test-") as directory:
            folder = Path(directory)
            input_file = folder / "test.ykw"
            asm_file = folder / "test.z80"
            adapted_file = folder / "test.asm"
            binary_file = folder / "test.com"
            input_file.write_text(source)
            subprocess.run([str(COMPILER), "z80", str(input_file), "-o", str(asm_file)],
                           check=True, capture_output=True, timeout=10)
            adapted_file.write_text(assembler_dialect(asm_file.read_text()))
            assembled = subprocess.run([ASSEMBLER, f"--obj={binary_file}", str(adapted_file)],
                                       capture_output=True, text=True, timeout=10)
            if assembled.returncode or not binary_file.exists():
                self.fail(f"Assembly failed: {assembled.stdout}\n{assembled.stderr}")
            z80_output = emulate(binary_file.read_bytes())
            vm = subprocess.run([str(COMPILER), "exec", str(input_file)],
                                capture_output=True, text=True, timeout=3)
            self.assertEqual(vm.returncode, 0, vm.stderr)
            return z80_output, vm.stdout, vm.stderr

    def assert_outputs(self, source, expected):
        z80, vm, stderr = self.run_source(source)
        self.assertEqual(stderr, "")
        self.assertEqual(vm, expected, "Host VM result")
        self.assertEqual(z80, expected, "Z80 result")

    def test_harness_control(self):
        # LD C,2; LD E,'3'; CALL 5; JP 0, independent of compiler/assembler.
        self.assertEqual(emulate(bytes.fromhex("0e021e33cd0500c30000")), "3")

    def test_hello_and_numeric_boundaries(self):
        values = [0, 1, 9, 10, 99, 100, 255, 256, 999, 1000,
                  9999, 10000, 32767, 32768, 65535]
        self.assert_outputs("naku(1+2)\n" + "\n".join(f"naku({v})" for v in values),
                            "3\n" + "".join(f"{v}\n" for v in values))

    def test_arithmetic_boundaries(self):
        cases = [("65535+1", 0), ("0-1", 65535), ("65535*65535", 1),
                 ("256*256", 0), ("6*7", 42), ("100/3", 33)]
        for a, b in [(0,1), (1,65535), (3,7), (7,3), (32768,65535),
                     (65535,1), (65535,2), (65535,10), (65535,255),
                     (65535,256), (65535,32768), (65535,65535)]:
            cases.append((f"{a}/{b}", a // b))
        self.assert_outputs("\n".join(f"naku({expr})" for expr, _ in cases),
                            "".join(f"{value}\n" for _, value in cases))

    def test_seeded_division_cases(self):
        rng = random.Random(8026)
        pairs = [(rng.randrange(65536), rng.randrange(1,65536)) for _ in range(80)]
        self.assert_outputs("\n".join(f"naku({a}/{b})" for a,b in pairs),
                            "".join(f"{a//b}\n" for a,b in pairs))

    def test_if_chain_all_branches(self):
        source = "\n".join(f"""x={x}
            moshi(x==0){{naku(10)}}
            mata(x==1){{naku(20)}}
            mata(x==2){{naku(30)}}
            hoka{{naku(40)}}""" for x in range(4))
        self.assert_outputs(source, "10\n20\n30\n40\n")

    def test_if_chain_without_else_and_nested(self):
        self.assert_outputs("""
            moshi(0){naku(99)} mata(0){naku(98)} mata(1){naku(7)}
            moshi(1){moshi(0){naku(99)} mata(1){naku(8)} hoka{naku(98)}} hoka{naku(97)}
            moshi(0){naku(99)} hoka{naku(9)}
            moshi(0){naku(99)}
        """, "7\n8\n9\n")

    def test_nested_break_and_continue(self):
        self.assert_outputs("""
            i=0 total=0
            aruku(i<4){
                i=i+1
                moshi(i==2){hashiru}
                j=0
                aruku(j<4){
                    j=j+1
                    moshi(j==3){tobu}
                    total=total+i
                }
            }
            naku(total)
        """, "16\n")

    def test_zero_initialized_variables_and_first_reads(self):
        self.assert_outputs("""
            naku(unset)
            moshi(0){x=7}
            naku(x)
            aruku(i<3){naku(i) i=i+1}
            j=0
            aruku(j<3){naku(v) v=v+1 j=j+1}
        """, "0\n0\n0\n1\n2\n0\n1\n2\n")

    def test_comparison_and_truthiness(self):
        self.assert_outputs("""
            naku(0<65535) naku(65535>0) naku(65535==65535)
            naku(65535<0) naku(0>65535) naku(0==65535)
            moshi(65535){naku(7)} hoka{naku(99)}
        """, "1\n1\n1\n0\n0\n0\n7\n")

    def test_division_by_zero_stops(self):
        z80, vm, stderr = self.run_source("naku(5/0) naku(99)")
        self.assertEqual(z80, "Error: Division by zero\n")
        self.assertEqual(vm, "")
        self.assertIn("Division by zero", stderr)

    def test_japanese_comments(self):
        self.assert_outputs("""
            zz 日本語コメント naku(99)
            zzfoo=7 zz コメント内のコードは実行しない naku(99)
            naku(zz 式の途中のコメント
            zzfoo)
            // Existing slash comments remain supported.
        """, "7\n")

    def test_invalid_syntax_is_an_error(self):
        invalid = ["naku(", "naku(1", "moshi(1){naku(2)", "tobu", "hashiru",
                   "naku(65536)", "naku(1.5)", "naku(1) @"]
        with tempfile.TemporaryDirectory(prefix="ykw-errors-") as directory:
            folder = Path(directory)
            for source in invalid:
                for command in ["exec", "compile", "z80"]:
                    with self.subTest(source=source, command=command):
                        input_file = folder / "invalid.ykw"
                        output_file = folder / f"{command}.out"
                        input_file.write_text(source)
                        args = [str(COMPILER), command, str(input_file)]
                        if command != "exec":
                            args += ["-o", str(output_file)]
                        result = subprocess.run(args, capture_output=True, text=True, timeout=3)
                        self.assertNotEqual(result.returncode, 0)
                        self.assertIn("Parse error", result.stderr)
                        self.assertEqual(result.stdout, "")
                        self.assertFalse(output_file.exists())


if __name__ == "__main__":
    unittest.main()
