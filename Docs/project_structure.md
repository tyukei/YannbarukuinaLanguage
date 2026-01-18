# やんばるくいな言語 - プロジェクト構成と実行方法

## ディレクトリ構成

```
YannbarukuinaLanguage/
├── build.zig           # Zigビルド設定
├── build.zig.zon       # パッケージ設定
├── Docs/               # ドキュメント
│   ├── zig_learning.md
│   └── project_structure.md（本ファイル）
└── src/
    ├── main.zig        # エントリポイント
    ├── root.zig        # ライブラリルート
    ├── compiler/       # コンパイラ関連
    │   ├── lexer.zig   # 字句解析器
    │   ├── parser.zig  # 構文解析器
    │   └── ast.zig     # 抽象構文木
    └── vm/             # 仮想マシン関連
        └── vm.zig      # スタックベースVM
```

## 実行方法

### ビルド

```bash
zig build
```

### 実行

```bash
# REPLモード（対話式）
zig build run

# ファイル実行
zig build run -- ファイル名.ybk
```

### テスト

```bash
zig build test
```

## 各ファイルの説明

### src/main.zig

エントリポイント。以下の機能を提供：

- **REPLモード**: 引数なしで起動すると対話式モードに入る
- **ファイル実行**: `.ybk`ファイルを指定して実行
- `終了` または `exit` でREPLを終了

### src/compiler/lexer.zig

ソースコードをトークン列に変換する字句解析器。

**対応トークン:**

| カテゴリ | トークン |
|---------|---------|
| リテラル | 数値、文字列、識別子 |
| 演算子 | `+`, `-`, `*`, `/`, `%`, `=`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `!` |
| 区切り文字 | `(`, `)`, `{`, `}`, `[`, `]`, `,`, `.`, `:`, `;` |
| キーワード | もし、でなければ、繰り返す、各々、関数、返す、変数、定数、真、偽、無、表示 |

**使用例:**
```zig
var lex = Lexer.init("変数 x = 42;");
const token = lex.nextToken(); // kw_let
```

### src/compiler/ast.zig

抽象構文木（AST）のノード定義。

**ノードタイプ:**

- **式**: `literal`, `identifier`, `binary`, `unary`, `call`, `grouping`
- **文**: `expression_stmt`, `print_stmt`, `var_decl`, `const_decl`, `block`, `if_stmt`, `while_stmt`, `for_stmt`, `function_decl`, `return_stmt`
- **プログラム**: `program`

**値の型:**
- `number`: 浮動小数点数（f64）
- `string`: 文字列
- `boolean`: 真偽値
- `null_val`: null値

### src/compiler/parser.zig

トークン列からASTを構築する構文解析器。再帰下降パーサーを採用。

**演算子優先順位（低→高）:**

1. 等価比較: `==`, `!=`
2. 比較: `<`, `<=`, `>`, `>=`
3. 加減算: `+`, `-`
4. 乗除算: `*`, `/`, `%`
5. 単項演算: `!`, `-`（負号）
6. 関数呼び出し
7. 基本式: リテラル、識別子、グループ化

**使用例:**
```zig
var lex = Lexer.init("1 + 2 * 3;");
var parser = Parser.initWithLexer(&lex, allocator);
defer parser.deinit();
const ast = try parser.parse();
```

### src/vm/vm.zig

スタックベースの仮想マシン。バイトコードを実行する。

**オペコード:**

| カテゴリ | オペコード |
|---------|-----------|
| スタック操作 | `op_constant`, `op_pop` |
| 算術演算 | `op_add`, `op_subtract`, `op_multiply`, `op_divide`, `op_modulo`, `op_negate` |
| 比較演算 | `op_equal`, `op_not_equal`, `op_less`, `op_less_equal`, `op_greater`, `op_greater_equal` |
| 論理演算 | `op_not` |
| 変数操作 | `op_get_local`, `op_set_local`, `op_get_global`, `op_set_global` |
| 制御フロー | `op_jump`, `op_jump_if_false`, `op_loop` |
| 関数 | `op_call`, `op_return` |
| その他 | `op_print`, `op_null`, `op_true`, `op_false`, `op_halt` |

**使用例:**
```zig
var vm = VM.init(allocator);
defer vm.deinit();

var chunk = Chunk.init(allocator);
defer chunk.deinit();

const idx = try chunk.addConstant(.{ .number = 42.0 });
try chunk.writeOpCode(.op_constant, 1);
try chunk.write(idx, 1);
try chunk.writeOpCode(.op_print, 1);
try chunk.writeOpCode(.op_halt, 1);

try vm.interpret(&chunk);
```

## 言語構文（予定）

```
// 変数宣言
変数 x = 10;
定数 PI = 3.14159;

// 条件分岐
もし x > 5 {
    表示 "大きい";
} でなければ {
    表示 "小さい";
}

// ループ
繰り返す x > 0 {
    表示 x;
    x = x - 1;
}

// 関数定義
関数 足す(a, b) {
    返す a + b;
}

// 関数呼び出し
表示 足す(1, 2);
```

## 今後の実装予定

1. コンパイラ（AST→バイトコード変換）
2. より詳細なエラーメッセージ
3. 配列・オブジェクトのサポート
4. 標準ライブラリ
5. モジュールシステム
