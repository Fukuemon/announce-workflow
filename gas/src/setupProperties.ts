/**
 * スクリプトプロパティ初期設定
 * 参考: https://zenn.dev/manimoto/scraps/b08e71316b8f6b
 *
 * 値はダミーを設定しています。イベントごとに `gas/config.template.json` を参考に
 * 実値へ置き換えてから実行してください。
 */

type ScriptPropertyValue = string | number | boolean | string[];

function toPropertyString(value: ScriptPropertyValue): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return value;
}

export function setupScriptProperties(): void {
  const props = PropertiesService.getScriptProperties();

  const template: Record<string, ScriptPropertyValue> = {
    EVENT_NAME: "EVENT_NAME",
    EVENT_DATE: "EVENT_DATE",
    EVENT_URL: "EVENT_URL",
    EVENT_HASHTAG: "EVENT_HASHTAG",

    GCS_BUCKET_NAME: "announce-workflow-speaker-images-prod-{GCP_PROJECT_ID}",
    GCS_PROJECT_ID: "{GCP_PROJECT_ID}",

    // Chat App 用
    GOOGLE_CHAT_SPACE_ID: "AAA",
    // Service Account
    SA_CLIENT_EMAIL: "chatbot-sa@example.iam.gserviceaccount.com",
    SA_PRIVATE_KEY:
      "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",

    SPREADSHEET_ID: "SPREADSHEET_ID",
    SHEET_NAME: "フォームの回答",

    N8N_WEBHOOK_URL: "N8N_WEBHOOK_URL",

    // Cloud RunサービスURL（IAM認証のaudience用）
    CLOUD_RUN_SERVICE_URL: "CLOUD_RUN_SERVICE_URL",

    ENABLE_DEBUG_LOG: true,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif"],
    MAX_IMAGE_SIZE_MB: 10,
  };

  Object.keys(template).forEach((key) => {
    const value = toPropertyString(template[key]);
    props.setProperty(key, value);
  });

  Logger.log("Script properties have been initialized.");
}

export function showCurrentProperties(): void {
  const props = PropertiesService.getScriptProperties().getProperties();
  Logger.log("Current Script Properties:");
  Object.keys(props)
    .sort()
    .forEach((k) => Logger.log(`${k}=${props[k]}`));
}

export function clearScriptProperties(): void {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("All script properties have been cleared.");
}

// GAS エディタから直接呼び出せるように公開
(globalThis as any).setupScriptProperties = setupScriptProperties;
(globalThis as any).showCurrentProperties = showCurrentProperties;
(globalThis as any).clearScriptProperties = clearScriptProperties;
