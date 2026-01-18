# ドキュメント一覧

やんばるくいな言語プロジェクトのドキュメントガイドです。目的に応じて適切なドキュメントを参照してください。

---

## クイックリファレンス

| やりたいこと | 読むべきドキュメント |
|-------------|---------------------|
| プロジェクトの概要を知りたい | [chatgpt_doc.md](#chatgpt_docmd) |
| ビルド・実行方法を知りたい | [project_structure.md](#project_structuremd) |
| コードの仕組みを理解したい | [compiler_architecture.md](#compiler_architecturemd) |
| 言語の文法を知りたい | [definition.md](#definitionmd) |
| Zigの書き方を学びたい | [zig_learning.md](#zig_learningmd) |

---

## ドキュメント詳細

### chatgpt_doc.md
**言語全体のコンセプトと仕様書**

- 言語の目的・設計思想
- 全体アーキテクチャ（YanbaruKwina → OkinawaRail VM）
- 命名規則・コマンド体系
- Z80/VM での実行フロー

**こんな時に読む:**
- プロジェクトに初めて参加する時
- 言語の設計意図を確認したい時
- 全体像を把握したい時

---

### definition.md
**言語の厳密な定義書**

- 語彙仕様（コメント、識別子、リテラル）
- 構文規則（EBNF による文法定義）
- 予約語一覧
- 各構文の詳細な動作

**こんな時に読む:**
- Lexer/Parser を実装・修正する時
- 新しい構文を追加する時
- 言語仕様を正確に確認したい時

---

### project_structure.md
**プロジェクト構成と実行方法**

- ディレクトリ構成
- ビルド・実行・テストのコマンド
- 各ファイルの概要説明
- 言語構文の使用例

**こんな時に読む:**
- 開発環境をセットアップする時
- ビルド方法を確認したい時
- ファイルの役割を知りたい時

---

### compiler_architecture.md
**コンパイラ内部の詳細解説**

- 処理フロー（Lexer → Parser → AST → VM）
- 各コンポーネントの役割と実装詳細
- コード例と対応するデータ構造
- スタック操作の図解

**こんな時に読む:**
- コードを読み解きたい時
- 新機能を実装する時
- バグを調査する時
- コンパイラの仕組みを学びたい時

---

### zig_learning.md
**Zig言語の入門ガイド**

- 変数と定数
- 構造体と関数
- エラーハンドリング
- メモリ管理

**こんな時に読む:**
- Zigを初めて触る時
- Zigの文法を確認したい時
- 実装中にZigの書き方がわからなくなった時

---

## 開発フェーズ別おすすめ

### 1. プロジェクトを理解する
1. [chatgpt_doc.md](#chatgpt_docmd) - 全体像を把握
2. [project_structure.md](#project_structuremd) - 構成を理解
3. [compiler_architecture.md](#compiler_architecturemd) - 内部構造を学ぶ

### 2. 開発に参加する
1. [zig_learning.md](#zig_learningmd) - Zigの基礎を学ぶ
2. [definition.md](#definitionmd) - 言語仕様を確認
3. [compiler_architecture.md](#compiler_architecturemd) - 実装詳細を参照

### 3. 新機能を追加する
1. [definition.md](#definitionmd) - 文法を定義
2. [compiler_architecture.md](#compiler_architecturemd) - 影響範囲を確認
3. 各ソースファイルを修正

---

## ファイル一覧

| ファイル名 | 説明 | 対象読者 |
|-----------|------|---------|
| `chatgpt_doc.md` | 言語コンセプト・仕様書 | 全員 |
| `definition.md` | 言語定義（文法・構文） | 開発者 |
| `project_structure.md` | プロジェクト構成・実行方法 | 全員 |
| `compiler_architecture.md` | コンパイラ内部構造 | 開発者 |
| `zig_learning.md` | Zig言語入門 | Zig初心者 |
| `README.md` | 本ドキュメント | 全員 |
