# やんばるくいな言語 - コンパイラアーキテクチャ解説

## 処理の全体フロー

```
ソースコード → Lexer → Token列 → Parser → AST → (Compiler) → Bytecode → VM → 実行結果
```

現在、Compiler（AST→Bytecode変換）は未実装ですが、他の部分を順番に解説します。

---

## 1. Lexer（字句解析器）- ソースコードをトークンに分解

**ファイル:** `src/compiler/lexer.zig`

### 役割

Lexerは**ソースコード（文字列）をトークン列に変換**します。

**例:** `変数 x = 42;` を処理すると：

```
"変数 x = 42;"
    ↓ Lexer
[kw_let, identifier("x"), equal, number("42"), semicolon, eof]
```

### 主要な処理フロー

1. **`nextToken()`** (90行目): 次のトークンを1つ返す
2. **`skipWhitespace()`** (161行目): 空白・改行・コメントをスキップ
3. **`advance()`** (128行目): 1文字読み進める
4. 文字の種類で分岐:
   - 数字 → `number()` (185行目)
   - 文字 → `identifier()` (217行目) → キーワードかチェック
   - 記号 → 対応するトークンを返す

### 対応トークン

| カテゴリ | トークン |
|---------|---------|
| リテラル | `number`, `string`, `identifier` |
| 演算子 | `+`, `-`, `*`, `/`, `%`, `=`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `!` |
| 区切り文字 | `(`, `)`, `{`, `}`, `[`, `]`, `,`, `.`, `:`, `;` |
| キーワード | もし、でなければ、繰り返す、各々、関数、返す、変数、定数、真、偽、無、表示 |

### 日本語キーワード対応

```zig
fn identifierType(self: *Self, text: []const u8) TokenType {
    const keywords = .{
        .{ "もし", TokenType.kw_if },
        .{ "変数", TokenType.kw_let },
        .{ "関数", TokenType.kw_fn },
        // ...
    };

    inline for (keywords) |kw| {
        if (std.mem.eql(u8, text, kw[0])) {
            return kw[1];
        }
    }
    return .identifier;
}
```

`isAlpha`関数で `c >= 0x80` をチェックすることで、UTF-8の日本語文字を識別子として認識します。

---

## 2. AST（抽象構文木）- 構文の木構造表現

**ファイル:** `src/compiler/ast.zig`

### 役割

ASTは**プログラムの構造を木構造で表現**するデータ構造です。

**例:** `1 + 2 * 3` のAST:

```
        binary(+)
        /       \
   literal(1)  binary(*)
               /      \
          literal(2)  literal(3)
```

### 主要な構造

#### NodeType（ノードの種類）

```zig
pub const NodeType = enum {
    // 式
    literal,      // リテラル値
    identifier,   // 変数名
    binary,       // 二項演算
    unary,        // 単項演算
    call,         // 関数呼び出し
    grouping,     // グループ化 (...)

    // 文
    expression_stmt,  // 式文
    print_stmt,       // 表示文
    var_decl,         // 変数宣言
    const_decl,       // 定数宣言
    block,            // ブロック {...}
    if_stmt,          // if文
    while_stmt,       // while文
    for_stmt,         // for文
    function_decl,    // 関数定義
    return_stmt,      // return文

    // プログラム
    program,
};
```

#### Value（リテラル値の型）

```zig
pub const Value = union(enum) {
    number: f64,       // 数値
    string: []const u8, // 文字列
    boolean: bool,     // 真偽値
    null_val: void,    // null
};
```

#### Node（ASTの各ノード）

```zig
pub const Node = struct {
    node_type: NodeType,  // ノードの種類
    data: NodeData,       // ノード固有のデータ
    token: ?Token,        // 元のトークン（エラー表示用）
};
```

#### 各ノードのデータ構造

```zig
// 二項演算
pub const BinaryData = struct {
    left: *Node,
    operator: Token,
    right: *Node,
};

// if文
pub const IfStmtData = struct {
    condition: *Node,
    then_branch: *Node,
    else_branch: ?*Node,
};

// 関数定義
pub const FunctionDeclData = struct {
    name: []const u8,
    parameters: std.ArrayList([]const u8),
    body: *Node,
};
```

#### Ast（ノード管理）

```zig
pub const Ast = struct {
    root: ?*Node,
    allocator: std.mem.Allocator,
    nodes: std.ArrayList(*Node),

    pub fn createNode(...) !*Node { ... }
    pub fn deinit(...) void { ... }
};
```

---

## 3. Parser（構文解析器）- トークンからASTを構築

**ファイル:** `src/compiler/parser.zig`

### 役割

Parserは**トークン列を読み取り、ASTを構築**します。再帰下降パーサーを採用。

**例:** `変数 x = 1 + 2;` を処理すると：

```
[kw_let, identifier("x"), equal, number("1"), plus, number("2"), semicolon]
    ↓ Parser
program
  └── var_decl
        ├── name: "x"
        └── initializer: binary(+)
                          ├── left: literal(1)
                          └── right: literal(2)
```

### 処理の階層構造

```
parse()                    # プログラム全体
  └── declaration()        # 宣言（変数、定数、関数）または文
        ├── varDeclaration()     # 変数 x = ...;
        ├── constDeclaration()   # 定数 PI = ...;
        ├── functionDeclaration() # 関数 foo() {...}
        └── statement()          # 文
              ├── printStatement()    # 表示 ...;
              ├── ifStatement()       # もし ... {...}
              ├── whileStatement()    # 繰り返す ... {...}
              └── expressionStatement() # 式;
```

### 式の優先順位（低→高）

```
expression()      → equality()        # ==, !=
                    → comparison()    # <, <=, >, >=
                      → term()        # +, -
                        → factor()    # *, /, %
                          → unary()   # !, - (単項)
                            → call()  # 関数呼び出し
                              → primary()  # リテラル、識別子、(...)
```

### 重要なメソッド

| メソッド | 行番号 | 役割 |
|---------|--------|------|
| `match()` | 491 | 現在のトークンが期待する型なら進む |
| `advance()` | 503 | 次のトークンに進む |
| `check()` | 499 | 現在のトークンの型をチェック |
| `synchronize()` | 512 | エラー回復（次の文の開始まで飛ばす） |

---

## 4. VM（仮想マシン）- バイトコードを実行

**ファイル:** `src/vm/vm.zig`

### 役割

VMは**バイトコードを実行するスタックベースの仮想マシン**です。

**例:** `1 + 2` のバイトコード実行:

```
バイトコード:
  op_constant 0    # 定数[0] = 1 をプッシュ
  op_constant 1    # 定数[1] = 2 をプッシュ
  op_add           # スタックから2つポップして加算、結果をプッシュ

スタックの変化:
  []          → [1]         → [1, 2]       → [3]
  (初期)       (1をプッシュ)  (2をプッシュ)  (加算結果)
```

### 主要な構造

#### OpCode（命令セット）

```zig
pub const OpCode = enum(u8) {
    // スタック操作
    op_constant,    // 定数をプッシュ
    op_pop,         // スタックからポップ

    // 算術演算
    op_add,         // 加算
    op_subtract,    // 減算
    op_multiply,    // 乗算
    op_divide,      // 除算
    op_modulo,      // 剰余
    op_negate,      // 符号反転

    // 比較演算
    op_equal,       // ==
    op_not_equal,   // !=
    op_less,        // <
    op_less_equal,  // <=
    op_greater,     // >
    op_greater_equal, // >=

    // 変数操作
    op_get_local,   // ローカル変数取得
    op_set_local,   // ローカル変数設定
    op_get_global,  // グローバル変数取得
    op_set_global,  // グローバル変数設定

    // ジャンプ
    op_jump,        // 無条件ジャンプ
    op_jump_if_false, // 条件付きジャンプ
    op_loop,        // ループ（後方ジャンプ）

    // 関数
    op_call,        // 関数呼び出し
    op_return,      // 関数から戻る

    // その他
    op_print,       // 表示
    op_null,        // null値
    op_true,        // true
    op_false,       // false
    op_halt,        // 実行終了
};
```

#### Chunk（バイトコードの塊）

```zig
pub const Chunk = struct {
    code: std.ArrayList(u8),       // バイトコード列
    constants: std.ArrayList(Value), // 定数テーブル
    lines: std.ArrayList(usize),   // 行番号（デバッグ用）
};
```

#### VM（仮想マシン本体）

```zig
pub const VM = struct {
    chunk: *Chunk,                     // 実行中のチャンク
    ip: usize,                         // 命令ポインタ
    stack: [STACK_MAX]Value,           // 値スタック
    stack_top: usize,                  // スタックトップ
    globals: std.StringHashMap(Value), // グローバル変数
};
```

### スタック操作

| メソッド | 行番号 | 役割 |
|---------|--------|------|
| `push()` | 321 | 値をスタックに積む |
| `pop()` | 326 | 値をスタックから取り出す |
| `peek()` | 331 | スタックを見る（取り出さない） |

### 命令の処理例

```zig
// run() メソッド内
.op_add => try self.binaryOp(.add),

fn binaryOp(self: *Self, op: BinaryOp) InterpretError!void {
    const b = self.pop();  // 右オペランド
    const a = self.pop();  // 左オペランド

    const result = switch (op) {
        .add => num_a + num_b,
        .subtract => num_a - num_b,
        .multiply => num_a * num_b,
        .divide => num_a / num_b,
        .modulo => @mod(num_a, num_b),
    };

    self.push(.{ .number = result });
}
```

---

## 5. 全体のまとめ - 処理フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                    ソースコード                                   │
│                "変数 x = 1 + 2;"                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  【1. Lexer】字句解析                                            │
│  ソースを1文字ずつ読み、トークンに分解                              │
│                                                                 │
│  出力: [kw_let, identifier("x"), equal, number("1"),            │
│         plus, number("2"), semicolon]                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  【2. Parser】構文解析（再帰下降パーサー）                         │
│  トークン列を読み、文法に従ってASTを構築                           │
│                                                                 │
│  出力: program                                                  │
│           └── var_decl(name="x")                                │
│                 └── initializer: binary(+)                      │
│                                    ├── left: literal(1)         │
│                                    └── right: literal(2)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  【3. Compiler】コンパイル（未実装）                              │
│  ASTを走査し、バイトコードに変換                                  │
│                                                                 │
│  出力: Chunk {                                                  │
│          code: [op_constant, 0, op_constant, 1,                 │
│                 op_add, op_set_global, 2, op_halt]              │
│          constants: [1.0, 2.0, "x"]                             │
│        }                                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  【4. VM】仮想マシン実行                                         │
│  バイトコードを1命令ずつ読み、スタックを操作して実行                 │
│                                                                 │
│  実行過程:                                                       │
│    op_constant 0  → stack: [1]                                  │
│    op_constant 1  → stack: [1, 2]                               │
│    op_add         → stack: [3]                                  │
│    op_set_global  → globals["x"] = 3, stack: [3]                │
│    op_halt        → 終了                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 今後の実装予定

現在、**Compiler（AST→Bytecode変換）が未実装**のため、ParserでASTを構築するところまでが動作します。

次のステップ:

1. **Compiler実装** - ASTを走査してバイトコードを生成
2. **エラーメッセージ改善** - 行番号・列番号を含む詳細なエラー
3. **配列・オブジェクト対応** - 複合データ型のサポート
4. **標準ライブラリ** - 組み込み関数の追加
5. **モジュールシステム** - ファイル分割とインポート
