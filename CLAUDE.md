# Notion2Obsidian 仕様書

## 概要

NotionデータベースのページプロパティをObsidian向けのマークダウンファイル（YAMLフロントマター形式）としてエクスポートするCLIツール。

## 技術スタック

- **言語**: Node.js / TypeScript
- **Notion SDK**: `@notionhq/client`（公式）
- **実行環境**: ローカル

## 機能要件

### 入力

- 指定したNotionデータベースからページを取得
- 各ページの全プロパティを取得

#### ページ指定方法

2つのモードを併用可能：

**1. コマンドライン引数モード**

```bash
# タイトル完全一致
npm run start -- --title "会議メモ"

# タイトル部分一致
npm run start -- --contains "議事録"

# 全ページ出力
npm run start -- --all
```

**2. 対話モード（引数なしで実行）**

```bash
npm run start
```

```
? 検索方法を選択してください:
  ❯ タイトル完全一致
    タイトル部分一致
    全ページ出力

? キーワードを入力: 会議

→ 3件見つかりました:
  1. 会議メモ 2024/01/15
  2. 会議メモ 2024/01/20
  3. 週次会議

? 出力しますか？ (Y/n): y
```

対話モードでは出力前に確認できるため、意図しないページの出力を防げる。

#### 複数ヒット時の動作

- **部分一致で複数ヒット**: 条件に合う全てのページを出力
- **同名ページが複数存在**: 連番をつけて全て出力
  - 例：`会議メモ.md`、`会議メモ_2.md`、`会議メモ_3.md`

### 出力

- 各Notionページにつき1つのマークダウンファイルを生成
- プロパティはYAMLフロントマター形式で出力

#### 出力例

```markdown
---
タグ:
  - 日記
  - 仕事
ステータス: 完了
作成日: 2024-01-15
優先度: 3
完了: true
URL: https://example.com
メモ: これはサンプルです
---
```

### 対応プロパティ型

| Notionプロパティ型 | YAML出力形式 |
|-------------------|-------------|
| title | 文字列（ファイル名にも使用） |
| multi_select | 配列 |
| select | 文字列 |
| rich_text | 文字列 |
| date | 文字列（ISO形式） |
| checkbox | boolean |
| number | 数値 |
| url | 文字列 |
| email | 文字列 |
| phone_number | 文字列 |
| created_time | 文字列（ISO形式） |
| last_edited_time | 文字列（ISO形式） |
| created_by | 文字列（ユーザー名） |
| last_edited_by | 文字列（ユーザー名） |
| relation | 配列（関連ページのタイトル） |
| formula | 計算結果の値 |
| rollup | 集計結果の値 |
| files | 配列（ローカルパス）※画像はダウンロードして保存 |
| status | 文字列 |

※ 将来的に除外設定を追加予定

## ファイル命名規則

- Notionページのタイトルをファイル名として使用
- ファイル名に使用できない文字は以下のように置換：
  - `/` → `-`
  - `\` → `-`
  - `:` → `-`
  - `*` → `-`
  - `?` → `-`
  - `"` → `-`
  - `<` → `-`
  - `>` → `-`
  - `|` → `-`

## 設定ファイル

### 設定ファイル名: `config.json`

```json
{
  "databaseId": "your-notion-database-id",
  "outputDir": "./output",
  "imageDir": "./output/attachments",
  "excludeProperties": []
}
```

| 項目 | 説明 | 必須 |
|-----|------|-----|
| databaseId | 対象のNotionデータベースID | Yes |
| outputDir | マークダウンファイルの出力先ディレクトリ | Yes |
| imageDir | 画像ファイルの保存先ディレクトリ | No |
| excludeProperties | 出力から除外するプロパティ名の配列 | No |

※ `imageDir`未指定の場合は`outputDir/images`に保存
※ ページの指定は設定ファイルではなく、コマンドライン引数または対話モードで行う

## 環境変数

### `.env` ファイル

```
NOTION_API_KEY=your-notion-api-key
```

## 動作仕様

### 空のプロパティの扱い

- 空の値として出力する
- 例：`タグ: []`、`メモ: ""`

### 既存ファイルの扱い

- 同名ファイルが存在する場合は上書きする

### エラー時の動作

- エラーメッセージを表示して終了する
- 例: API接続失敗、ページ取得失敗、ファイル書き込み失敗など

### ログ出力

**通常モード（デフォルト）**
```
Notion2Obsidian を開始します...

[1/3] 会議メモ.md を出力中...
[2/3] プロジェクト計画.md を出力中...
[3/3] 議事録.md を出力中...

完了: 3ファイルを出力しました
```

**詳細モード（`--verbose`オプション）**
```
Notion2Obsidian を開始します...
[DEBUG] config.json を読み込み中...
[DEBUG] Notion API に接続中...
[DEBUG] データベース abc123 からページを取得中...
[DEBUG] 3件のページを取得しました

[1/3] 会議メモ.md を出力中...
  [DEBUG] プロパティ 'タグ' (multi_select): ["会議", "重要"]
  [DEBUG] 画像をダウンロード中: https://s3.amazonaws.com/...
...
```

### 日本語対応

- プロパティ名、プロパティ値ともに日本語に対応
- ファイル名も日本語対応

### 画像ファイルの処理

- `files`プロパティに含まれる画像はローカルにダウンロード
- 保存先は`imageDir`で指定（未指定なら`outputDir/images`）
- ファイル名: `{ページタイトル}_{連番}.{拡張子}`
  - 例: `会議メモ_1.png`, `会議メモ_2.jpg`
- 対応形式: png, jpg, jpeg, gif, webp, svg, pdf

#### 出力形式

フロントマターにパス情報を記載し、本文にも画像を埋め込む。
パスは設定ファイルの`imageDir`で指定した場所への相対パスになる。

**設定例：**
```json
{
  "outputDir": "./notes",
  "imageDir": "./02_Extra"
}
```

**出力されるマークダウン：**
```markdown
---
タグ:
  - 会議
添付画像:
  - ../02_Extra/会議メモ_1.png
  - ../02_Extra/会議メモ_2.png
---

![添付画像_1](../02_Extra/会議メモ_1.png)

![添付画像_2](../02_Extra/会議メモ_2.png)
```

- パスは`outputDir`から`imageDir`への相対パスを自動計算
- フロントマター: パス情報を保持（後処理やスクリプト連携用）
- 本文: Obsidianで画像が直接表示される

## プロジェクト構成（予定）

```
Notion2Obsidian/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── notion.ts         # Notion API操作
│   ├── converter.ts      # プロパティ→YAML変換
│   ├── writer.ts         # ファイル出力
│   ├── prompt.ts         # 対話モード処理
│   └── types.ts          # 型定義
├── config.json           # 設定ファイル
├── .env                  # 環境変数（Git管理外）
├── .env.example          # 環境変数のテンプレート
├── package.json
├── tsconfig.json
└── CLAUDE.md             # この仕様書
```

## 使用方法

```bash
# 依存関係のインストール
npm install

# 対話モードで実行（おすすめ）
npm run start

# タイトル完全一致で指定
npm run start -- --title "会議メモ"

# タイトル部分一致で指定
npm run start -- --contains "議事録"

# 全ページ出力
npm run start -- --all

# 詳細ログを表示
npm run start -- --verbose
```

### コマンドラインオプション一覧

| オプション | 説明 |
|-----------|------|
| `--title "タイトル"` | タイトル完全一致で指定 |
| `--contains "キーワード"` | タイトル部分一致で指定 |
| `--all` | 全ページを出力 |
| `--verbose` | 詳細ログを表示 |

## 今後の拡張予定

- [ ] 除外プロパティの設定機能
- [ ] ドライラン機能（実際に出力せず確認のみ）
- [ ] 差分更新機能（変更があったページのみ更新）
- [ ] ログ出力機能
