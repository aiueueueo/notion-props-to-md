// 設定画面のWebサーバー

import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import open from 'open';
import { loadEnv } from './config';
import * as notion from './notion';
import { DatabaseConfig } from './types';

const PORT = 3456;

// プロパティ情報の型
interface PropertyInfo {
  name: string;
  type: string;
  enabled: boolean;
  outputName: string;
  additionValue: string;
}

// カスタムプロパティの型
interface CustomPropertyInfo {
  name: string;
  value: string | string[] | number | boolean;
}

// データベース情報の型
interface DatabaseInfo {
  name: string;
  databaseId: string;
  outputDir: string;
  imageDir: string;
}

// 設定ファイルのパス
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

// 設定ファイルを読み込む（生のJSON）
function readConfigFile(): Record<string, unknown> {
  const configText = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
  return JSON.parse(configText);
}

// 設定ファイルを書き込む
function writeConfigFile(config: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// 旧形式の設定かどうかを判定
function isLegacyConfig(config: Record<string, unknown>): boolean {
  return 'databaseId' in config && !('databases' in config);
}

// 旧形式の設定を新形式に変換
function convertLegacyConfig(legacy: Record<string, unknown>): Record<string, unknown> {
  return {
    databases: [
      {
        name: 'デフォルト',
        databaseId: legacy.databaseId,
        outputDir: legacy.outputDir,
        imageDir: legacy.imageDir,
        excludeProperties: legacy.excludeProperties || [],
        propertyOrder: legacy.propertyOrder || [],
        customProperties: legacy.customProperties || [],
        propertyNameMap: legacy.propertyNameMap || {},
        propertyValueAdditions: legacy.propertyValueAdditions || {},
      },
    ],
  };
}

// サーバーを起動
export async function startConfigServer(): Promise<void> {
  const app = express();

  // JSONボディのパース
  app.use(express.json());

  // 静的ファイルの配信
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // データベース一覧を取得するAPI
  app.get('/api/databases', (req, res) => {
    try {
      let config = readConfigFile();

      // 旧形式の場合は新形式に変換
      if (isLegacyConfig(config)) {
        config = convertLegacyConfig(config);
      }

      const databases = config.databases as DatabaseConfig[];
      const dbList: DatabaseInfo[] = databases.map((db) => ({
        name: db.name,
        databaseId: db.databaseId,
        outputDir: db.outputDir,
        imageDir: db.imageDir || path.join(db.outputDir, 'images'),
      }));

      res.json({ databases: dbList });
    } catch (error) {
      console.error('データベース一覧取得エラー:', error);
      res.json({ error: error instanceof Error ? error.message : '不明なエラー' });
    }
  });

  // プロパティ一覧を取得するAPI
  app.get('/api/properties', async (req, res) => {
    try {
      const dbName = req.query.db as string;
      if (!dbName) {
        res.json({ error: 'データベース名が指定されていません' });
        return;
      }

      let config = readConfigFile();

      // 旧形式の場合は新形式に変換
      if (isLegacyConfig(config)) {
        config = convertLegacyConfig(config);
      }

      const databases = config.databases as DatabaseConfig[];
      const dbConfig = databases.find((db) => db.name === dbName);

      if (!dbConfig) {
        res.json({ error: `データベース「${dbName}」が見つかりません` });
        return;
      }

      // 環境変数を読み込み
      const apiKey = loadEnv();

      // Notionクライアントを初期化
      notion.initializeClient(apiKey);

      // データベースのスキーマからプロパティ一覧を取得（高速）
      const schema = await notion.getDatabaseSchema(dbConfig.databaseId);

      if (schema.length === 0) {
        res.json({ error: 'データベースにプロパティがありません' });
        return;
      }

      // 現在の設定を取得
      const propertyOrder: string[] = dbConfig.propertyOrder || [];
      const excludeProperties: string[] = dbConfig.excludeProperties || [];
      const customProperties: CustomPropertyInfo[] = (dbConfig.customProperties as CustomPropertyInfo[]) || [];
      const propertyNameMap: Record<string, string> = dbConfig.propertyNameMap || {};
      const propertyValueAdditions: Record<string, unknown> = dbConfig.propertyValueAdditions || {};

      // 追加値を文字列に変換（配列はカンマ区切り）
      const formatAdditionValue = (value: unknown): string => {
        if (value === undefined || value === null) return '';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
      };

      // プロパティ情報を作成
      const allProperties: PropertyInfo[] = schema.map((prop) => {
        return {
          name: prop.name,
          type: prop.type,
          enabled: !excludeProperties.includes(prop.name),
          outputName: propertyNameMap[prop.name] || '',
          additionValue: formatAdditionValue(propertyValueAdditions[prop.name]),
        };
      });

      // 順序を適用（設定に保存されている順序を優先）
      const orderedProperties: PropertyInfo[] = [];

      // まず保存されている順序のプロパティを追加
      for (const name of propertyOrder) {
        const prop = allProperties.find((p) => p.name === name);
        if (prop) {
          orderedProperties.push(prop);
        }
      }

      // 残りのプロパティを追加
      for (const prop of allProperties) {
        if (!orderedProperties.find((p) => p.name === prop.name)) {
          orderedProperties.push(prop);
        }
      }

      res.json({ properties: orderedProperties, customProperties });
    } catch (error) {
      console.error('プロパティ取得エラー:', error);
      res.json({ error: error instanceof Error ? error.message : '不明なエラー' });
    }
  });

  // 設定を保存するAPI
  app.post('/api/config', (req, res) => {
    try {
      const { dbName, properties, customProperties } = req.body as {
        dbName: string;
        properties: PropertyInfo[];
        customProperties: CustomPropertyInfo[];
      };

      if (!dbName) {
        res.json({ success: false, error: 'データベース名が指定されていません' });
        return;
      }

      let config = readConfigFile();

      // 旧形式の場合は新形式に変換して保存
      if (isLegacyConfig(config)) {
        config = convertLegacyConfig(config);
      }

      const databases = config.databases as DatabaseConfig[];
      const dbIndex = databases.findIndex((db) => db.name === dbName);

      if (dbIndex === -1) {
        res.json({ success: false, error: `データベース「${dbName}」が見つかりません` });
        return;
      }

      // プロパティの順序を保存（Notionプロパティ + カスタムプロパティ）
      databases[dbIndex].propertyOrder = [
        ...properties.map((p) => p.name),
        ...customProperties.map((p) => p.name),
      ];

      // 除外プロパティを保存
      databases[dbIndex].excludeProperties = properties
        .filter((p) => !p.enabled)
        .map((p) => p.name);

      // プロパティ名マッピングを保存（空でないもののみ）
      const nameMap: Record<string, string> = {};
      for (const prop of properties) {
        if (prop.outputName && prop.outputName.trim() !== '') {
          nameMap[prop.name] = prop.outputName.trim();
        }
      }
      databases[dbIndex].propertyNameMap = nameMap;

      // 追加値を保存（空でないもののみ）
      const valueAdditions: Record<string, string | string[] | number | boolean> = {};
      for (const prop of properties) {
        if (prop.additionValue && prop.additionValue.trim() !== '') {
          const trimmed = prop.additionValue.trim();
          // カンマ区切りは配列に変換
          if (trimmed.includes(',')) {
            valueAdditions[prop.name] = trimmed.split(',').map((v) => v.trim()).filter((v) => v);
          } else if (trimmed === 'true') {
            valueAdditions[prop.name] = true;
          } else if (trimmed === 'false') {
            valueAdditions[prop.name] = false;
          } else if (!isNaN(Number(trimmed)) && trimmed !== '') {
            valueAdditions[prop.name] = Number(trimmed);
          } else {
            valueAdditions[prop.name] = trimmed;
          }
        }
      }
      databases[dbIndex].propertyValueAdditions = valueAdditions;

      // カスタムプロパティを保存
      databases[dbIndex].customProperties = customProperties;

      // 設定ファイルを書き込む
      config.databases = databases;
      writeConfigFile(config);

      res.json({ success: true });
    } catch (error) {
      console.error('設定保存エラー:', error);
      res.json({ success: false, error: error instanceof Error ? error.message : '不明なエラー' });
    }
  });

  // サーバーを起動
  app.listen(PORT, () => {
    console.log(`設定画面を開いています... http://localhost:${PORT}`);
    console.log('終了するには Ctrl+C を押してください\n');

    // ブラウザを開く
    open(`http://localhost:${PORT}`);
  });
}

// メイン処理
startConfigServer().catch((error) => {
  console.error('サーバー起動エラー:', error);
  process.exit(1);
});
