# Zig 言語入門 (YanbaruKwina 開発のために)

YanbaruKwina 言語（および OkinawaRail VM）を実装するにあたり、Zig 言語の基礎知識を整理します。
Zig は C言語のように低レイヤを扱えるモダンな言語で、「隠れた制御フローがない」「メモリ割り当てが明示的」といった特徴があり、VM実装の教材として最適です。

## 1. 変数と定数

```zig
const std = @import("std");

pub fn main() !void {
    // 定数 (const): 値を変更できない
    const friction: f32 = 0.5;

    // 変数 (var): 値を変更できる
    var count: i32 = 0;
    count += 1;

    // 型推論: 型を省略してもコンパイラが推論してくれる
    var name = "Yanbaru"; // []const u8 型になる
}
```

## 2. 構造体 (struct) と 関数

Zig では `class` はなく、データと関数をまとめるのに `struct` を使います。

```zig
const Bird = struct {
    name: []const u8,
    speed: u16,

    // メソッドのような関数
    pub fn fly(self: *Bird) void {
        self.speed += 10;
    }
    
    // 静的関数 (コンストラクタ的な役割でよく使う)
    pub fn init(name: []const u8) Bird {
        return Bird{
            .name = name,
            .speed = 0,
        };
    }
};
```

## 3. エラーハンドリング (!void)

Zig の大きな特徴は、戻り値に `!` をつけることでエラーを返せることです。`try` を使うと、エラー時に即座に関数を抜けることができます。

```zig
// 戻り値が !void (成功なら void, 失敗ならエラー)
fn dangerousOp() !void {
    return error.SomethingBad;
}

pub fn main() !void {
    // エラーが起きたら main から脱出して終了する
    try dangerousOp(); 
    
    std.debug.print("成功！\n", .{});
}
```

## 4. スイッチ文 (switch)

VM の命令（OpCode）を処理する際、Zig の `switch` は非常に強力です。すべてのケースを網羅しないとコンパイルエラーになるため、実装漏れを防げます。

```zig
const OpCode = enum {
    ADD,
    SUB,
    HALT,
};

fn execute(op: OpCode) void {
    switch (op) {
        .ADD => std.debug.print("足し算\n", .{}),
        .SUB => std.debug.print("引き算\n", .{}),
        // .HALT がないのでコンパイルエラーになる（安全！）
        .HALT => std.debug.print("停止\n", .{}),
    }
}
```

## 5. アロケータ (Allocator)

Zig では `malloc` のようなメモリ確保が隠蔽されていません。必ず「アロケータ」を引数で渡します。これにより「どこでメモリを使って、いつ解放するか」を意識させられます。

```zig
pub fn main() !void {
    // 汎用アロケータを作成
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    // 動的配列 (ArrayList) を作る
    var list = std.ArrayList(u8).init(allocator);
    defer list.deinit(); // 使い終わったら解放 (defer でブロック終了時に実行予約)

    try list.append('A');
}
```

## 6. プロジェクト構成と初期化

Zig プロジェクトは `zig init` コマンドで簡単に作成できます。

```bash
# プロジェクトの初期化 (カレントディレクトリに作成)
$ zig init
```

これにより、以下のファイルが生成されます。
- `build.zig`: ビルド定義ファイル（Makefileのようなもの）
- `src/main.zig`: エントリーポイント
- `build.zig.zon`: パッケージ管理ファイル（依存関係の記述など）

### ライブラリのインポート (@import)

Zig にはモジュールシステムがあり、`@import` 組み込み関数を使って他のファイルを読み込みます。

**標準ライブラリ**:
```zig
const std = @import("std"); // 標準ライブラリ全体
```

**別ファイルの読み込み**:
カレントディレクトリにある `utils.zig` を読み込む場合:
```zig
// src/utils.zig
pub fn hello() void { ... }

// src/main.zig
const utils = @import("utils.zig");

pub fn main() void {
    utils.hello();
}
```

**サブディレクトリ**:
```zig
const lexer = @import("compiler/lexer.zig");
```

外部パッケージ（ライブラリ）を使う場合は `build.zig` と `build.zig.zon` で設定が必要ですが、今回は基本的に標準ライブラリのみで実装できます。
