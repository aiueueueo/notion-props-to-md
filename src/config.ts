import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Config, DatabaseConfig, LegacyConfig } from './types';

// 設定ファイルのパス
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

// 旧形式の設定かどうかを判定
function isLegacyConfig(config: unknown): config is LegacyConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'databaseId' in config &&
    !('databases' in config)
  );
}

// 旧形式の設定を新形式に変換
function convertLegacyConfig(legacy: LegacyConfig): Config {
  return {
    databases: [
      {
        name: 'デフォルト',
        databaseId: legacy.databaseId,
        outputDir: legacy.outputDir,
        imageDir: legacy.imageDir,
        excludeProperties: legacy.excludeProperties,
        propertyOrder: legacy.propertyOrder,
        customProperties: legacy.customProperties,
        propertyNameMap: legacy.propertyNameMap,
        propertyValueAdditions: legacy.propertyValueAdditions,
      },
    ],
  };
}

// データベース設定にデフォルト値を適用
function applyDefaults(db: DatabaseConfig): DatabaseConfig {
  return {
    ...db,
    imageDir: db.imageDir || path.join(db.outputDir, 'images'),
    excludeProperties: db.excludeProperties || [],
    propertyOrder: db.propertyOrder || [],
    customProperties: db.customProperties || [],
    propertyNameMap: db.propertyNameMap || {},
    propertyValueAdditions: db.propertyValueAdditions || {},
  };
}

// 設定ファイルを読み込む
export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    throw new Error(
      `設定ファイルが見つかりません: ${CONFIG_FILE_PATH}\n` +
      'config.json を作成してください。'
    );
  }

  const configText = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(configText);
  } catch (error) {
    throw new Error(
      `設定ファイルの解析に失敗しました: ${CONFIG_FILE_PATH}\n` +
      'JSONの形式を確認してください。'
    );
  }

  // 旧形式の設定を新形式に変換
  let config: Config;
  if (isLegacyConfig(rawConfig)) {
    config = convertLegacyConfig(rawConfig);
  } else {
    config = rawConfig as Config;
  }

  // databases配列のチェック
  if (!config.databases || config.databases.length === 0) {
    throw new Error('設定ファイルに databases が指定されていません。');
  }

  // 各データベース設定のバリデーションとデフォルト値適用
  config.databases = config.databases.map((db, index) => {
    if (!db.name) {
      throw new Error(`databases[${index}] に name が指定されていません。`);
    }
    if (!db.databaseId) {
      throw new Error(`databases[${index}] (${db.name}) に databaseId が指定されていません。`);
    }
    if (!db.outputDir) {
      throw new Error(`databases[${index}] (${db.name}) に outputDir が指定されていません。`);
    }
    return applyDefaults(db);
  });

  return config;
}

// 名前でデータベース設定を取得
export function getDatabaseByName(config: Config, name: string): DatabaseConfig | undefined {
  return config.databases.find((db) => db.name === name);
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
