// 設定画面のWebサーバー

import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import open from 'open';
import { loadConfig, loadEnv } from './config';
import * as notion from './notion';

const PORT = 3456;

// プロパティ情報の型
interface PropertyInfo {
  name: string;
  type: string;
  enabled: boolean;
  outputName: string;
}

// カスタムプロパティの型
interface CustomPropertyInfo {
  name: string;
  value: string | string[] | number | boolean;
}

// 設定ファイルのパス
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

// 設定ファイルを読み込む
function readConfigFile(): Record<string, unknown> {
  const configText = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
  return JSON.parse(configText);
}

// 設定ファイルを書き込む
function writeConfigFile(config: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// サーバーを起動
export async function startConfigServer(): Promise<void> {
  const app = express();

  // JSONボディのパース
  app.use(express.json());

  // 静的ファイルの配信
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // プロパティ一覧を取得するAPI
  app.get('/api/properties', async (req, res) => {
    try {
      // 設定を読み込み
      const config = loadConfig();
      const apiKey = loadEnv();

      // Notionクライアントを初期化
      notion.initializeClient(apiKey);

      // データベースのスキーマからプロパティ一覧を取得（高速）
      const schema = await notion.getDatabaseSchema(config.databaseId);

      if (schema.length === 0) {
        res.json({ error: 'データベースにプロパティがありません' });
        return;
      }

      // 現在の設定を読み込む
      const currentConfig = readConfigFile();
      const propertyOrder: string[] = (currentConfig.propertyOrder as string[]) || [];
      const excludeProperties: string[] = (currentConfig.excludeProperties as string[]) || [];
      const customProperties: CustomPropertyInfo[] = (currentConfig.customProperties as CustomPropertyInfo[]) || [];
      const propertyNameMap: Record<string, string> = (currentConfig.propertyNameMap as Record<string, string>) || {};

      // プロパティ情報を作成
      const allProperties: PropertyInfo[] = schema.map((prop) => {
        return {
          name: prop.name,
          type: prop.type,
          enabled: !excludeProperties.includes(prop.name),
          outputName: propertyNameMap[prop.name] || '',
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
      const { properties, customProperties } = req.body as {
        properties: PropertyInfo[];
        customProperties: CustomPropertyInfo[];
      };

      // 現在の設定を読み込む
      const config = readConfigFile();

      // プロパティの順序を保存（Notionプロパティ + カスタムプロパティ）
      config.propertyOrder = [
        ...properties.map((p) => p.name),
        ...customProperties.map((p) => p.name),
      ];

      // 除外プロパティを保存
      config.excludeProperties = properties
        .filter((p) => !p.enabled)
        .map((p) => p.name);

      // プロパティ名マッピングを保存（空でないもののみ）
      const nameMap: Record<string, string> = {};
      for (const prop of properties) {
        if (prop.outputName && prop.outputName.trim() !== '') {
          nameMap[prop.name] = prop.outputName.trim();
        }
      }
      config.propertyNameMap = nameMap;

      // カスタムプロパティを保存
      config.customProperties = customProperties;

      // 設定ファイルを書き込む
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
