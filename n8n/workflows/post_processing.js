// Gemini Post Processing - simplified & robust input detection
const allInputs = ($input.all() || []).map((i) => i?.json);

// 重複チェック結果を確認
const skipData = allInputs.find((j) => j && j.skip_processing);
if (skipData) {
  console.log(
    `[Post Processing] 処理をスキップします。理由: ${skipData.reason}`
  );
  return {
    json: {
      skip_processing: true,
      reason: skipData.reason,
      email: skipData.email,
      workflow_metadata: {
        trigger_time: new Date().toISOString(),
        source: "webhook",
      },
    },
  };
}

// 前処理データ候補を自動検出（speaker_data を含むもの）
let pre =
  allInputs.find((j) => j && (j.speaker_data || j.template_data)) ||
  $items("Data Preprocessing1")?.[0]?.json ||
  $items("Data Preprocessing")?.[0]?.json ||
  $input.first()?.json ||
  {};

// Gemini出力候補を自動検出（content/candidates/response/text いずれかを含むもの）
let gem =
  allInputs.find(
    (j) =>
      j &&
      (Array.isArray(j) ||
        j.content ||
        j.candidates ||
        j.response ||
        j.text ||
        j.output ||
        j.message)
  ) ||
  $items("Gemini Text Generation")?.[0]?.json ||
  $input.last()?.json;

function getGeminiText(r) {
  if (!r) return "";
  if (Array.isArray(r)) {
    const t = r?.[0]?.content?.parts?.[0]?.text;
    return typeof t === "string" ? t.trim() : "";
  }
  const t =
    r?.content?.parts?.[0]?.text ??
    r?.candidates?.[0]?.content?.parts?.[0]?.text ??
    r?.response?.text ??
    r?.text ??
    r?.output ??
    r?.message;
  return typeof t === "string" ? t.trim() : "";
}

const speakerDefaults = {
  name: "登壇者名不明",
  email: "",
  affiliation: "所属不明",
  title: "肩書不明",
  session_title: "セッションタイトル不明",
  bio: "紹介文なし",
};
const templateDefaults = { short_bio: "紹介文なし" };

const speaker = { ...speakerDefaults, ...(pre?.speaker_data || {}) };
const template = { ...templateDefaults, ...(pre?.template_data || {}) };

let text = getGeminiText(gem);

const invalidPhrases = [
  "As an AI",
  'I don\'t "think"',
  "computational process",
  "eulogy",
  "grandmother",
  "Of course. I am so very sorry",
];
const isInvalid =
  !text ||
  text.length < 50 ||
  !text.includes("DevFest") ||
  invalidPhrases.some((p) => text.includes(p));

if (isInvalid) {
  const bio = template.short_bio || speaker.bio || "";
  const bioShort = bio
    ? bio.slice(0, 80) + (bio.length > 80 ? "..." : "")
    : "登壇者の紹介文";
  text = `DevFest 2025 in Kwansai
「${speaker.session_title}」のご紹介 🎯

${speaker.affiliation} ${speaker.title}の
${speaker.name}さんが登壇！

${bioShort}
✨

🔗 詳細・申込はこちら ⬇️
https://gdgkwansai.connpass.com/event/366115/`;
}

if (text.length > 280) text = text.slice(0, 277) + "...";

const ng = ["spam", "fake", "scam"];
if (ng.some((w) => text.toLowerCase().includes(w))) {
  throw new Error("Generated text contains inappropriate content");
}

return {
  json: {
    ...speaker,
    generated_post_text: text,
    post_metadata: {
      character_count: text.length,
      generation_timestamp: new Date().toISOString(),
      model_used: "gemini-1.5-flash",
      data_source: pre?.speaker_data ? "preprocessed" : "fallback",
      extraction_method: isInvalid ? "template" : "gemini",
    },
  },
};
