import { LogLevel } from './types';

// グローバルなログレベル
let currentLogLevel: LogLevel = 'normal';

// ログレベルを設定
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

// ログレベルを取得
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

// 通常ログ（常に表示）
export function log(message: string): void {
  console.log(message);
}

// デバッグログ（--verbose 時のみ表示）
export function debug(message: string): void {
  if (currentLogLevel === 'verbose') {
    console.log(`[DEBUG] ${message}`);
  }
}

// エラーログ（常に表示）
export function error(message: string): void {
  console.error(`[ERROR] ${message}`);
}

// 進捗表示
export function progress(current: number, total: number, message: string): void {
  console.log(`[${current}/${total}] ${message}`);
}

// 開始メッセージ
export function start(): void {
  console.log('Notion2Obsidian を開始します...\n');
}

// 完了メッセージ
export function complete(fileCount: number): void {
  console.log(`\n完了: ${fileCount}ファイルを出力しました`);
}

// 警告ログ
export function warn(message: string): void {
  console.log(`[WARN] ${message}`);
}
