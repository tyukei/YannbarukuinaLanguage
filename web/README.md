# Queena Playground

やんばるくいな言語のコードを書き、「実行」で出力を見る、ローカル専用の小さな Web アプリです。

## 起動

Python 3.10 以降と、C++ 拡張のインストールに対応した環境が必要です。以下は macOS / Linux の手順です。Windows では仮想環境の `Scripts` ディレクトリを使ってください。

リポジトリのルートで実行します。

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r web/requirements.txt
.venv/bin/python -m ziglang build
.venv/bin/python web/server.py
```

同じコンピュータのブラウザで **http://127.0.0.1:8765** を開きます。終了はサーバーの端末で Ctrl+C。ポートを変える場合は `--port 8766`。別のコンパイラを指定する場合は `--compiler /absolute/path/to/YannbarukuinaLanguage`。

セットアップが済んだあとは最後のコマンドだけで起動できます。保存・クラウド送信・公開デプロイは行いません。編集中のコードはページを閉じると消えます。

## できること

- `naku` による数値出力、計算、変数、`moshi / mata / hoka`、`aruku`、`tobu / hashiru` を試す。
- 4 種類のサンプルを読み込み、コードを編集して実行する。
- Ctrl / Command + Enter で実行する。
- 出力・構文エラー・ゼロ除算・時間制限を確認する。
- 実際に生成された Z80 アセンブリを見る。

## 実行の実体と限界

```
ブラウザのエディタ
  → localhost の Python サーバー
  → 既存の Zig 製 YKW コンパイラ (z80 コマンド)
  → pyz80 によるアセンブル
  → kosarev/z80 による実際の Z80 機械語実行
  → ブラウザに出力を返す
```

- **Z80 エミュレータ自体を Queena で書いたものではありません。** 既存の kosarev/z80 エンジンを利用しています。
- ブラウザ内だけで完結する JavaScript / WebAssembly 版ではありません。サーバーの起動が必要です。
- CP/M の BDOS 2（1 文字出力）、9（文字列出力）、アドレス 0 への終了だけを補助します。ディスク・BIOS・OS の起動・実機 I/O は再現していません。
- コンパイラ出力のアセンブラ方言だけを変換しています。入力の YKW を JavaScript/Python で代わりに解釈してはいません。
- 数値は符号なし 16 bit、変数は最大 32 個です。現行コンパイラが対応していない言語機能を追加するものではありません。
- 入力・出力は各 16 KiB、CPU 実行は 2 秒、生成機械語は 28 KiB 未満に制限します。コンパイル・アセンブルにもタイムアウトがあります。
- 深い式・巨大なプログラムなど、現行コンパイラの制限は残ります。本格的なホスティング向けのセキュリティ境界ではありません。

## 安全性

サーバーは `127.0.0.1` にだけ bind し、Host と Origin を検証します。公開設定はありません。任意のパスを配信せず、ソースは一時ディレクトリに書き、引数配列でコンパイラを起動します。シェルへの入力展開や `eval` はしません。各実行は別プロセスで、同時実行・入力・出力・時間を制限します。対応 OS ではプロセスの CPU・メモリ・ファイルサイズも制限します。

これらはローカルで自分のコードを試すための事故防止です。インターネット公開や第三者の任意コードを安全に受け付けるサンドボックスとして使わないでください。

## 検証

```sh
.venv/bin/python -m ziglang build test
.venv/bin/python -m unittest discover -s web -p 'test_*.py' -v
node --check web/static/app.js
```

Web 側の統合テストは実際のコンパイラ・アセンブラ・Z80 エミュレータを呼び出します。算術、分岐、ループ、break / continue、16 bit 境界、構文エラー、ゼロ除算、無限ループ、出力上限、HTTP の正常系と拒否系、繰り返し実行を検証します。

依存元: [Zig](https://ziglang.org/) / [pyz80](https://github.com/simonowen/pyz80) / [kosarev/z80](https://github.com/kosarev/z80)。依存パッケージのライセンスは各配布物を参照してください。
