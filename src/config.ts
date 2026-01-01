import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Config } from './types';

// 設定ファイルのパス
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

// 設定ファイルを読み込む
export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    throw new Error(
      `設定ファイルが見つかりません: ${CONFIG_FILE_PATH}\n` +
      'config.json を作成してください。'
    );
  }

  const configText = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');

  let config: Config;
  try {
    config = JSON.parse(configText);
  } catch (error) {
    throw new Error(
      `設定ファイルの解析に失敗しました: ${CONFIG_FILE_PATH}\n` +
      'JSONの形式を確認してください。'
    );
  }

  // 必須項目のチェック
  if (!config.databaseId) {
    throw new Error('設定ファイルに databaseId が指定されていません。');
  }
  if (!config.outputDir) {
    throw new Error('設定ファイルに outputDir が指定されていません。');
  }

  // デフォルト値の設定
  if (!config.imageDir) {
    config.imageDir = path.join(config.outputDir, 'images');
  }
  if (!config.excludeProperties) {
    config.excludeProperties = [];
  }
  if (!config.propertyOrder) {
    config.propertyOrder = [];
  }
  if (!config.customProperties) {
    config.customProperties = [];
  }

  return config;
}

// 環境変数を読み込む
export function loadEnv(): string {
  // .envファイルを読み込む
  dotenv.config();

  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error(
      '環境変数 NOTION_API_KEY が設定されていません。\n' +
      '.env ファイルを作成するか、環境変数を設定してください。'
    );
  }

  return apiKey;
}
