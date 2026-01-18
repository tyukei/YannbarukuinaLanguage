# YanbaruKwina (YKW) 言語定義書 v0.1

本ドキュメントは、YanbaruKwina 言語の厳密な定義をまとめたものです。

## 1. 語彙仕様 (Lexical Structure)

### 1.1 コメント
*   **行コメント**: `zz` から行末まではコメントとして扱われ、無視されます。
    *   **注意**: `zz` はキーワードとして扱われるため、直前にスペースや区切り文字が必要です（例: `a = 1 zz comment`）。

### 1.2 識別子 (Identifiers)
*   **パターン**: `[A-Za-z_][A-Za-z0-9_]*`
*   **予約語**: 以下の単語は識別子として使用できません。
    *   `naku` (print)
    *   `aruku` (while)
    *   `moshi` (if)
    *   `mata` (else if)
    *   `hoka` (else)
    *   `tobu` (break)   
    *   `hashiru` (continue) 
    *   `zz` (comment)   

### 1.3 リテラル
*   **整数**: 10進数表現の非負整数 (例: `0`, `123`, `65535`)

## 2. 構文規則 (Grammar)

拡張BNF (EBNF) による定義:

```ebnf
program     ::= stmt* EOF

stmt        ::= assign_stmt
              | print_stmt
              | while_stmt
              | if_stmt
              | break_stmt
              | continue_stmt

block       ::= "{" stmt* "}"

/* 代入: 変数への値の割り当て */
assign_stmt ::= IDENT "=" expr

/* 出力: 式の評価値を表示 */
print_stmt  ::= "naku" "(" expr ")"

/* ループ: 条件が真(非0)の間繰り返す */
while_stmt  ::= "aruku" "(" expr ")" block

/* 分岐: 条件による制御 */
if_stmt     ::= "moshi" "(" expr ")" block
                ("mata" "(" expr ")" block)*
                ("hoka" block)?

/* 制御フロー (ループ内でのみ有効) */
break_stmt  ::= "tobu"
continue_stmt ::= "hashiru"

/* 式 */
expr        ::= equality

/* 比較演算 (連鎖比較は非許可) */
equality    ::= comparison ( "==" comparison )*
comparison  ::= term ( ("<" | ">") term )?

/* 加減算 */
term        ::= factor ( ("+" | "-") factor )*

/* 乗除算 */
factor      ::= primary ( ("*" | "/") primary )*

/* 基本要素 */
primary     ::= NUMBER
              | IDENT
              | "(" expr ")"
```

## 3. 意味論とランタイム挙動 (Semantics & Runtime)

### 3.1 データ型
*   すべての値は **16-bit 符号なし整数 (u16)** として扱います。
*   範囲: `0` ～ `65535`

### 3.2 変数とスコープ
*   **スコープ**: グローバルスコープのみ。
*   **変数スロット**: 最大 **32個** の変数が使用可能。
*   **初期化**: プログラム開始時、すべての変数は `0` で初期化されます。未代入変数の参照は `0` を返します。

### 3.3 演算規則
*   **算術オーバーフロー**:
    *   加算・減算・乗算において、結果が u16 の範囲を超えた場合は **ラップアラウンド** します（エラーにはなりません）。
    *   例: `65535 + 1 => 0`
*   **ゼロ除算**:
    *   実行時に除数が `0` の場合、エラーメッセージを出力し、プログラムは直ちに **停止 (HALT)** します。

### 3.4 真偽値 (Boolean Logic)
*   YanbaruKwina には独立したブーリアン型はありません。u16 を用います。
*   **判定 (Conditions)**:
    *   `if` (moshi/mata) や `while` (aruku) の条件式において、`0` は **偽 (False)**、それ以外は **真 (True)** とみなされます。
*   **比較演算子の結果**:
    *   `==`, `<`, `>` の評価結果は、真であれば `1`、偽であれば `0` を生成します。

### 3.5 制御フロー制限
*   `tobu` (break) および `hashiru` (continue) は、**最も内側の `aruku` ループ** に対してのみ作用します。
*   ループの外側でこれらのキーワードが使用された場合、**コンパイルエラー** となります。

### 3.6 制限事項
*   **コードサイズ**: バイトコード長は最大 65535 バイトまで。
*   **再帰**: 関数定義機能がないため、不可。

## 4. バイトコード (OKR1 変更点)

v0.1 仕様に加え、以下の対応が必要です。

*   `tobu` (break) -> ループ終了地点への無条件ジャンプ (`JMP`)
*   `hashiru` (continue) -> ループ条件判定地点への無条件ジャンプ (`JMP`)
*   コンパイラは、ループの開始/終了ラベルを管理し、適切なジャンプ先アドレスを生成する必要があります。
