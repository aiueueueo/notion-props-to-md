// Notion2Obsidian エントリーポイント

import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { loadConfig, loadEnv } from './config';
import * as logger from './logger';
import * as notion from './notion';
import { createProgram, parseOptions, getSearchConditionFromOptions, hasSearchOptions } from './cli';
import { getSearchConditionInteractive, confirmPages } from './prompt';
import { convertPageProperties, getPageTitle } from './converter';
import { downloadImages, updateImagePaths } from './downloader';
import { outputPage, OutputResult } from './writer';
import { SearchCondition, Config } from './types';

// ページを処理してマークダウンファイルを出力
async function processPage(
  page: PageObjectResponse,
  config: Config,
  current: number,
  total: number
): Promise<OutputResult> {
  const title = getPageTitle(page);
  logger.progress(current, total, `${title}.md を出力中...`);

  // プロパティを変換
  const { properties, files } = convertPageProperties(
    page,
    config.excludeProperties,
    config.propertyOrder,
    config.propertyNameMap,
    config.propertyValueAdditions
  );

  // 画像情報を更新（ローカルパスを設定）
  const images = updateImagePaths(files, title, config.imageDir!);

  // 画像をダウンロード
  const downloadedImages = await downloadImages(images, config.imageDir!);

  // マークダウンファイルを出力
  const filePath = outputPage(
    title,
    properties,
    downloadedImages,
    config.outputDir,
    config.imageDir!,
    config.customProperties || []
  );

  return {
    filePath,
    title,
    imageCount: downloadedImages.length,
  };
}

// メイン処理
async function main(): Promise<void> {
  try {
    // コマンドライン引数の解析
    const program = createProgram();
    program.parse();
    const options = parseOptions(program);

    // --verbose オプションの処理
    if (options.verbose) {
      logger.setLogLevel('verbose');
    }

    logger.start();

    // 設定ファイル読み込み
    logger.debug('config.json を読み込み中...');
    const config = loadConfig();
    logger.debug(`databaseId: ${config.databaseId}`);
    logger.debug(`outputDir: ${config.outputDir}`);
    logger.debug(`imageDir: ${config.imageDir}`);

    // 環境変数読み込み
    logger.debug('.env を読み込み中...');
    const apiKey = loadEnv();
    logger.debug('Notion API キーを取得しました');

    // Notionクライアント初期化
    logger.debug('Notion API に接続中...');
    notion.initializeClient(apiKey);

    // 検索条件の取得
    let condition: SearchCondition | null = null;

    if (hasSearchOptions(options)) {
      // コマンドライン引数から検索条件を取得
      condition = getSearchConditionFromOptions(options);
    } else {
      // 対話モードで検索条件を取得
      condition = await getSearchConditionInteractive();
    }

    if (!condition) {
      logger.log('キャンセルしました');
      return;
    }

    logger.debug(`検索モード: ${condition.mode}`);
    if (condition.keyword) {
      logger.debug(`キーワード: ${condition.keyword}`);
    }

    // ページを取得
    const pages = await notion.getPages(config.databaseId, condition);
    const summaries = notion.getPageSummaries(pages);

    // ページが見つからない場合
    if (pages.length === 0) {
      logger.log('該当するページが見つかりませんでした');
      return;
    }

    // 対話モードの場合は確認を求める
    if (!hasSearchOptions(options)) {
      const confirmed = await confirmPages(summaries);
      if (!confirmed) {
        logger.log('キャンセルしました');
        return;
      }
    } else {
      // コマンドライン引数の場合はページ一覧を表示
      logger.log(`${summaries.length}件のページが見つかりました`);
    }

    console.log(''); // 空行

    // 各ページを処理
    const results: OutputResult[] = [];
    for (let i = 0; i < pages.length; i++) {
      try {
        const result = await processPage(pages[i], config, i + 1, pages.length);
        results.push(result);
      } catch (err) {
        const title = getPageTitle(pages[i]);
        if (err instanceof Error) {
          logger.error(`ページ「${title}」の処理中にエラーが発生しました: ${err.message}`);
        } else {
          logger.error(`ページ「${title}」の処理中にエラーが発生しました`);
        }
        // エラーが発生しても続行
      }
    }

    // 完了メッセージ
    logger.complete(results.length);

    // 詳細モードの場合は結果を表示
    if (options.verbose && results.length > 0) {
      console.log('\n出力されたファイル:');
      for (const result of results) {
        const imageInfo = result.imageCount > 0 ? ` (画像: ${result.imageCount}枚)` : '';
        console.log(`  - ${result.filePath}${imageInfo}`);
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message);
    } else {
      logger.error('予期しないエラーが発生しました');
    }
    process.exit(1);
  }
}

main();
