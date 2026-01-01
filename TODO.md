# Notion2Obsidian 実装計画

## フェーズ1: プロジェクトセットアップ

- [x] package.json の作成
- [x] TypeScript設定（tsconfig.json）
- [x] 必要なパッケージのインストール
  - `@notionhq/client` (Notion公式SDK)
  - `dotenv` (環境変数読み込み)
  - `commander` (コマンドライン引数処理)
  - `inquirer` (対話モード)
  - `yaml` (YAML出力)
  - `typescript`, `ts-node`, `@types/node` (開発用)
- [x] ディレクトリ構成の作成（src/）
- [x] .env.example の作成
- [x] .gitignore の作成

## フェーズ2: 基盤実装

- [x] 型定義ファイルの作成（src/types.ts）
  - Config型
  - NotionPage型
  - PropertyValue型
- [x] 設定ファイル読み込み処理（config.json）
- [x] 環境変数読み込み処理（.env）
- [x] ログ出力ユーティリティの作成
  - 通常モード（進捗表示）
  - 詳細モード（--verbose）

## フェーズ3: Notion API連携

- [x] Notionクライアント初期化（src/notion.ts）
- [x] データベースからページ一覧取得
- [x] タイトル完全一致フィルタリング
- [x] タイトル部分一致フィルタリング
- [x] ページプロパティの取得

## フェーズ4: コマンドライン・対話モード

- [x] コマンドライン引数の処理（src/index.ts）
  - `--title`
  - `--contains`
  - `--all`
  - `--verbose`
- [x] 対話モードの実装（src/prompt.ts）
  - 検索方法の選択
  - キーワード入力
  - 検索結果の表示
  - 出力確認

## フェーズ5: プロパティ変換

- [x] プロパティ変換処理の実装（src/converter.ts）
  - title → 文字列
  - multi_select → 配列
  - select → 文字列
  - rich_text → 文字列
  - date → 文字列（ISO形式）
  - checkbox → boolean
  - number → 数値
  - url → 文字列
  - email → 文字列
  - phone_number → 文字列
  - created_time → 文字列
  - last_edited_time → 文字列
  - created_by → 文字列
  - last_edited_by → 文字列
  - relation → 配列
  - formula → 計算結果
  - rollup → 集計結果
  - files → 配列（ローカルパス）
  - status → 文字列
  - people → 配列（追加）
  - unique_id → 文字列（追加）

## フェーズ6: 画像処理

- [x] 画像ダウンロード処理の実装
- [x] ファイル名生成（{ページタイトル}_{連番}.{拡張子}）
- [x] 禁止文字の置換
- [x] 相対パスの計算（outputDir → imageDir）

## フェーズ7: ファイル出力

- [x] マークダウンファイル出力処理（src/writer.ts）
- [x] YAMLフロントマター生成
- [x] 画像埋め込み（本文）
- [x] ファイル名の禁止文字置換
- [x] 同名ファイルの連番処理
- [x] 出力ディレクトリの自動作成

## フェーズ8: 統合・テスト

- [x] エントリーポイントの統合（src/index.ts）
- [x] エラーハンドリングの実装
- [ ] 実際のNotionデータベースでテスト
- [ ] エッジケースのテスト
  - 空のプロパティ
  - 日本語タイトル
  - 画像なしページ
  - 同名ページ

## フェーズ9: 仕上げ

- [x] READMEの作成（使用方法・セットアップ手順）
- [x] npm scriptsの設定（start, build）
- [x] 最終動作確認
