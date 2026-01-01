import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { ImageInfo } from './types';
import * as logger from './logger';

// ディレクトリが存在しない場合は作成
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug(`ディレクトリを作成しました: ${dirPath}`);
  }
}

// URLからファイルをダウンロード
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // リダイレクト対応
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`ダウンロード失敗: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // 失敗したファイルを削除
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    // タイムアウト設定（30秒）
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('ダウンロードタイムアウト'));
    });
  });
}

// 画像をダウンロードしてローカルに保存
export async function downloadImages(
  images: ImageInfo[],
  imageDir: string
): Promise<ImageInfo[]> {
  if (images.length === 0) {
    return [];
  }

  // 画像ディレクトリを作成
  ensureDirectoryExists(imageDir);

  const downloadedImages: ImageInfo[] = [];

  for (const image of images) {
    const destPath = image.localPath;
    const destDir = path.dirname(destPath);

    // 保存先ディレクトリを作成
    ensureDirectoryExists(destDir);

    try {
      logger.debug(`画像をダウンロード中: ${image.url}`);
      await downloadFile(image.url, destPath);
      logger.debug(`保存先: ${destPath}`);
      downloadedImages.push(image);
    } catch (err) {
      if (err instanceof Error) {
        logger.warn(`画像のダウンロードに失敗しました: ${err.message}`);
      }
      // 失敗しても続行
    }
  }

  return downloadedImages;
}

// outputDirからimageDirへの相対パスを計算
export function calculateRelativePath(
  outputDir: string,
  imageDir: string
): string {
  const absoluteOutputDir = path.resolve(outputDir);
  const absoluteImageDir = path.resolve(imageDir);

  return path.relative(absoluteOutputDir, absoluteImageDir);
}

// 画像のローカルパスを相対パスに変換
export function getRelativeImagePath(
  imagePath: string,
  outputDir: string,
  imageDir: string
): string {
  const relativePath = calculateRelativePath(outputDir, imageDir);
  const fileName = path.basename(imagePath);

  // パス区切りを統一（Obsidian用にスラッシュを使用）
  return `${relativePath}/${fileName}`.replace(/\\/g, '/');
}

// ファイル情報の型（converter.tsから受け取る）
interface FileInfo {
  url: string;
  name: string;
}

// 画像情報の配列からローカルパスを更新（FileInfo[] → ImageInfo[]）
export function updateImagePaths(
  files: FileInfo[],
  pageTitle: string,
  imageDir: string
): ImageInfo[] {
  const sanitizedTitle = sanitizeFileName(pageTitle);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'];

  // 画像ファイルのみをフィルタリング
  const imageFiles = files.filter((file) => {
    const lowerUrl = file.url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
  });

  return imageFiles.map((file, index) => {
    // 拡張子を抽出（URLのパス部分から取得）
    let ext = '.png';
    try {
      const urlObj = new URL(file.url);
      const pathname = urlObj.pathname.toLowerCase();
      for (const extension of imageExtensions) {
        if (pathname.endsWith(extension)) {
          ext = extension;
          break;
        }
      }
    } catch {
      // URLパースに失敗した場合はincludes で検出
      const lowerUrl = file.url.toLowerCase();
      for (const extension of imageExtensions) {
        if (lowerUrl.includes(extension)) {
          ext = extension;
          break;
        }
      }
    }

    const fileName = `${sanitizedTitle}_${index + 1}${ext}`;
    const localPath = path.join(imageDir, fileName);

    return {
      url: file.url,
      localPath,
      propertyName: file.name,
    };
  });
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
