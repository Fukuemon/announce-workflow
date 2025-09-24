import { ColumnKey, ColumnMap, ExtraColumnDefinition } from "./type";

// フォームの列名に対する部分一致キーワード
const PARTIAL_KEYWORDS: Record<ColumnKey, string[]> = {
  timestamp: ["タイムスタンプ", "時刻", "日時"],
  name: ["お名前", "名前", "氏名"],
  name_kana: ["フリガナ", "ふりがな", "カナ"],
  email: ["メールアドレス", "メール", "email"],
  affiliation: ["所属", "ご所属", "会社"],
  title: ["肩書", "役職", "職種"],
  portrait_image: ["ポートレート", "画像", "アイコン", "写真"],
  bio: ["自己紹介", "紹介文", "プロフィール"],
  session_title: ["セッションタイトル", "タイトル", "題名"],
  session_description: ["セッション概要", "概要", "内容"],
  connpass_id: ["connpass", "コンパス"],
  x_account: ["X アカウント", "Twitter", "ツイッター", "X"],
};

// 追加カラムの定義
const EXTRA_COLUMN_DEFINITIONS: ExtraColumnDefinition[] = [
  { key: "portrait_gcs_url", name: "ポートレート画像URL" },
  { key: "event_page_text", name: "イベントページ掲載文" },
  { key: "sns_post_text", name: "SNS投稿文" },
  { key: "post_status", name: "投稿ステータス" },
];

/**
 * カラムマッピングを作成する
 * @param headerValues ヘッダーの値
 * @returns カラムマッピング
 */
export function buildColumnMap(headerValues: string[]): ColumnMap {
  const map: ColumnMap = {};
  headerValues.forEach((header, idx) => {
    const normalized = header.toLowerCase();

    // フォーム由来のカラムをマッピング
    (Object.keys(PARTIAL_KEYWORDS) as ColumnKey[]).forEach((key) => {
      const hits = PARTIAL_KEYWORDS[key].some((kw) =>
        normalized.includes(kw.toLowerCase())
      );
      if (hits && map[key] === undefined) {
        map[key] = idx;
      }
    });

    // 追加カラムをマッピング
    EXTRA_COLUMN_DEFINITIONS.forEach(({ key, name }) => {
      if (header === name) {
        map[key] = idx;
      }
    });
  });
  return map;
}

/**
 * スプレッドシートにワークフローで必要な追加カラムが存在することを確認し、なければ追加します。
 * @param sheet 対象のスプレッドシート
 * @param headerValues 現在のヘッダー行の配列
 * @returns 更新後のヘッダー行の配列
 */
export function ensureExtraColumns(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerValues: string[]
): string[] {
  const currentHeaders = headerValues.slice();
  let headersChanged = false;

  EXTRA_COLUMN_DEFINITIONS.forEach(({ name }) => {
    if (!currentHeaders.includes(name)) {
      currentHeaders.push(name);
      headersChanged = true;
    }
  });

  if (headersChanged) {
    const added = EXTRA_COLUMN_DEFINITIONS.filter(
      ({ name }) => !headerValues.includes(name)
    )
      .map(({ name }) => name)
      .join(", ");
    Logger.log(`ヘッダーを更新します。追加されるカラム: ${added}`);
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }

  return currentHeaders;
}
