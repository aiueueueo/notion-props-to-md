import { Client } from '@notionhq/client';
import {
  PageObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionPageSummary, SearchCondition } from './types';
import * as logger from './logger';

// Notionクライアントのインスタンス
let notionClient: Client | null = null;

// Notionクライアントを初期化
export function initializeClient(apiKey: string): void {
  notionClient = new Client({
    auth: apiKey,
  });
  logger.debug('Notion クライアントを初期化しました');
}

// クライアントを取得
function getClient(): Client {
  if (!notionClient) {
    throw new Error('Notion クライアントが初期化されていません');
  }
  return notionClient;
}

// ページオブジェクトからタイトルを取得
function getPageTitle(page: PageObjectResponse): string {
  const properties = page.properties;

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (prop.type === 'title' && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join('');
    }
  }

  return 'Untitled';
}

// データベースから全ページを取得
export async function getAllPages(databaseId: string): Promise<PageObjectResponse[]> {
  const client = getClient();
  const pages: PageObjectResponse[] = [];

  let cursor: string | undefined = undefined;
  let hasMore = true;

  logger.debug(`データベース ${databaseId} からページを取得中...`);

  while (hasMore) {
    const response: QueryDatabaseResponse = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        pages.push(page as PageObjectResponse);
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  logger.debug(`${pages.length}件のページを取得しました`);

  return pages;
}

// タイトル完全一致でフィルタリング
export function filterByExactTitle(
  pages: PageObjectResponse[],
  title: string
): PageObjectResponse[] {
  return pages.filter((page) => getPageTitle(page) === title);
}

// タイトル部分一致でフィルタリング
export function filterByTitleContains(
  pages: PageObjectResponse[],
  keyword: string
): PageObjectResponse[] {
  const lowerKeyword = keyword.toLowerCase();
  return pages.filter((page) =>
    getPageTitle(page).toLowerCase().includes(lowerKeyword)
  );
}

// 検索条件に基づいてページを取得
export async function getPages(
  databaseId: string,
  condition: SearchCondition
): Promise<PageObjectResponse[]> {
  const allPages = await getAllPages(databaseId);

  switch (condition.mode) {
    case 'all':
      return allPages;

    case 'title':
      if (!condition.keyword) {
        throw new Error('タイトル完全一致検索にはキーワードが必要です');
      }
      return filterByExactTitle(allPages, condition.keyword);

    case 'contains':
      if (!condition.keyword) {
        throw new Error('タイトル部分一致検索にはキーワードが必要です');
      }
      return filterByTitleContains(allPages, condition.keyword);

    default:
      throw new Error(`不明な検索モード: ${condition.mode}`);
  }
}

// ページ一覧をサマリー形式で取得
export function getPageSummaries(pages: PageObjectResponse[]): NotionPageSummary[] {
  return pages.map((page) => ({
    id: page.id,
    title: getPageTitle(page),
  }));
}

// ページのプロパティを取得
export function getPageProperties(page: PageObjectResponse): Record<string, unknown> {
  return page.properties;
}

// データベースのプロパティスキーマを取得
export async function getDatabaseSchema(
  databaseId: string
): Promise<{ name: string; type: string }[]> {
  const client = getClient();

  logger.debug(`データベース ${databaseId} のスキーマを取得中...`);

  const response = await client.databases.retrieve({
    database_id: databaseId,
  });

  const properties: { name: string; type: string }[] = [];

  for (const [name, prop] of Object.entries(response.properties)) {
    properties.push({
      name,
      type: prop.type,
    });
  }

  logger.debug(`${properties.length}件のプロパティを取得しました`);

  return properties;
}

// ページタイトルを取得（エクスポート用）
export { getPageTitle };
