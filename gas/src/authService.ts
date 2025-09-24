import { CONFIG } from "./config";

/**
 * CONFIG に想定する項目（参考）
 * - SA_CLIENT_EMAIL: string         // サービスアカウント email
 * - SA_PRIVATE_KEY: string          // サービスアカウントの秘密鍵（PKCS#8、\n を含む可能性あり）
 * - CLOUD_RUN_SERVICE_URL?: string  // 例: https://n8n-prod-7fdyxrdvcq-an.a.run.app
 * - N8N_WEBHOOK_URL?: string        // 例: https://.../webhook/speaker-approval
 */

/** Base64URL（パディング除去） */
const b64url = (bytes: string | number[]): string =>
  Utilities.base64EncodeWebSafe(
    typeof bytes === "string" ? bytes : (bytes as unknown as string)
  ).replace(/=+$/, "");

const b64urlJson = (obj: unknown) => b64url(JSON.stringify(obj));

/** 秘密鍵の正規化（PKCS#8、BEGIN/END含む） */
function normalizePrivateKey(pem: string): string {
  let k = pem;
  if (k.includes("\\n")) k = k.replace(/\\n/g, "\n"); // 環境変数由来のエスケープ対策
  if (!k.includes("-----BEGIN PRIVATE KEY-----"))
    throw new Error("Invalid private key: missing BEGIN header");
  if (!k.includes("-----END PRIVATE KEY-----"))
    throw new Error("Invalid private key: missing END footer");
  return k.trim();
}

/**
 * aud は「実際に叩くURL（パスまで完全一致）」にする。
 * 例）https://<host>/webhook/speaker-approval
 */
function buildServiceAccountJwtForIap(audienceUrlWithPath: string): string {
  if (!CONFIG.SA_CLIENT_EMAIL || !CONFIG.SA_PRIVATE_KEY) {
    throw new Error("SA_CLIENT_EMAIL / SA_PRIVATE_KEY が未設定です");
  }

  // aud はパス込み（クエリ/フラグメントは除去
  const aud = audienceUrlWithPath.replace(/[#?].*$/, "");
  if (!/^https:\/\/[^/]+\/.+/.test(aud)) {
    throw new Error(
      `aud にはパス込みのURLを指定してください: ${audienceUrlWithPath}`
    );
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header: Record<string, unknown> = { alg: "RS256", typ: "JWT" };

  const payload = {
    iss: CONFIG.SA_CLIENT_EMAIL,
    sub: CONFIG.SA_CLIENT_EMAIL,
    aud,
    iat,
    exp,
  };

  const key = normalizePrivateKey(CONFIG.SA_PRIVATE_KEY);
  const unsigned = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sigBytes = Utilities.computeRsaSha256Signature(unsigned, key);
  return `${unsigned}.${b64url(sigBytes)}`;
}

/** IAP保護エンドポイントに POST（JWT直送方式） */
export function postToIapProtectedWebhook(
  url: string,
  payload: unknown
): GoogleAppsScript.URL_Fetch.HTTPResponse {
  // url は実際に叩くエンドポイント（例：.../webhook/speaker-approval）
  const jwt = buildServiceAccountJwtForIap(url);
  return UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${jwt}` },
    payload: JSON.stringify(payload),
    followRedirects: true,
    muteHttpExceptions: true,
  });
}

/** Token エンドポイント呼び出し */
function tokenRequest(params: Record<string, string>): any {
  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: params,
    muteHttpExceptions: true,
  });
  const text = res.getContentText();
  if (res.getResponseCode() !== 200) {
    throw new Error(`Token endpoint error: ${res.getResponseCode()} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse token response: ${text}`);
  }
}

/** OAuth2: JWTベアラー用アサーション（aud は token エンドポイント固定） */
function buildJwtAssertion(opts: {
  saEmail: string;
  privateKeyPem: string;
  scope?: string; // アクセストークン用
  targetAudience?: string; // IDトークン用（OIDC）
  lifetimeSec?: number;
}): string {
  const { saEmail, scope, targetAudience } = opts;
  const privateKeyPem = normalizePrivateKey(opts.privateKeyPem);

  if (scope && targetAudience)
    throw new Error("scope と targetAudience は同時指定不可");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (opts.lifetimeSec ?? 3600);

  const header: Record<string, unknown> = { alg: "RS256", typ: "JWT" };

  const claim: Record<string, unknown> = {
    iss: saEmail,
    sub: saEmail,
    aud: "https://oauth2.googleapis.com/token", // ★固定
    iat,
    exp,
  };
  if (scope) claim.scope = scope;
  if (targetAudience) claim.target_audience = targetAudience;

  const unsigned = `${b64urlJson(header)}.${b64urlJson(claim)}`;
  const sigBytes = Utilities.computeRsaSha256Signature(unsigned, privateKeyPem);
  return `${unsigned}.${b64url(sigBytes)}`;
}

/** アクセストークン（Google API 呼出し用） */
export function fetchServiceAccountAccessToken(scope: string): string {
  if (!CONFIG.SA_CLIENT_EMAIL || !CONFIG.SA_PRIVATE_KEY) {
    throw new Error("SA_CLIENT_EMAIL / SA_PRIVATE_KEY が未設定です");
  }
  if (!scope) throw new Error("scope を指定してください");

  const assertion = buildJwtAssertion({
    saEmail: CONFIG.SA_CLIENT_EMAIL,
    privateKeyPem: CONFIG.SA_PRIVATE_KEY,
    scope,
  });

  const json = tokenRequest({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  if (!json.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(json)}`);
  }
  return json.access_token as string;
}

/** IDトークン（OIDCが必要なとき用。IAP直は通常A方式で不要） */
export function fetchServiceAccountIdToken(targetAudienceUrl: string): string {
  if (!CONFIG.SA_CLIENT_EMAIL || !CONFIG.SA_PRIVATE_KEY) {
    throw new Error("SA_CLIENT_EMAIL / SA_PRIVATE_KEY が未設定です");
  }
  if (!/^https:\/\/[^/]+(\/.*)?$/.test(targetAudienceUrl)) {
    throw new Error(`不正な audience URL: ${targetAudienceUrl}`);
  }

  const assertion = buildJwtAssertion({
    saEmail: CONFIG.SA_CLIENT_EMAIL,
    privateKeyPem: CONFIG.SA_PRIVATE_KEY,
    targetAudience: targetAudienceUrl.replace(/[#?].*$/, ""), // クエリ/フラグメント除去
  });

  const json = tokenRequest({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  if (!json.id_token) {
    throw new Error(`No id_token in response: ${JSON.stringify(json)}`);
  }
  return json.id_token as string;
}

/** （デバッグ用）JWT/IDトークンの aud を見る */
export function debugLogAud(jwtOrIdToken: string) {
  try {
    const payloadB64 = jwtOrIdToken.split(".")[1];
    const payloadJson = JSON.parse(
      Utilities.newBlob(
        Utilities.base64DecodeWebSafe(payloadB64)
      ).getDataAsString()
    );
    Logger.log(`aud=${payloadJson.aud}`);
  } catch (e) {
    Logger.log(`Failed to decode token: ${e}`);
  }
}
