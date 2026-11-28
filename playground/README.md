# YanbaruKuina Playground — hosted browser edition

Static, browser-local YanbaruKuina playground. No code execution endpoint, credentials, user database or code upload is required. The editor runs each program in a fresh Web Worker. A watchdog terminates runs exceeding 15 seconds.

The compiler is based on tyukei/YannbarukuinaLanguage, with the corrected parser and Z80 generator. The hosted runtime compiles to Z80 machine code and executes through a Z80 CPU emulator with minimal CP/M console support, not a complete CP/M operating system. The CPU emulator is not written in YanbaruKuina.

Source code entered by visitors is not persisted or sent to an execution server. Hosting access logs are outside this application's control.

GitHub Pages publishes the generated static files from the `gh-pages` branch root. Source and tests live on `feat/queena-chukei-playground` under `playground/`. Sites is retained during migration. The deployment contains no server or secrets. Relative asset URLs support both the repository URL and a custom domain.

## Illustrated guide and syntax tree
Two requested illustrations are served locally under `dist/images/`; tapping opens the original resolution. The responsive guide follows the editor, without changing the runtime privacy model. The AST panel renders structured compiler output as safe text and collapsible branches, not HTML, and marks earlier results stale when source changes.

The lexical analysis panel uses the compiler's real lexer tokens in source order, including EOF. Whitespace/comments are omitted by the lexer, and column values use UTF-8 byte positions. Token strings are rendered with textContent, not HTML; parse errors can still show their lexical stream.

## CHUKEI educational language
Separate selectable language with six case-sensitive commands with no required spaces: C increment, CH decrement, CHU move right, CHUK output, CHUKE begin loop, CHUKEI end loop. Every command starts with C and contains no other C, so the next C separates commands. Existing whitespace/newline-separated code remains valid. Whitespace does not join fragments inside a command; unknown chunks and unmatched loops remain errors. It compiles to an explicitly educational VM instruction stream, not Z80. Its 256 uint8 cells and pointer wrap. The UI shows tokens, nested structure, generated instructions and bounded execution history. Source remains browser-local; both runtimes are terminated by the existing cancel/watchdog.

CHUKEI uses ASCII output only. CHUK emits one character without an automatic newline; 0–127 only, with 10 for newline and 32 for space. Values above 127 report an error. UI examples include ABC, AZaz, multiple cells and newlines.

YanbaruKuina, CHUKEI, and 8888 share one editor and output panel. The language tabs update only the `lang` query parameter and keep drafts in the same tab. Source files download as `.🐧`, `.🔴`, and `.👏`, respectively; the old extensions still open. The shared debugger replays up to 4,096 steps: cell values for the teaching VMs and actual Z80 assembly, register and memory states for YanbaruKuina.

## Compact CHUKEI source
The default HELLO greeting and all CHUKEI examples now contain no whitespace. Whitespace-separated source still works, but all output uses ASCII characters rather than decimal cell values. See `runtime-source/chukei-README.md` for the scanner, build and regression checks.

## Visual syntax tree
The AST panel presents the actual returned AST as connected, keyboard-expandable cards. Roles (condition/body/left/right) and source locations are used only when provided by the compiler. CHUKEI loops remain one real loop node with their real body children; no synthetic condition nodes or execution counts are invented. Consecutive identical CHUKEI leaf commands can be grouped for display, with an explicit count and a switch to show individual nodes. This does not alter the AST, VM or execution.

Cards are limited to 400 and depth 24 with an explicit truncation notice; counts inspect at most 20,000 nodes. Native details and nested lists provide keyboard and screen-reader semantics. The scroll region contains wide/deep trees on mobile. Parse failures clear the previous tree; runtime failures retain a successfully parsed tree. Edited source is marked stale.

Run `node runtime-source/ast-view-test.mjs` for presentation and DOM-adapter unit tests, and the existing runtime AST/CHUKEI tests for compiler semantics. The DOM adapter is not browser/layout verification.


## 8888：引数と戻り値
```
マジ足す(x,y){88৪(x,y)}
৪৪৪(めっちゃ足す(2,3))
```
関数の本体は1つの式です。引数を読み、値を返し、共有メモリを変えません。式の結果は別の呼び出しにも渡せます。出力は関数の外に書きます。数値は0〜255で加減算は一周します。旧形式（共有メモリ操作）と新形式は、別々のプログラムとして実行できます。

### 旧形式（互換）
数字の `8` を1〜8個並べて1命令を書き、命令は空白か改行で区切ります。ベンガル数字の `৪` とオリヤー数字の `୪` も `8` と同じ1文字として数え、同じ命令内で混ぜられます。ASCIIの `4` は単独では命令になりません（`set 4` は値の指定として有効）。`👏 メモ 👏` はコメントです。行をまたげますが入れ子にはできません。コメントは命令の区切りとして扱い、閉じ忘れはエラーになります。`8` が現在のセルを1増やし、`88888` が値を出力します。例：`8 8 8 8 8 88888` → `5`。初期形式も互換用として実行できます。

- [ブラウザで動かす](https://yanbarukuina.chukei.online/?lang=8888)
- `dist/8888/engine.mjs` がバイトコード生成とVM実行を担当します。一命令3バイト（命令番号、即値やジャンプ先の下位・上位バイト）で、ジャンプ先はバイト単位のアドレスです。Z80の機械語ではありません。
- `playground/` 直下で `node --test runtime-source/8888.test.mjs`。ローカル表示は `python3 -m http.server 8000 --bind 127.0.0.1 --directory dist` のあと `http://127.0.0.1:8000/?lang=8888`。
- 8888は同じPlayground内で切り替えます。旧 `/8888/` URLは引き続き使えます。外部ライブラリ・実行サーバーは不要です。

- `set 2 push set 3 add 88888` は `5` を表示します。 `sub` は左の保存値から現在値を引きます。結果は8ビットで循環します。
- `set 65 char` は `A` を出力します。文字出力は表示可能な ASCII と改行に対応します。
- `マジ 名前 ... 神` で宣言、`めっちゃ 名前` で実行します。`fn`、`end`、`call` は互換の別名です。宣言はトップレベルに限り、前方参照と別の関数の呼び出しが可能です。セルと保存値は共有し、引数や戻り値はありません。

公開エディターの全サンプルは、日本語キーワードで関数を宣言して呼び出す形で掲載しています。

## 試作 v0.3: つなげて書く
`マジ"名前"` か `めっちゃ"名前"` から始めると、命令を3文字ずつ読む新形式になります。8、৪、୪ は区別されます。全サンプルに空白は不要です。`神` は関数の終端です。空白・改行は命令の間に任意で挿入でき、文字列内部では値の一部です。

例：`マジ"五"8୪৪"2""3"8৪୪神めっちゃ"五"` は 5 を表示します。`8৪୪"こんにちは"` は文字列を表示。命令表はエンジンの定義から生成します。旧形式は従来どおり実行できます。

## 試作 v0.4: 関数は波括弧、値は神
`マジ名前{…}` で宣言し、`めっちゃ{名前}` で呼びます。`神` で値を区切り、複数の値の間では境界を共有します。例：`マジ五{8୪৪神2神3神8৪୪}めっちゃ{五}` → 5。`8৪୪神こんにちは神` は文字列を表示。数を受け取る命令では `神8神` の中の8は数であり、3文字の命令とは区別されます。表示する文字に神を含めるには `\神`、バックスラッシュは `\\` と書きます。旧形式とv0.3は互換のままです。

## 試作 v0.5: 先頭の文字で命令を分類
`8` は計算、`৪` は値、`୪` は移動・ループ。計算は `88৪`（足す）と `88୪`（引く）、`8৪8`（+1）と `8୪8`（−1）。移動は `୪৪৪` と `୪৪୪`、ループは `୪୪৪` と `୪୪୪`。命令表とサンプルはこの並びを使います。v0.3 / v0.4 の旧命令も同じ意味で受け付けます。

「デバッグ実行」で、VMの先頭4,096ステップまでセルの値を進めたり戻したりして確認できます。全256セルを16個ずつ表示し、現在のセルと更新された値を強調します。

デバッグでは、実行した命令のソース位置を行・列と ▶ で示します。一つのソース命令を複数のVM命令に変換した場合は、複数ステップで同じ箇所を指します。
