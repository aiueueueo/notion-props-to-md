import { Command } from 'commander';
import { CommandOptions, SearchCondition } from './types';

// CLIプログラムを作成
export function createProgram(): Command {
  const program = new Command();

  program
    .name('notion2obsidian')
    .description('NotionデータベースのページをObsidian向けマークダウンにエクスポート')
    .version('1.0.0')
    .option('--db <name>', '対象のデータベース名を指定')
    .option('--title <title>', 'タイトル完全一致で指定')
    .option('--contains <keyword>', 'タイトル部分一致で指定')
    .option('--all', '全ページを出力')
    .option('--verbose', '詳細ログを表示');

  return program;
}

// コマンドラインオプションを解析
export function parseOptions(program: Command): CommandOptions {
  const opts = program.opts();

  return {
    db: opts.db as string | undefined,
    title: opts.title as string | undefined,
    contains: opts.contains as string | undefined,
    all: opts.all as boolean | undefined,
    verbose: opts.verbose as boolean | undefined,
  };
}

// コマンドラインオプションから検索条件を取得
export function getSearchConditionFromOptions(
  options: CommandOptions
): SearchCondition | null {
  if (options.title) {
    return {
      mode: 'title',
      keyword: options.title,
    };
  }

  if (options.contains) {
    return {
      mode: 'contains',
      keyword: options.contains,
    };
  }

  if (options.all) {
    return {
      mode: 'all',
    };
  }

  // 引数が指定されていない場合はnullを返す（対話モードに移行）
  return null;
}

// コマンドラインオプションが指定されているかチェック
export function hasSearchOptions(options: CommandOptions): boolean {
  return !!(options.title || options.contains || options.all);
}
