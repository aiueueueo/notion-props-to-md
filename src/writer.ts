import * as fs from 'fs';
import * as path from 'path';
import { stringify as yamlStringify } from 'yaml';
import { ConvertedProperties, ImageInfo, CustomProperty } from './types';
import { getRelativeImagePath } from './downloader';
import * as logger from './logger';

// ディレクトリが存在しない場合は作成
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug(`ディレクトリを作成しました: ${dirPath}`);
  }
}

// ファイル名から禁止文字を置換
function sanitizeFileName(name: string): string {
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

// 同名ファイルが存在する場合は連番を付ける
function getUniqueFilePath(basePath: string): string {
  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const nameWithoutExt = path.basename(basePath, ext);

  let counter = 2;
  let newPath = basePath;

  while (fs.existsSync(newPath)) {
    newPath = path.join(dir, `${nameWithoutExt}_${counter}${ext}`);
    counter++;
  }

  return newPath;
}

// YAMLフロントマターを生成
function generateFrontMatter(
  properties: ConvertedProperties,
  images: ImageInfo[],
  outputDir: string,
  imageDir: string,
  customProperties: CustomProperty[] = []
): string {
  // プロパティをコピー
  const frontMatter: Record<string, unknown> = { ...properties };

  // 画像がある場合、相対パスに変換してプロパティに追加
  if (images.length > 0) {
    const imagePaths = images.map((img) =>
      getRelativeImagePath(img.localPath, outputDir, imageDir)
    );

    // 元のfilesプロパティを画像パスで上書き
    // 該当するプロパティ名を探す
    for (const [key, value] of Object.entries(frontMatter)) {
      if (Array.isArray(value) && value.some((v) => typeof v === 'string' && v.startsWith('http'))) {
        frontMatter[key] = imagePaths;
      }
    }
  }

  // カスタムプロパティを追加
  for (const customProp of customProperties) {
    frontMatter[customProp.name] = customProp.value;
  }

  // YAMLに変換
  const yamlContent = yamlStringify(frontMatter, {
    lineWidth: 0, // 行の折り返しを無効化
    defaultStringType: 'QUOTE_DOUBLE', // 文字列はダブルクォートで囲む
    defaultKeyType: 'PLAIN', // キーはプレーンテキスト
  });

  return `---\n${yamlContent}---`;
}

// 画像埋め込みセクションを生成
function generateImageSection(
  images: ImageInfo[],
  outputDir: string,
  imageDir: string
): string {
  if (images.length === 0) {
    return '';
  }

  const imageLines = images.map((img, index) => {
    const relativePath = getRelativeImagePath(img.localPath, outputDir, imageDir);
    // スペースを含むパスに対応するため <> で囲む
    return `![${img.propertyName}_${index + 1}](<${relativePath}>)`;
  });

  return '\n' + imageLines.join('\n\n');
}

// マークダウンファイルを生成
export function generateMarkdown(
  properties: ConvertedProperties,
  images: ImageInfo[],
  outputDir: string,
  imageDir: string,
  customProperties: CustomProperty[] = []
): string {
  const frontMatter = generateFrontMatter(properties, images, outputDir, imageDir, customProperties);
  const imageSection = generateImageSection(images, outputDir, imageDir);

  return frontMatter + imageSection + '\n';
}

// マークダウンファイルを書き込み
export function writeMarkdownFile(
  title: string,
  content: string,
  outputDir: string
): string {
  // 出力ディレクトリを作成
  ensureDirectoryExists(outputDir);

  // ファイル名を生成
  const sanitizedTitle = sanitizeFileName(title);
  const basePath = path.join(outputDir, `${sanitizedTitle}.md`);

  // 同名ファイルがある場合は連番を付ける
  const filePath = getUniqueFilePath(basePath);

  // ファイルを書き込み
  fs.writeFileSync(filePath, content, 'utf-8');

  return filePath;
}

// ページを処理してマークダウンファイルを出力
export function outputPage(
  title: string,
  properties: ConvertedProperties,
  images: ImageInfo[],
  outputDir: string,
  imageDir: string,
  customProperties: CustomProperty[] = []
): string {
  // マークダウンを生成
  const markdown = generateMarkdown(properties, images, outputDir, imageDir, customProperties);

  // ファイルを書き込み
  const filePath = writeMarkdownFile(title, markdown, outputDir);

  return filePath;
}

// 出力されたファイル数をカウント
export interface OutputResult {
  filePath: string;
  title: string;
  imageCount: number;
}
