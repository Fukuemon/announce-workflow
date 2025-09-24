// Webhook と Sheets データを複数の方法で取得し、emailで行特定
// 複数の入力から適切にデータを抽出する
const allInputs = $input.all();
let webhookData = {};
let sheetItems = [];

// 入力データを分類
for (const input of allInputs) {
  const data = input.json || input;

  // Webhook データの判定（body, query, email/name プロパティがある）
  if (data.body || data.query || (data.email && data.name)) {
    webhookData = data;
  }
  // Sheet データの判定（日本語カラム名または英語カラム名がある）
  else if (
    data["メールアドレス"] ||
    data["お名前"] ||
    (data.email && !data.body && !data.query)
  ) {
    sheetItems.push(data);
  }
}

// Webhook からの email と name を抽出
const emailFromWebhook = (
  webhookData.body?.email ||
  webhookData.query?.email ||
  webhookData.email ||
  ""
)
  .toString()
  .trim();
const nameFromWebhook = (
  webhookData.body?.name ||
  webhookData.query?.name ||
  webhookData.name ||
  ""
)
  .toString()
  .trim();

// デバッグ情報をログ出力
console.log("Webhook data:", JSON.stringify(webhookData));
console.log("Sheet items count:", sheetItems.length);
console.log("Email from webhook:", emailFromWebhook);

// 入力チェック
if (!emailFromWebhook && sheetItems.length === 0) {
  throw new Error("Webhook と Sheet の入力が不足しています");
}

// email の決定（Webhook優先、なければSheet先頭行）
const email =
  emailFromWebhook ||
  (
    sheetItems[0] &&
    (sheetItems[0]["メールアドレス"] || sheetItems[0].email || "")
  )
    .toString()
    .trim();
if (!email) {
  throw new Error("email が見つかりません (webhook もしくは sheet 先頭行)");
}

// Sheet から該当する行を検索（重複するemailの場合は最新の1つだけを取得）
const matchingRows = sheetItems.filter(
  (r) => (r["メールアドレス"] || r.email) === email
);
const row =
  matchingRows.length > 0
    ? matchingRows[matchingRows.length - 1]
    : sheetItems[0] || {};

console.log(
  `[重複チェック] 該当する行数: ${matchingRows.length}, 選択した行: ${
    matchingRows.length > 0 ? "最新" : "先頭"
  }`
);

// 重複実行チェック：SNS投稿文が既に存在する場合はスキップ
const existingSnsPost = row["SNS投稿文"] || row.sns_post_text || "";
if (existingSnsPost && existingSnsPost.trim().length > 0) {
  console.log(
    `[重複チェック] SNS投稿文が既に存在します。email: ${email}, 投稿文長: ${existingSnsPost.length}`
  );
  return {
    json: {
      skip_processing: true,
      reason: "sns_post_already_exists",
      email: email,
      existing_post_length: existingSnsPost.length,
      workflow_metadata: {
        trigger_time: new Date().toISOString(),
        source: "webhook",
      },
    },
  };
}

// 投稿ステータスチェック：postedの場合はスキップ（approvedは処理続行）
const postStatus = row["投稿ステータス"] || row.post_status || "";
if (postStatus === "posted") {
  console.log(
    `[重複チェック] 既に投稿済みです。email: ${email}, status: ${postStatus}`
  );
  return {
    json: {
      skip_processing: true,
      reason: "already_posted",
      email: email,
      post_status: postStatus,
      workflow_metadata: {
        trigger_time: new Date().toISOString(),
        source: "webhook",
      },
    },
  };
}

console.log(
  `[重複チェック] 処理を続行します。email: ${email}, status: ${postStatus}, 既存投稿文: ${existingSnsPost.length}文字`
);

// データの整形
const cleanedData = {
  name: (row.name || row["お名前"] || nameFromWebhook || "").toString().trim(),
  email: email,
  affiliation: (row.affiliation || row["ご所属"] || "").toString().trim(),
  title: (row.title || row["肩書"] || "").toString().trim(),
  bio: (row.bio || row["自己紹介文"] || row["イベントページ掲載文"] || "")
    .toString()
    .trim(),
  session_title: (row.session_title || row["セッションタイトル(仮題可)"] || "")
    .toString()
    .trim(),
  session_description: (
    row.session_description ||
    row["セッション概要(仮のもので可)"] ||
    ""
  )
    .toString()
    .trim(),
  x_account: (row.x_account || row["X アカウント"] || "").toString().trim(),
  connpass_id: (row.connpass_id || row["connpass ID"] || "").toString().trim(),
  portrait_gcs_url: row.portrait_gcs_url || row["GCS画像URL"] || "",
  event_page_text: row.event_page_text || row["イベントページ掲載文"] || "",
  timestamp: row.timestamp || row["タイムスタンプ"] || row["列 1"] || "",
};

const shortBio =
  cleanedData.bio.substring(0, 80) + (cleanedData.bio.length > 80 ? "..." : "");
const snsTemplateData = {
  name: cleanedData.name,
  affiliation: cleanedData.affiliation,
  title: cleanedData.title,
  session_title: cleanedData.session_title,
  short_bio: shortBio,
  event_date: "2025/10/18(土) 10:00-18:00",
  event_url: "https://gdgkwansai.connpass.com/event/366115/",
  event_hashtag: "devfest_kwansai_2025",
  additional_hashtags: "automation n8n gemini",
};

const fewShotPrompt = `あなたは日本のテックイベント「DevFest 2025 in Kwansai」の広報担当者です。登壇者の情報をもとに、X（Twitter）投稿用の告知文を日本語で作成してください。

【重要】必ず日本語のみで回答してください。英語は使用しないでください。

## 作成する告知文の形式
以下の形式で280文字以内で作成してください：

DevFest 2025 in Kwansai
「[セッションタイトル]」のご紹介[絵文字]

[所属] [肩書]の
[登壇者名]さんが登壇！

[短縮紹介文]
✨

🔗 詳細・申込はこちら ⬇️
https://gdgkwansai.connpass.com/event/366115/

## 参考例1
DevFest 2025 in Kwansai
「LLM の推論能力と人類最後の試験」のご紹介 🧠

東京大学大学院 松尾研 LLM 開発コンペ 2025 RAMEN の
佐藤 諒平さんが登壇！

LLM が知識をどう推論能力に結びつけるのか？
「人類最後の試験」と呼ばれる難題に挑む最新研究の一端を、
最前線からお届けします
✨

🔗 詳細・申込はこちら ⬇️
https://gdgkwansai.connpass.com/event/366115/

## 参考例2
DevFest 2025 in Kwansai
「世界で戦うエンジニアを育てる」のご紹介🌏

一般社団法人ソフトウェアエンジニアリング協会 理事の
野田 久順さんが登壇！

Google・Apple・Metaなどに30名近くを輩出してきた
模擬面接・育成プログラムの実践経験から、
世界に通じるエンジニア教育のリアルをお届けします
🔥

🔗 詳細・申込はこちら ⬇️
https://gdgkwansai.connpass.com/event/366115/

## 登壇者情報
登壇者名: ${snsTemplateData.name}
所属: ${snsTemplateData.affiliation}
肩書: ${snsTemplateData.title}
セッションタイトル: ${snsTemplateData.session_title}
短縮紹介文: ${snsTemplateData.short_bio}

上記の登壇者情報を使って、参考例と同じ形式で告知文を作成してください。280文字以内で、日本語のみで出力してください。

告知文:`;

return {
  json: {
    speaker_data: cleanedData,
    template_data: snsTemplateData,
    gemini_prompt: fewShotPrompt,
    workflow_metadata: {
      trigger_time: new Date().toISOString(),
      source: "webhook",
    },
  },
};
