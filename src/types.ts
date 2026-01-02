// カスタムプロパティの型
export interface CustomProperty {
  name: string;
  value: string | string[] | number | boolean;
}

// 設定ファイルの型
export interface Config {
  databaseId: string;
  outputDir: string;
  imageDir?: string;
  excludeProperties?: string[];
  propertyOrder?: string[];
  customProperties?: CustomProperty[];
  propertyNameMap?: Record<string, string>;
  propertyValueAdditions?: Record<string, string | string[] | number | boolean>;
}

// コマンドラインオプションの型
export interface CommandOptions {
  title?: string;
  contains?: string;
  all?: boolean;
  verbose?: boolean;
}

// ログレベル
export type LogLevel = 'normal' | 'verbose';

// 検索モード
export type SearchMode = 'title' | 'contains' | 'all';

// 検索条件
export interface SearchCondition {
  mode: SearchMode;
  keyword?: string;
}

// Notionページの簡易型
export interface NotionPageSummary {
  id: string;
  title: string;
}

// 変換後のプロパティ値
export type PropertyValue =
  | string
  | number
  | boolean
  | string[]
  | null;

// 変換後のプロパティマップ
export interface ConvertedProperties {
  [key: string]: PropertyValue;
}

// 画像情報
export interface ImageInfo {
  url: string;
  localPath: string;
  propertyName: string;
}

// 出力データ
export interface OutputData {
  title: string;
  properties: ConvertedProperties;
  images: ImageInfo[];
}
