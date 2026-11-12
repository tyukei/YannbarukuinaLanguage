# VM / Z80 integration checks

Use Zig 0.14.1 to build the native compiler, then:

```sh
zig build
zig build test
python3 -m venv /tmp/ykw-test-tools
/tmp/ykw-test-tools/bin/pip install z80==1.2.0 pyz80==1.3.0
/tmp/ykw-test-tools/bin/python tests/test_z80_integration.py -v
```

`YKW_COMPILER` can override the native compiler path. The suite generates Z80
assembly, adapts assembler syntax only, assembles real instructions with pyz80,
and executes them with the kosarev/z80 CPU emulator. It implements only CP/M
console BDOS calls 2 and 9 and exit at address 0. It does not boot a complete
CP/M BIOS, access disks, or validate a particular physical Z80 machine.

RAM starts with nonzero bytes to verify variable initialization. Test programs
cover decimal formatting, u16 arithmetic and division boundaries, seeded random
division cases, all if-chain branches, nested loops, break/continue, variables
read before assignment, comparisons, and division-by-zero termination. Host VM
output is checked against the same expected values. A raw-machine-code console
control validates the emulator harness independently of compiler and assembler.
