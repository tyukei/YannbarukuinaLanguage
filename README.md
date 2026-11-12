# Yambaru Queena / CHUKEI Playground

既存のやんばるくいな言語コンパイラを使い、ブラウザでコードを書いて実行結果を見るためのソース一式です。元リポジトリの `a8875e4` をベースに、コンパイラの不具合修正とローカル Web アプリを加えています。

## まず動かす

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r web/requirements.txt
.venv/bin/python -m ziglang build
.venv/bin/python web/server.py
```

同じコンピュータのブラウザで **http://127.0.0.1:8765** を開き、コードを書いて「実行」を押してください。詳しい説明は [web/README.md](web/README.md) にあります。Linux / Python 3.12 / Zig 0.14.1 で検証しました。

**Z80 エミュレータ自体は Queena 製ではありません。** 入力を既存の Zig 製コンパイラで Z80 機械語に変換し、既存の kosarev/z80 CPU エミュレータで実行しています。このPython版はローカルサーバーが必要です。別のブラウザ完結版を `playground/` に収録しています。CP/M のコンソール出力のみを補助する試作です。

## 内容

- `web/`: シンプルなエディタ、実行ボタン、結果・エラー表示、サンプル、実行 API。
- `src/`: 既存コンパイラと VM。数値出力、分岐、変数初期化、入力エラー、コメントなどの修正を含みます。
- `tests/`: VM と実際の Z80 実行を照合する統合テスト。
- `Docs/`: 既存プロジェクトの言語仕様と開発資料。

## 検証コマンド

```sh
.venv/bin/python -m ziglang build test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
.venv/bin/python -m unittest discover -s web -p 'test_*.py' -v
node --check web/static/app.js
```

この配布物はソースのみです。プラットフォーム固有の実行ファイル、仮想環境、ビルドキャッシュは含めていません。セットアップ時の依存取得以外にクラウドサービスは必要ありません。

## 公開ブラウザ版と CHUKEI

公開サイト: https://queena-playground.keitanakata.chatgpt.site

`playground/dist/` は公開静的サイトのスナップショットです。`playground/runtime-source/` にWASMコンパイラ、字句解析・AST表示、CHUKEI教材用VMとテストを収録しています。入力コードはブラウザ内で処理され、実行サーバーへ送信されません。CHUKEIはZ80ではなく独立した教材用VMです。詳細は [公開版README](playground/README.md) を参照してください。

図の説明用コードは括弧が省略されていますが、実際のQueena入力は `naku(3)` / `naku(3 + 2)` のように括弧が必要です。図自体の修正は未実施です。
