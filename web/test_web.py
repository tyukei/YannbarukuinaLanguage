"""Integration tests: the editor API calls the real native compiler and CPU."""
import http.client
import json
import threading
import unittest
from pathlib import Path

import runner
import server

ROOT = Path(__file__).resolve().parent.parent
COMPILER = ROOT / "zig-out/bin/YannbarukuinaLanguage"


class PipelineTests(unittest.TestCase):
    def output(self, source):
        return runner.run(source, COMPILER)["output"].replace("\r\n", "\n")

    def test_arithmetic(self):
        self.assertEqual(self.output("naku(6 * 7) naku(100 / 3)"), "42\n33\n")

    def test_branches(self):
        self.assertEqual(self.output("x = 7 moshi(x < 5){naku(100)} mata(x < 10){naku(200)} hoka{naku(300)}"), "200\n")

    def test_loop(self):
        self.assertEqual(self.output("i=0 aruku(i<5){naku(i) i=i+1}"), "0\n1\n2\n3\n4\n")

    def test_control(self):
        self.assertEqual(self.output("i=0 aruku(i<10){i=i+1 moshi(i==3){hashiru} moshi(i==6){tobu} naku(i)}"), "1\n2\n4\n5\n")

    def test_unsigned_and_zero_initialization(self):
        self.assertEqual(self.output("naku(65535) naku(65535+1) naku(missing)"), "65535\n0\n0\n")

    def test_no_output(self):
        self.assertEqual(self.output("zz comment only\n"), "")

    def test_compiler_errors_with_zero_exit(self):
        for source in ["naku(", "tobu", "hashiru", "naku(70000)"]:
            with self.subTest(source=source), self.assertRaises(runner.RunError) as error:
                self.output(source)
            self.assertEqual(error.exception.stage, "compile")

    def test_division_zero(self):
        with self.assertRaises(runner.RunError) as error:
            self.output("naku(1/0)")
        self.assertEqual(error.exception.stage, "execute")
        self.assertIn("Division by zero", error.exception.output)

    def test_infinite_loop(self):
        with self.assertRaises(runner.RunError) as error:
            self.output("aruku(1){}")
        self.assertIn("2 秒", str(error.exception))

    def test_output_limit(self):
        with self.assertRaises(runner.RunError) as error:
            self.output("aruku(1){naku(12345)}")
        self.assertIn("出力上限", str(error.exception))

    def test_input_limit(self):
        for source in ["", "  ", "x" * (runner.MAX_SOURCE + 1)]:
            with self.subTest(size=len(source)), self.assertRaises(runner.RunError) as error:
                self.output(source)
            self.assertEqual(error.exception.stage, "input")

    def test_missing_compiler(self):
        with self.assertRaises(runner.RunError) as error:
            runner.run("naku(1)", ROOT / "does-not-exist")
        self.assertEqual(error.exception.stage, "setup")


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.http.compiler = COMPILER
        cls.port = cls.http.server_port
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        defaults = {"Origin": f"http://127.0.0.1:{self.port}", "Content-Type": "application/json"}
        defaults.update(headers or {})
        connection.request(method, path, body=body, headers=defaults)
        response = connection.getresponse()
        data = response.read()
        status, headers = response.status, dict(response.getheaders())
        connection.close()
        return status, headers, data

    def test_static_and_health(self):
        for path in ["/", "/app.js", "/style.css", "/api/health"]:
            with self.subTest(path=path):
                status, headers, data = self.request("GET", path)
                self.assertEqual(status, 200)
                self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
                self.assertTrue(data)

    def test_api_and_repeated_execution(self):
        for expected in [42, 17, 42]:
            status, _, data = self.request("POST", "/api/run", json.dumps({"source": f"naku({expected})"}))
            result = json.loads(data)
            self.assertEqual(status, 200)
            self.assertTrue(result["ok"])
            self.assertEqual(result["output"].strip(), str(expected))
            self.assertIn("_PRINT_U16", result["assembly"])

    def test_host_and_origin_protection(self):
        self.assertEqual(self.request("GET", "/", headers={"Host": "attacker.invalid"})[0], 403)
        self.assertEqual(self.request("POST", "/api/run", "{}", {"Origin": "https://attacker.invalid"})[0], 403)
        self.assertEqual(self.request("POST", "/api/run", "{}", {"Origin": "null"})[0], 403)

    def test_not_a_file_server(self):
        for path in ["/../src/main.zig", "/server.py", "/%2e%2e/src/main.zig", "/api/run"]:
            self.assertEqual(self.request("GET", path)[0], 404)

    def test_invalid_request(self):
        for body in ["not json", "{}", "[]", '{"source":7}', '{"source":"' + "a"*16385 + '"}']:
            self.assertEqual(self.request("POST", "/api/run", body)[0], 400)
        self.assertEqual(self.request("POST", "/api/run", "x" * 100001)[0], 413)
        self.assertEqual(self.request("POST", "/api/run", "{}", {"Content-Type": "text/plain"})[0], 415)

    def test_busy_limit(self):
        server.RUNS.acquire()
        server.RUNS.acquire()
        try:
            self.assertEqual(self.request("POST", "/api/run", '{"source":"naku(1)"}')[0], 429)
        finally:
            server.RUNS.release()
            server.RUNS.release()


if __name__ == "__main__":
    unittest.main()
