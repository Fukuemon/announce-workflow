/**
 * 設定値定数
 */
export const CONFIG = {
  // Google Cloud Storage
  GCS_BUCKET_NAME:
    PropertiesService.getScriptProperties().getProperty("GCS_BUCKET_NAME") ||
    "",
  GCS_PROJECT_ID:
    PropertiesService.getScriptProperties().getProperty("GCS_PROJECT_ID") || "",

  // Google Chat Space ID (Chat App方式用)
  GOOGLE_CHAT_SPACE_ID:
    PropertiesService.getScriptProperties().getProperty(
      "GOOGLE_CHAT_SPACE_ID"
    ) || "",

  // Service Account (Chat API アプリ認証用)
  SA_CLIENT_EMAIL:
    PropertiesService.getScriptProperties().getProperty("SA_CLIENT_EMAIL") ||
    "",
  SA_PRIVATE_KEY:
    PropertiesService.getScriptProperties().getProperty("SA_PRIVATE_KEY") || "",

  // Spreadsheet
  SPREADSHEET_ID:
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "",
  SHEET_NAME:
    PropertiesService.getScriptProperties().getProperty("SHEET_NAME") || "", // 空文字列にして動的検索を使用

  // n8n Webhook
  N8N_WEBHOOK_URL:
    PropertiesService.getScriptProperties().getProperty("N8N_WEBHOOK_URL") ||
    "",
  IAP_CLIENT_ID:
    PropertiesService.getScriptProperties().getProperty("IAP_CLIENT_ID") || "",

  // Cloud RunサービスURL（IAM認証のaudience用）
  CLOUD_RUN_SERVICE_URL:
    PropertiesService.getScriptProperties().getProperty(
      "CLOUD_RUN_SERVICE_URL"
    ) || "",

  // イベント情報
  EVENT_NAME: "DevFest 2025 Kansai",
  EVENT_DATE: "2025/12/14(土) 13:00-17:00",
  EVENT_URL: "https://gdg-kansai.connpass.com/event/example",
  EVENT_HASHTAG: "DevFest2025Kansai",

  // デフォルト画像
  DEFAULT_PORTRAIT_URL:
    "https://storage.googleapis.com/gdg-kansai-assets/default-speaker.png",

  // 画像設定
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],

  // 画像圧縮設定
  IMAGE_COMPRESSION: {
    ENABLED: true,
    MAX_WIDTH: 800, // 最大幅（px）
    MAX_HEIGHT: 800, // 最大高さ（px）
    QUALITY: 0.8, // JPEG品質（0.1-1.0）
    OUTPUT_FORMAT: "image/jpeg", // 出力フォーマット
    ENABLE_RESIZE: true, // リサイズを有効にするか
    PRESERVE_ASPECT_RATIO: true, // アスペクト比を保持するか
  },

  // ログ設定
  ENABLE_DEBUG_LOG: true,
};
