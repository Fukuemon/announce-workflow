export interface EventPageParams {
  session_title: string;
  session_description: string;
  name: string;
  affiliation?: string; // ご所属
  title?: string; // 肩書
  xAccount?: string;
  portrait_gcs_url: string;
  bio?: string;
}

export function generateEventPageText(params: EventPageParams): string {
  const lines: string[] = [];

  // connpass_publish.mdのフォーマットに合わせる
  lines.push(`## ${safe(params.session_title)}`);
  if (params.session_description) lines.push(safe(params.session_description));
  lines.push("");
  lines.push(`### 登壇者：${safe(params.name)} 氏`);

  // Xアカウントの表示（リンク形式に対応）
  if (params.xAccount) {
    const xAccountText = safe(params.xAccount);
    // 既にリンク形式の場合はそのまま、そうでなければテキストのみ
    if (xAccountText.includes("[") && xAccountText.includes("](")) {
      lines.push(`X: ${xAccountText}`);
    } else {
      lines.push(`X: ${xAccountText}`);
    }
  }
  lines.push("");

  // 所属・肩書の表示（connpass_publish.mdのフォーマットに合わせる）
  const affiliationTitle = [params.affiliation, params.title]
    .filter((v) => !!v && String(v).trim().length > 0)
    .map((v) => `- ${v}`);

  if (affiliationTitle.length > 0) {
    lines.push(...affiliationTitle);
  }
  lines.push("");

  if (params.portrait_gcs_url) {
    lines.push(
      `<img src="${safe(
        params.portrait_gcs_url
      )}" alt="ポートレート" width="160">`
    );
  }
  lines.push("");
  lines.push("> **登壇者について**");
  lines.push(`> ${safe(params.bio || "")}`);
  return lines.join("\n");
}

function safe(v: string): string {
  return (v || "").toString();
}
