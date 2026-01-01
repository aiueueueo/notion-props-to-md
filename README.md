# Notion2Obsidian

NotionデータベースのページプロパティをObsidian向けのマークダウンファイル（YAMLフロントマター形式）としてエクスポートするCLIツール。

## 機能

- Notionデータベースからページを取得
- 全プロパティをYAMLフロントマター形式で出力
- 画像ファイルをローカルにダウンロード
- 対話モードとコマンドライン引数モードの両方をサポート
- タイトル完全一致・部分一致による絞り込み

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Notion APIキーの取得

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「新しいインテグレーション」を作成
3. 「Internal Integration Token」をコピー

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして、APIキーを設定：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```
NOTION_API_KEY=your-notion-api-key
```

### 4. データベースの共有設定

1. Notionでエクスポートしたいデータベースを開く
2. 右上の「...」→「コネクト」→ 作成したインテグレーションを選択

### 5. 設定ファイルの編集

`config.json` を編集：

```json
{
  "databaseId": "your-database-id",
  "outputDir": "./output",
  "imageDir": "./output/images",
  "excludeProperties": []
}
```

**データベースIDの取得方法：**
- データベースのURLから取得: `https://www.notion.so/xxxxx?v=yyyyy`
- `xxxxx` の部分（32文字）がデータベースID

## 使用方法

### 対話モード（推奨）

```bash
npm run start
```

対話形式で検索方法を選択し、出力前に確認できます。

### コマンドライン引数モード

```bash
# タイトル完全一致
npm run start -- --title "会議メモ"

# タイトル部分一致
npm run start -- --contains "議事録"

# 全ページ出力
npm run start -- --all

# 詳細ログを表示
npm run start -- --verbose
```

### コマンドラインオプション

| オプション | 説明 |
|-----------|------|
| `--title <title>` | タイトル完全一致で指定 |
| `--contains <keyword>` | タイトル部分一致で指定 |
| `--all` | 全ページを出力 |
| `--verbose` | 詳細ログを表示 |
| `-h, --help` | ヘルプを表示 |
| `-V, --version` | バージョンを表示 |

## 出力形式

```markdown
---
タイトル: "会議メモ 2024/01/15"
タグ:
  - "会議"
  - "重要"
ステータス: "完了"
作成日: "2024-01-15"
添付画像:
  - "../images/会議メモ_1.png"
---

![添付画像_1](../images/会議メモ_1.png)
```

## 対応プロパティ

| Notionプロパティ型 | 出力形式 |
|-------------------|---------|
| title | 文字列 |
| rich_text | 文字列 |
| number | 数値 |
| select | 文字列 |
| multi_select | 配列 |
| status | 文字列 |
| date | 文字列 |
| checkbox | boolean |
| url | 文字列 |
| email | 文字列 |
| phone_number | 文字列 |
| created_time | 文字列（ISO形式） |
| last_edited_time | 文字列（ISO形式） |
| created_by | 文字列 |
| last_edited_by | 文字列 |
| relation | 配列 |
| formula | 計算結果 |
| rollup | 集計結果 |
| files | 配列（ローカルパス） |
| people | 配列 |
| unique_id | 文字列 |

## 設定ファイル

### config.json

| 項目 | 説明 | 必須 |
|-----|------|-----|
| databaseId | NotionデータベースID | Yes |
| outputDir | マークダウン出力先 | Yes |
| imageDir | 画像保存先 | No（デフォルト: outputDir/images） |
| excludeProperties | 除外するプロパティ名 | No |

## 開発

```bash
# 型チェック
npm run typecheck

# ビルド
npm run build
```

## ライセンス

MIT
