 了解です。**現在までに確定した内容をすべて反映した「整理済み・読みやすい最終仕様書」**を、最初から最後まで一貫した形で書き直します。
（内容は v0.1、教材向け・Z80/VM前提で固定）

⸻

YanbaruKwina（YKW） v0.1 仕様書

— OkinawaRail VM 上で動く、学べる教材言語 —

⸻

0. コンセプト

YanbaruKwina（YKW）は、
	•	ソース → AST → バイトコード → VM の流れが明確に見える
	•	Z80（z80pack / CP/M） 上で動作する
	•	文法・命令・実行モデルをあえて小さく保った 教材向け言語

である。

表層の文法は ウチナー口っぽい命名を採用し、
内部は 透明で追いやすい実装を重視する。

YanbaruKwina（ローカル名）で書かれたコードは、
コンパイルされると OkinawaRail（英語名） として走る。

⸻

1. 全体アーキテクチャ

1.1 構成要素

種別	名前	役割
言語	YanbaruKwina	人が書く高級言語
フレームワーク	YanbaruKwina on Higashison	開発体験を整える
コンパイラ	YanbaruKwina2OkinawaRail	.ykw → .okr
VM	OkinawaRail VM	Z80上で実行


⸻

1.2 実行フロー
	1.	開発PCで .ykw ソースを書く
	2.	YanbaruKwina2OkinawaRail（Zig製）がコンパイル
	3.	.okr（OkinawaRail実行形式）を生成
	4.	Z80 / z80pack 上で OkinawaRail VM（ovm） が実行

⸻

2. 命名・コマンド（確定）

2.1 言語
	•	名前：YanbaruKwina
	•	ソース拡張子：.ykw

2.2 フレームワーク
	•	名前：YanbaruKwina on Higashison
	•	CLI：higashi

2.3 コンパイラ
	•	名前：YanbaruKwina2OkinawaRail
	•	実装言語：Zig
	•	入力：.ykw
	•	出力：.okr

2.4 VM
	•	正式名：OkinawaRail VM
	•	実行コマンド：ovm
	•	ターゲット：z80pack / CP/M

⸻

3. 実行ファイル形式（.okr）

3.1 基本方針
	•	.okr は OkinawaRail VM 専用のバイトコード形式
	•	数値は little-endian
	•	拡張子の被り対策として 先頭マジックで厳密判定

⸻

3.2 OKR1 フォーマット（v0.1）

offset	size	内容
0	4	ASCII "OKR1"
4	2	code_size（u16, little）
6	N	バイトコード本体

	•	ジャンプアドレス（addr16）は code先頭（offset=6）からの相対位置

⸻

4. 言語仕様（YanbaruKwina v0.1）

4.1 データ型・真偽
	•	値：u16（0–65535）
	•	真偽値：0 = 偽、非0 = 真
	•	算術オーバーフロー：u16でラップ（v0.1では未定義扱いでも可）

⸻

4.2 変数
	•	識別子：[A-Za-z_][A-Za-z0-9_]*
	•	スコープ：グローバルのみ
	•	コンパイル時に slot番号（0–31） に割り当て
	•	32個を超えた場合はコンパイルエラー

⸻

4.3 文（構文）

出力

naku(expr)

ループ（while）

aruku (cond) { ... }

分岐（if-chain）

moshi (cond) { ... }
mata (cond) { ... }
hoka { ... }

	•	mata は 0 回以上
	•	hoka は省略可（else）

代入

name = expr


⸻

5. 文法（EBNF）

program     := stmt* EOF ;

stmt        := assign
            | print
            | while
            | ifchain ;

assign      := IDENT "=" expr ;
print       := "naku" "(" expr ")" ;
while       := "aruku" "(" expr ")" block ;

ifchain     := "moshi" "(" expr ")" block
               ("mata" "(" expr ")" block)*
               ("hoka" block)? ;

block       := "{" stmt* "}" ;

expr        := equality ;
equality    := comparison ( "==" comparison )* ;

/* v0.1: 連鎖比較は禁止 */
comparison  := term ( ("<" | ">") term )? ;

term        := factor ( ("+" | "-") factor )* ;
factor      := primary ( ("*" | "/") primary )* ;
primary     := NUMBER | IDENT | "(" expr ")" ;


⸻

6. OkinawaRail VM バイトコード仕様（v0.1）

6.1 VMモデル
	•	スタックマシン（16bit）
	•	変数領域：vars[32]

⸻

6.2 命令セット

opcode	命令	意味
01	PUSH8 imm8	即値push
02	PUSH16 imm16	即値push
10	ADD	加算
11	SUB	減算
12	MUL	乗算
13	DIV	除算
20	LOAD slot	変数読込
21	STORE slot	変数格納
24	LT	<
25	GT	>
26	EQ	==
30	JMP addr	無条件ジャンプ
31	JZ addr	0ならジャンプ
40	PRINTU	数値出力
FF	HALT	停止


⸻

6.3 DIV のゼロ除算（v0.1 規定）
	•	除数が 0 の場合：
	1.	エラーメッセージを表示
	2.	HALT で即停止

⸻

7. コンパイル規約
	•	式はスタック評価
	•	代入：expr → STORE slot
	•	分岐・ループは JZ / JMP によるジャンプパッチ方式
	•	比較は 1 回まで（1 < 2 < 3 は構文エラー）

⸻

8. CLI 仕様

8.1 higashi

higashi new <app>
higashi build
higashi run   # 将来


⸻

8.2 YanbaruKwina2OkinawaRail

YanbaruKwina2OkinawaRail input.ykw -o output.okr

教材向けオプション（予定）：
	•	--tokens
	•	--ast
	•	--bc

⸻

8.3 OkinawaRail VM

ovm program.okr

	•	マジックが OKR1 でなければエラー終了

⸻

9. 動作確認基準（v0.1）

Hello

naku(1 + 2)

出力：

3

Loop

i = 0
aruku (i < 5) {
  naku(i)
  i = i + 1
}

If-chain

x = 7
moshi (x < 0) { naku(0) }
mata (x < 10) { naku(1) }
hoka { naku(2) }


⸻

10. まとめ（思想）
	•	YanbaruKwina：書く言語（ローカルな名前）
	•	OkinawaRail：走るときの名前（英語名）
	•	VM が主役、言語は入口
	•	小さく・透明に・学べる

