"""Loopback-only editor and bounded native execution API. No public hosting."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

WEB = Path(__file__).resolve().parent
ROOT = WEB.parent
MAX_BODY = 100_000  # JSON may escape each UTF-8 source character.
RUNS = threading.BoundedSemaphore(2)
FILES = {"/": ("index.html", "text/html"), "/index.html": ("index.html", "text/html"),
         "/app.js": ("app.js", "text/javascript"), "/style.css": ("style.css", "text/css")}


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def reply(self, status: int, body: bytes, kind: str = "application/json"):
        self.send_response(status)
        self.send_header("Content-Type", kind + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def json(self, status: int, value: dict):
        self.reply(status, json.dumps(value, ensure_ascii=False).encode())

    def valid_host(self):
        port = self.server.server_port
        return self.headers.get("Host") in {f"127.0.0.1:{port}", f"localhost:{port}"}

    def do_GET(self):
        if not self.valid_host():
            return self.json(403, {"ok": False, "error": "Local access only"})
        if self.path == "/api/health":
            return self.json(200, {"ok": True, "compiler_ready": self.server.compiler.is_file()})
        entry = FILES.get(self.path)
        if not entry:
            return self.json(404, {"ok": False, "error": "Not found"})
        name, kind = entry
        self.reply(200, (WEB / "static" / name).read_bytes(), kind)

    def do_POST(self):
        self.close_connection = True
        port = self.server.server_port
        if not self.valid_host() or self.headers.get("Origin") not in {f"http://127.0.0.1:{port}", f"http://localhost:{port}"}:
            return self.json(403, {"ok": False, "error": "このページから実行してください。"})
        if self.path != "/api/run":
            return self.json(404, {"ok": False, "error": "Not found"})
        if self.headers.get_content_type() != "application/json":
            return self.json(415, {"ok": False, "error": "JSON が必要です。"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > MAX_BODY:
                return self.json(413, {"ok": False, "error": "入力が大きすぎます。"})
            payload = json.loads(self.rfile.read(size))
            source = payload.get("source") if isinstance(payload, dict) else None
            if not isinstance(source, str) or len(source.encode()) > 16_384:
                return self.json(400, {"ok": False, "error": "コードは文字列で、16 KiB 以内にしてください。"})
        except (ValueError, UnicodeError):
            return self.json(400, {"ok": False, "error": "入力を読み取れませんでした。"})
        if not RUNS.acquire(blocking=False):
            return self.json(429, {"ok": False, "error": "実行中です。少し待って再実行してください。"})
        try:
            result = subprocess.run([sys.executable, str(WEB / "runner.py"), "--compiler", str(self.server.compiler)],
                                    input=source.encode(), capture_output=True, timeout=14, cwd=ROOT)
            if result.returncode:
                return self.json(500, {"ok": False, "error": "実行プロセスが停止しました。コードを短くして試してください。"})
            try:
                data = json.loads(result.stdout)
            except (ValueError, UnicodeError):
                return self.json(500, {"ok": False, "error": "実行結果を読み取れませんでした。"})
            self.json(200, data)
        except subprocess.TimeoutExpired:
            self.json(200, {"ok": False, "stage": "timeout", "error": "処理の時間制限に達しました。", "output": ""})
        finally:
            RUNS.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--compiler", type=Path, default=ROOT / "zig-out/bin/YannbarukuinaLanguage")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.compiler = args.compiler.resolve()
    print(f"Queena Playground: http://127.0.0.1:{server.server_port}", flush=True)
    print("Local-only. Ctrl+C to stop. No public deployment.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
