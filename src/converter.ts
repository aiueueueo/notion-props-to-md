import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { ConvertedProperties, PropertyValue, ImageInfo } from './types';
import * as logger from './logger';

// ファイル情報の型
interface FileInfo {
  url: string;
  name: string;
}

// プロパティからファイル情報を抽出
function extractFiles(prop: unknown): FileInfo[] {
  const files: FileInfo[] = [];

  if (!prop || typeof prop !== 'object' || !('files' in prop)) {
    return files;
  }

  const filesProp = prop as { files: unknown[] };

  for (const file of filesProp.files) {
    if (!file || typeof file !== 'object') continue;

    const fileObj = file as Record<string, unknown>;

    if (fileObj.type === 'file' && fileObj.file) {
      const fileData = fileObj.file as { url: string };
      files.push({
        url: fileData.url,
        name: (fileObj.name as string) || 'unnamed',
      });
    } else if (fileObj.type === 'external' && fileObj.external) {
      const externalData = fileObj.external as { url: string };
      files.push({
        url: externalData.url,
        name: (fileObj.name as string) || 'unnamed',
      });
    }
  }

  return files;
}

// 単一のプロパティを変換
function convertProperty(
  name: string,
  prop: unknown,
  excludeProperties: string[]
): { value: PropertyValue; files: FileInfo[] } {
  // 除外プロパティのチェック
  if (excludeProperties.includes(name)) {
    return { value: null, files: [] };
  }

  if (!prop || typeof prop !== 'object') {
    return { value: null, files: [] };
  }

  const propObj = prop as Record<string, unknown>;
  const type = propObj.type as string;

  logger.debug(`  プロパティ '${name}' (${type})`);

  switch (type) {
    case 'title': {
      const titleArray = propObj.title as Array<{ plain_text: string }>;
      if (!titleArray || titleArray.length === 0) {
        return { value: '', files: [] };
      }
      return {
        value: titleArray.map((t) => t.plain_text).join(''),
        files: [],
      };
    }

    case 'rich_text': {
      const textArray = propObj.rich_text as Array<{ plain_text: string }>;
      if (!textArray || textArray.length === 0) {
        return { value: '', files: [] };
      }
      return {
        value: textArray.map((t) => t.plain_text).join(''),
        files: [],
      };
    }

    case 'number': {
      const num = propObj.number as number | null;
      return { value: num, files: [] };
    }

    case 'select': {
      const select = propObj.select as { name: string } | null;
      return { value: select?.name ?? null, files: [] };
    }

    case 'multi_select': {
      const multiSelect = propObj.multi_select as Array<{ name: string }>;
      if (!multiSelect || multiSelect.length === 0) {
        return { value: [], files: [] };
      }
      return {
        value: multiSelect.map((s) => s.name),
        files: [],
      };
    }

    case 'status': {
      const status = propObj.status as { name: string } | null;
      return { value: status?.name ?? null, files: [] };
    }

    case 'date': {
      const date = propObj.date as { start: string; end?: string } | null;
      if (!date) {
        return { value: null, files: [] };
      }
      // end がある場合は「start ~ end」形式
      if (date.end) {
        return { value: `${date.start} ~ ${date.end}`, files: [] };
      }
      return { value: date.start, files: [] };
    }

    case 'checkbox': {
      const checkbox = propObj.checkbox as boolean;
      return { value: checkbox, files: [] };
    }

    case 'url': {
      const url = propObj.url as string | null;
      return { value: url, files: [] };
    }

    case 'email': {
      const email = propObj.email as string | null;
      return { value: email, files: [] };
    }

    case 'phone_number': {
      const phone = propObj.phone_number as string | null;
      return { value: phone, files: [] };
    }

    case 'created_time': {
      const createdTime = propObj.created_time as string;
      // ISO 8601形式から日付部分のみ抽出（例: 2026-01-01T00:58:00.000Z → 2026-01-01）
      return { value: createdTime.split('T')[0], files: [] };
    }

    case 'last_edited_time': {
      const lastEditedTime = propObj.last_edited_time as string;
      // ISO 8601形式から日付部分のみ抽出
      return { value: lastEditedTime.split('T')[0], files: [] };
    }

    case 'created_by': {
      const createdBy = propObj.created_by as { name?: string; id: string };
      return { value: createdBy?.name ?? createdBy?.id ?? null, files: [] };
    }

    case 'last_edited_by': {
      const lastEditedBy = propObj.last_edited_by as { name?: string; id: string };
      return { value: lastEditedBy?.name ?? lastEditedBy?.id ?? null, files: [] };
    }

    case 'relation': {
      const relation = propObj.relation as Array<{ id: string }>;
      if (!relation || relation.length === 0) {
        return { value: [], files: [] };
      }
      // 関連ページのIDを返す（タイトルの取得は追加のAPIコールが必要）
      return {
        value: relation.map((r) => r.id),
        files: [],
      };
    }

    case 'formula': {
      const formula = propObj.formula as Record<string, unknown>;
      if (!formula) {
        return { value: null, files: [] };
      }
      const formulaType = formula.type as string;
      switch (formulaType) {
        case 'string':
          return { value: formula.string as string | null, files: [] };
        case 'number':
          return { value: formula.number as number | null, files: [] };
        case 'boolean':
          return { value: formula.boolean as boolean | null, files: [] };
        case 'date':
          const dateVal = formula.date as { start: string } | null;
          return { value: dateVal?.start ?? null, files: [] };
        default:
          return { value: null, files: [] };
      }
    }

    case 'rollup': {
      const rollup = propObj.rollup as Record<string, unknown>;
      if (!rollup) {
        return { value: null, files: [] };
      }
      const rollupType = rollup.type as string;
      switch (rollupType) {
        case 'number':
          return { value: rollup.number as number | null, files: [] };
        case 'date':
          const dateVal = rollup.date as { start: string } | null;
          return { value: dateVal?.start ?? null, files: [] };
        case 'array':
          // 配列の場合は単純化して返す
          return { value: '(rollup array)', files: [] };
        default:
          return { value: null, files: [] };
      }
    }

    case 'files': {
      const files = extractFiles(prop);
      // ファイルURLの配列を値として返し、ファイル情報も返す
      return {
        value: files.map((f) => f.url),
        files,
      };
    }

    case 'people': {
      const people = propObj.people as Array<{ name?: string; id: string }>;
      if (!people || people.length === 0) {
        return { value: [], files: [] };
      }
      return {
        value: people.map((p) => p.name ?? p.id),
        files: [],
      };
    }

    case 'unique_id': {
      const uniqueId = propObj.unique_id as { prefix?: string; number: number };
      if (!uniqueId) {
        return { value: null, files: [] };
      }
      if (uniqueId.prefix) {
        return { value: `${uniqueId.prefix}-${uniqueId.number}`, files: [] };
      }
      return { value: uniqueId.number, files: [] };
    }

    default:
      logger.debug(`    未対応のプロパティ型: ${type}`);
      return { value: null, files: [] };
  }
}

// ページのプロパティを変換
export function convertPageProperties(
  page: PageObjectResponse,
  excludeProperties: string[] = [],
  propertyOrder: string[] = [],
  propertyNameMap: Record<string, string> = {}
): { properties: ConvertedProperties; files: FileInfo[] } {
  const tempProperties: ConvertedProperties = {};
  const allFiles: FileInfo[] = [];

  logger.debug(`ページのプロパティを変換中...`);

  for (const [name, prop] of Object.entries(page.properties)) {
    const { value, files } = convertProperty(name, prop, excludeProperties);

    // nullでない値のみ追加（空文字列や空配列は追加）
    if (value !== null) {
      // プロパティ名マッピングを適用（マッピングがあれば変換後の名前を使用）
      const outputName = propertyNameMap[name] || name;
      tempProperties[outputName] = value;
    }

    // ファイル情報を収集
    allFiles.push(...files);
  }

  // プロパティの順序を適用
  const properties: ConvertedProperties = {};

  if (propertyOrder.length > 0) {
    // 指定された順序でプロパティを追加
    for (const name of propertyOrder) {
      // propertyOrderにはNotionの元のプロパティ名が入っているので、マッピング後の名前に変換
      const outputName = propertyNameMap[name] || name;
      if (outputName in tempProperties) {
        properties[outputName] = tempProperties[outputName];
      }
    }
    // 残りのプロパティを追加（順序が指定されていないもの）
    for (const [name, value] of Object.entries(tempProperties)) {
      if (!(name in properties)) {
        properties[name] = value;
      }
    }
  } else {
    // 順序指定がない場合はそのまま
    Object.assign(properties, tempProperties);
  }

  return { properties, files: allFiles };
}

// ページタイトルを取得
export function getPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if (!prop || typeof prop !== 'object') continue;

    const propObj = prop as Record<string, unknown>;
    if (propObj.type === 'title') {
      const titleArray = propObj.title as Array<{ plain_text: string }>;
      if (titleArray && titleArray.length > 0) {
        return titleArray.map((t) => t.plain_text).join('');
      }
    }
  }

  return 'Untitled';
}

// 画像情報に変換
export function createImageInfoList(
  files: FileInfo[],
  pageTitle: string,
  imageDir: string
): ImageInfo[] {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

  return files
    .filter((file) => {
      const lowerUrl = file.url.toLowerCase();
      return imageExtensions.some((ext) => lowerUrl.includes(ext));
    })
    .map((file, index) => {
      // 拡張子を推測
      let ext = '.png';
      for (const extension of imageExtensions) {
        if (file.url.toLowerCase().includes(extension)) {
          ext = extension;
          break;
        }
      }

      const sanitizedTitle = sanitizeFileName(pageTitle);
      const localPath = `${imageDir}/${sanitizedTitle}_${index + 1}${ext}`;

      return {
        url: file.url,
        localPath,
        propertyName: file.name,
      };
    });
}

// ファイル名から禁止文字を置換
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
    .replace(/:/g, '-')
    .replace(/\*/g, '-')
    .replace(/\?/g, '-')
    .replace(/"/g, '-')
    .replace(/</g, '-')
    .replace(/>/g, '-')
    .replace(/\|/g, '-');
}
