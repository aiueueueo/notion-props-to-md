import inquirer from 'inquirer';
import { SearchCondition, NotionPageSummary, DatabaseConfig } from './types';

// 検索方法の選択肢
const SEARCH_MODE_CHOICES = [
  { name: 'タイトル完全一致', value: 'title' },
  { name: 'タイトル部分一致', value: 'contains' },
  { name: '全ページ出力', value: 'all' },
];

// データベースを選択
export async function selectDatabase(
  databases: DatabaseConfig[]
): Promise<DatabaseConfig | null> {
  // データベースが1つしかない場合はそれを返す
  if (databases.length === 1) {
    return databases[0];
  }

  const choices = databases.map((db) => ({
    name: db.name,
    value: db.name,
  }));

  const { dbName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'dbName',
      message: '対象のデータベースを選択してください:',
      choices,
    },
  ]);

  return databases.find((db) => db.name === dbName) || null;
}

// 検索方法を選択
export async function selectSearchMode(): Promise<'title' | 'contains' | 'all'> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '検索方法を選択してください:',
      choices: SEARCH_MODE_CHOICES,
    },
  ]);

  return mode;
}

// キーワードを入力
export async function inputKeyword(mode: 'title' | 'contains'): Promise<string> {
  const message =
    mode === 'title'
      ? 'タイトルを入力してください:'
      : 'キーワードを入力してください:';

  const { keyword } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyword',
      message,
      validate: (input: string) => {
        if (!input.trim()) {
          return '入力してください';
        }
        return true;
      },
    },
  ]);

  return keyword.trim();
}

// 検索結果を表示して確認
export async function confirmPages(
  pages: NotionPageSummary[]
): Promise<boolean> {
  if (pages.length === 0) {
    console.log('\n該当するページが見つかりませんでした。\n');
    return false;
  }

  console.log(`\n${pages.length}件見つかりました:`);
  pages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.title}`);
  });
  console.log('');

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '出力しますか?',
      default: true,
    },
  ]);

  return confirmed;
}

// 対話モードで検索条件を取得
export async function getSearchConditionInteractive(): Promise<SearchCondition | null> {
  const mode = await selectSearchMode();

  if (mode === 'all') {
    return { mode: 'all' };
  }

  const keyword = await inputKeyword(mode);

  return {
    mode,
    keyword,
  };
}
