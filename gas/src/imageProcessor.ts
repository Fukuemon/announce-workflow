import { CONFIG } from "./config";

const GCS_API_BASE_URL = "https://storage.googleapis.com";

/**
 * 画像ファイルが有効かどうかを検証します。
 * @param blob 検証する画像データ
 * @returns エラーメッセージ(string)またはnull
 */
function validateImageFile(blob: GoogleAppsScript.Base.Blob): string | null {
  if (blob.getBytes().length > CONFIG.IMAGE_MAX_SIZE) {
    return `画像サイズが大きすぎます。最大サイズ: ${
      CONFIG.IMAGE_MAX_SIZE / 1024 / 1024
    }MB`;
  }

  const contentType = blob.getContentType();
  if (!contentType || !CONFIG.ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return `サポートされていない画像形式です: ${contentType}。許可されている形式: ${CONFIG.ALLOWED_IMAGE_TYPES.join(
      ", "
    )}`;
  }

  return null;
}

/**
 * 画像を圧縮します。現在はJPEGへの変換のみ対応。
 * @param blob 圧縮する画像データ
 * @returns 圧縮後の画像データ
 */
function compressImage(
  blob: GoogleAppsScript.Base.Blob
): GoogleAppsScript.Base.Blob {
  try {
    if (!CONFIG.IMAGE_COMPRESSION.ENABLED) {
      Logger.log("画像圧縮は無効です。元の画像を返します。");
      return blob;
    }

    const originalSize = blob.getBytes().length;
    Logger.log(`画像圧縮を開始します。元サイズ: ${originalSize} bytes`);

    // JPEGに変換して圧縮効果を得る
    const processedBlob = blob.getAs("image/jpeg");

    const compressedSize = processedBlob.getBytes().length;
    const compressionRatio = (
      ((originalSize - compressedSize) / originalSize) *
      100
    ).toFixed(1);

    Logger.log(
      `画像圧縮完了。圧縮後サイズ: ${compressedSize} bytes (${compressionRatio}% 削減)`
    );

    return processedBlob;
  } catch (error: any) {
    Logger.log(`画像圧縮中にエラーが発生しました: ${error.toString()}`);
    Logger.log("圧縮エラーのため、元の画像を返します。");
    return blob;
  }
}

/**
 * Google Driveから画像を取得し、圧縮してGoogle Cloud Storageへアップロードします。
 * @param fileId Google DriveのファイルID
 * @param speakerName 登壇者名（ファイル名に使用）
 * @returns GCS上の画像の公開URL。失敗した場合はデフォルトURLを返す。
 */
export function uploadImageToGCS(fileId: string, speakerName: string): string {
  Logger.log("[画像アップロード] 開始");
  Logger.log(`[画像アップロード] fileId: ${fileId}, 登壇者名: ${speakerName}`);

  const gcsBucketName = CONFIG.GCS_BUCKET_NAME;
  if (!gcsBucketName) {
    Logger.log(
      "[画像アップロード] エラー: GCS_BUCKET_NAMEが設定されていません。"
    );
    return CONFIG.DEFAULT_PORTRAIT_URL;
  }
  Logger.log(`[画像アップロード] GCSバケット: ${gcsBucketName}`);

  try {
    Logger.log("[画像アップロード] Google Driveからファイルを取得中...");
    const file = DriveApp.getFileById(fileId);
    const originalBlob = file.getBlob();
    Logger.log(
      `[画像アップロード] ファイル取得完了: ${file.getName()}, サイズ: ${
        originalBlob.getBytes().length
      } bytes, 形式: ${originalBlob.getContentType()}`
    );

    Logger.log("[画像アップロード] 画像ファイルを検証中...");
    const validationError = validateImageFile(originalBlob);
    if (validationError) {
      Logger.log(`[画像アップロード] 検証エラー: ${validationError}`);
      return CONFIG.DEFAULT_PORTRAIT_URL;
    }
    Logger.log("[画像アップロード] 検証完了。");

    Logger.log("[画像アップロード] 画像を圧縮中...");
    const compressedBlob = compressImage(originalBlob);
    Logger.log(
      `[画像アップロード] 圧縮完了。新サイズ: ${
        compressedBlob.getBytes().length
      } bytes`
    );

    const timestamp = Utilities.formatDate(
      new Date(),
      "Asia/Tokyo",
      "yyyyMMddHHmmss"
    );
    // 日本語文字も含めて、より緩い文字制限にする
    const sanitizedName = speakerName
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[<>:"/\\|?*]/g, "") // ファイル名で使えない文字のみ削除
      .substring(0, 20); // 長さ制限
    const gcsObjectName = `speaker-images/${sanitizedName}_${timestamp}.jpg`;
    Logger.log(`[画像アップロード] GCSオブジェクト名: ${gcsObjectName}`);

    const gcsUploadUrl = `${GCS_API_BASE_URL}/upload/storage/v1/b/${gcsBucketName}/o?uploadType=media&name=${encodeURIComponent(
      gcsObjectName
    )}`;
    Logger.log(`[画像アップロード] GCSアップロードURL: ${gcsUploadUrl}`);

    const oauthToken = ScriptApp.getOAuthToken();

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      headers: {
        Authorization: `Bearer ${oauthToken}`,
      },
      contentType: compressedBlob.getContentType() || "",
      payload: compressedBlob.getBytes(),
      muteHttpExceptions: true,
    };

    Logger.log("[画像アップロード] GCSへアップロード中...");
    const response = UrlFetchApp.fetch(gcsUploadUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log(`[画像アップロード] GCS応答コード: ${responseCode}`);

    if (responseCode >= 400) {
      Logger.log(
        `[画像アップロード] GCSアップロード失敗。コード: ${responseCode}, 応答: ${responseText}`
      );
      return CONFIG.DEFAULT_PORTRAIT_URL;
    }

    const result = JSON.parse(responseText);
    Logger.log(`[画像アップロード] GCS応答ボディ: ${JSON.stringify(result)}`);
    const publicUrl = `${GCS_API_BASE_URL}/${gcsBucketName}/${encodeURIComponent(
      gcsObjectName
    )}`;
    Logger.log(`[画像アップロード] アップロード成功。公開URL: ${publicUrl}`);
    return publicUrl;
  } catch (e: any) {
    Logger.log(
      `[画像アップロード] 予期せぬエラーが発生しました: ${e.toString()}`
    );
    Logger.log(`[画像アップロード] スタックトレース: ${e.stack}`);
    return CONFIG.DEFAULT_PORTRAIT_URL;
  }
}

/**
 * Google DriveのURLからファイルIDを抽出します。
 * @param url Google DriveのURLまたはファイルID
 * @returns 抽出されたファイルID、見つからない場合はnull
 */
export function extractFileIdFromUrl(url: string): string | null {
  Logger.log(`[ID抽出] 開始。URL: ${url}`);
  if (!url) {
    Logger.log("[ID抽出] URLが空です。");
    return null;
  }
  try {
    const patterns = [
      /[-\w]{25,}/, // fileIdのみの場合
      /\/file\/d\/([-\w]{25,})/, // /file/d/FILE_ID
      /id=([-\w]{25,})/, // id=FILE_ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const fileId = match[1] || match[0];
        Logger.log(`[ID抽出] ファイルIDを検出: ${fileId}`);
        return fileId;
      }
    }

    Logger.log("[ID抽出] URLからファイルIDが見つかりませんでした。");
    return null;
  } catch (e: any) {
    Logger.log(`[ID抽出] エラー: ${e.toString()}`);
    return null;
  }
}
