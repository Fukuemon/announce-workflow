import { ChatActionParameter } from "./type";
import { CONFIG } from "./config";
import { findFormResponseSheet } from "./sheetFinder";
import { buildColumnMap } from "./columnMapping";
import { updateChatMessage } from "./nortificationService";
import { postToIapProtectedWebhook } from "./authService";

/** IAP認証付きでn8n Webhookを呼び出す関数 */
function callN8nWebhook(data: any): void {
  const url = CONFIG.N8N_WEBHOOK_URL || "";

  if (!/^https?:\/\//i.test(url)) {
    Logger.log(`[callN8nWebhook] Skip webhook due to invalid URL: ${url}`);
    return;
  }

  try {
    Logger.log(`[callN8nWebhook] Calling webhook: ${url}`);
    const response = postToIapProtectedWebhook(url, data);

    Logger.log(
      `[callN8nWebhook] Response: ${response.getResponseCode()} ${response.getContentText()}`
    );

    if (response.getResponseCode() >= 400) {
      Logger.log(
        `[callN8nWebhook] HTTP Error: ${response.getResponseCode()} ${response.getContentText()}`
      );
    }
  } catch (error) {
    Logger.log(`[callN8nWebhook] Error: ${error}`);
  }
}

/** parameters を配列/オブジェクト両対応で辞書化 */
function normalizeParameters(params: any): Record<string, string> {
  if (!params) return {};
  if (Array.isArray(params)) {
    const m: Record<string, string> = {};
    for (const p of params) {
      if (p && typeof p.key === "string") m[p.key] = String(p.value ?? "");
    }
    return m;
  }
  if (typeof params === "object") {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) m[k] = String(v ?? "");
    return m;
  }
  return {};
}

/** ※ Add-on 側で安全に通る “テキストのみ” のレスポンス */
function simpleTextResponse(text: string) {
  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    text,
  };
}

/** カード置換用（REST で PATCH する内容） */
function buildResultCardV2(cardId: string, title: string, text: string) {
  return {
    cardId,
    card: {
      header: { title },
      sections: [{ widgets: [{ textParagraph: { text } }] }],
    },
  };
}

// Chat App 接続方式用ハンドラ（onMessage / onCardClick）
export function onMessage(e: any): any {
  const id = Utilities.getUuid().slice(0, 8);
  return buildSimpleConfirmCard(id);
}

/** 承認ボタンが押されたときのグローバル関数 */
export function handleApprovePost(e: any): any {
  Logger.log(
    `[handleApprovePost] triggered with event: ${JSON.stringify(e, null, 2)}`
  );
  e.commonEventObject = e.commonEventObject || {};
  e.commonEventObject.invokedFunction = "approve_post";
  return onCardClick(e);
}

/** 却下ボタンが押されたときのグローバル関数 */
export function handleRejectPost(e: any): any {
  Logger.log(
    `[handleRejectPost] triggered with event: ${JSON.stringify(e, null, 2)}`
  );
  e.commonEventObject = e.commonEventObject || {};
  e.commonEventObject.invokedFunction = "reject_post";
  return onCardClick(e);
}

/** クリックイベント共通ハンドラ */
export function onCardClick(e: any): any {
  Logger.log(`[onCardClick] Event structure: ${JSON.stringify(e)}`);

  const common = e.common || e.commonEventObject || {};
  const paramsArr =
    e.action?.parameters ??
    common.parameters ??
    e.commonEventObject?.parameters ??
    [];
  const parameters = normalizeParameters(paramsArr);

  const actionName = e.action?.actionMethodName || common.invokedFunction || "";
  const rowId = parameters.rowId;
  const cardId = parameters.cardId || (rowId ? `confirm-${rowId}` : "unknown");

  // 置換対象メッセージ名（REST PATCH 用）
  const messageName =
    e.chat?.buttonClickedPayload?.message?.name || e.message?.name || "";

  Logger.log(
    `[onCardClick] actionName: ${actionName}, rowId: ${rowId}, cardId: ${cardId}`
  );
  Logger.log(`[onCardClick] parameters: ${JSON.stringify(parameters)}`);
  Logger.log(`[onCardClick] messageName: ${messageName}`);

  // REST でカード置換するヘルパ
  const patchMessage = (title: string, text: string) => {
    Logger.log(
      `[patchMessage] Called with title: ${title}, messageName: ${messageName}, cardId: ${cardId}`
    );

    if (!messageName) {
      Logger.log(
        `[onCardClick] messageName is empty. Skip REST patch. title=${title}`
      );
      return;
    }
    try {
      const cardV2 = buildResultCardV2(cardId, title, text);
      Logger.log(
        `[patchMessage] Updating message: ${messageName} with card: ${JSON.stringify(
          cardV2
        )}`
      );

      const result = updateChatMessage(messageName, cardV2);
      Logger.log(`[patchMessage] PATCH result: ${JSON.stringify(result)}`);
    } catch (patchErr) {
      Logger.log(
        `[onCardClick] PATCH failed (${messageName}): ${String(patchErr)}`
      );
    }
  };

  // --- 承認 ---
  if ((actionName === "approve_post" || parameters.op === "approve") && rowId) {
    Logger.log(`[onCardClick] Starting approval process for rowId: ${rowId}`);

    try {
      const sheet = findFormResponseSheet();
      if (!sheet) throw new Error("sheet not found");

      const header = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0] as string[];
      const map = buildColumnMap(header);

      const rowNumber = Number(rowId.replace("row-", ""));
      if (!rowNumber || rowNumber < 2) throw new Error("invalid rowId");

      // 重複実行チェック：既に承認済みの場合はスキップ
      const currentStatus =
        map.post_status !== undefined
          ? sheet.getRange(rowNumber, map.post_status + 1).getValue()
          : "";

      if (currentStatus === "approved") {
        Logger.log(`[onCardClick] Already approved. Skipping. rowId: ${rowId}`);
        patchMessage("既に承認済み", "この登壇者は既に承認済みです。");
        return null;
      }

      // 投稿文の存在チェック：既にSNS投稿文がある場合はスキップ
      const existingSnsPost =
        map.sns_post_text !== undefined
          ? sheet.getRange(rowNumber, map.sns_post_text + 1).getValue()
          : "";

      if (existingSnsPost && String(existingSnsPost).trim().length > 0) {
        Logger.log(
          `[onCardClick] SNS post already exists. Skipping. rowId: ${rowId}`
        );
        patchMessage("既に処理済み", "この登壇者の投稿文は既に生成済みです。");
        return null;
      }

      Logger.log(
        `[onCardClick] Setting post_status to approved for row: ${rowNumber}`
      );
      if (map.post_status !== undefined)
        sheet.getRange(rowNumber, map.post_status + 1).setValue("approved");

      // N8N webhook（認証付き）
      const url = CONFIG.N8N_WEBHOOK_URL || "";
      if (/^https?:\/\//i.test(url)) {
        try {
          const header2 = sheet
            .getRange(1, 1, 1, sheet.getLastColumn())
            .getValues()[0] as string[];
          const map2 = buildColumnMap(header2);
          const rowValues2 = sheet
            .getRange(rowNumber, 1, 1, sheet.getLastColumn())
            .getValues()[0] as string[];

          const name =
            map2.name !== undefined ? String(rowValues2[map2.name]) : "";
          const email =
            map2.email !== undefined ? String(rowValues2[map2.email]) : "";

          // 認証付きでn8n Webhookを呼び出し（IAP/IAM自動判定）
          // n8nワークフローはemailでスプレッドシートから該当行を検索するため、
          // 識別用の最小限のデータのみ送信
          callN8nWebhook({
            name,
            email,
          });
        } catch (whErr) {
          Logger.log(`[onCardClick] webhook error (ignored): ${whErr}`);
        }
      } else if (url) {
        Logger.log(`[onCardClick] Skip webhook due to invalid URL: ${url}`);
      }

      // カードを更新して処理完了
      patchMessage("処理完了", "投稿文の生成が完了しました。");

      // ChatAppではテキストレスポンスを返さない
      return null;
    } catch (err) {
      Logger.log(`[onCardClick][approve] error: ${err}`);
      patchMessage("エラー", "処理でエラーが発生しました");
      return simpleTextResponse("承認処理でエラーが発生しました");
    }
  }

  // --- 却下 ---
  if ((actionName === "reject_post" || parameters.op === "reject") && rowId) {
    try {
      const sheet = findFormResponseSheet();
      if (!sheet) throw new Error("sheet not found");

      const header = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0] as string[];
      const map = buildColumnMap(header);

      const rowNumber = Number(rowId.replace("row-", ""));
      if (!rowNumber || rowNumber < 2) throw new Error("invalid rowId");

      if (map.post_status !== undefined)
        sheet.getRange(rowNumber, map.post_status + 1).setValue("pending");

      patchMessage("処理結果", "却下しました。");
      // ChatAppではテキストレスポンスを返さない
      return null;
    } catch (err) {
      Logger.log(`[onCardClick][reject] error: ${err}`);
      patchMessage("エラー", "却下処理でエラーが発生しました");
      return simpleTextResponse("却下処理でエラーが発生しました");
    }
  }

  // フォールバック
  patchMessage("通知", "操作を認識できませんでした。");
  return null;
}

export function onAddToSpace(e: any): any {
  return { text: "Bot が追加されました。" };
}

export function onRemoveFromSpace(e: any): void {
  // 何もしない
}

function buildSimpleConfirmCard(id: string): any {
  return {
    text: " ",
    cardsV2: [
      {
        cardId: "confirm-" + id,
        card: {
          header: { title: "承認リクエスト", subtitle: `ID: ${id}` },
          sections: [
            {
              widgets: [
                { textParagraph: { text: "この処理を実行しますか？" } },
              ],
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "実行",
                        onClick: {
                          action: {
                            function: "approve_post",
                            parameters: [
                              { key: "op", value: "approve" },
                              { key: "cardId", value: "confirm-" + id },
                            ],
                          },
                        },
                      },
                      {
                        text: "キャンセル",
                        onClick: {
                          action: {
                            function: "reject_post",
                            parameters: [
                              { key: "op", value: "reject" },
                              { key: "cardId", value: "confirm-" + id },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// GAS から直接実行できるようにグローバル公開
(globalThis as any).onMessage = onMessage;
(globalThis as any).onCardClick = onCardClick;
(globalThis as any).onAddToSpace = onAddToSpace;
(globalThis as any).onRemoveFromSpace = onRemoveFromSpace;
(globalThis as any).chatHandler_approve_post = handleApprovePost;
(globalThis as any).chatHandler_reject_post = handleRejectPost;
