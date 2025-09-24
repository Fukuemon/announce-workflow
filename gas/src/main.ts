import { CONFIG } from "./config";
import { ColumnKey } from "./type";
import { findFormResponseSheet } from "./sheetFinder";
import { buildColumnMap, ensureExtraColumns } from "./columnMapping";
import { uploadImageToGCS, extractFileIdFromUrl } from "./imageProcessor";
import { buildApprovalCard, sendChatCardV2 } from "./nortificationService";
import { generateEventPageText } from "./templateEngine";
import "./setupProperties"; // GAS公開関数をバンドルに含める
import "./chatHandler"; // Chat App ハンドラをバンドルに含める
import "./authService"; // 認証サービスをバンドルに含める

export function onFormSubmit(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  Logger.log(`[onFormSubmit] 開始. event: ${JSON.stringify(e)}`);
  try {
    // フォームの回答シートを取得
    const sheet = findFormResponseSheet();
    if (!sheet) {
      Logger.log(
        "[onFormSubmit] Error: フォームの回答シートが見つかりません。"
      );
      return;
    }

    // ヘッダーを取得
    const header = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0] as string[];
    Logger.log(`[onFormSubmit] ヘッダー: ${header.join(", ")}`);

    // 追加カラムを取得
    const updatedHeader = ensureExtraColumns(sheet, header);
    // カラムマッピングを取得
    const columnMap = buildColumnMap(updatedHeader);
    Logger.log(`[onFormSubmit] カラムマッピング: ${JSON.stringify(columnMap)}`);

    // フォームの回答を取得
    const rowId = e.range.getRow();
    const values = sheet
      .getRange(rowId, 1, 1, updatedHeader.length)
      .getValues()[0];
    Logger.log(`[onFormSubmit] 処理中の行ID: ${rowId}`);

    const getVal = (key: ColumnKey) =>
      columnMap[key] !== undefined ? values[columnMap[key]!] : "";

    const speakerName = getVal("name") as string;
    const portraitImageUrl = getVal("portrait_image") as string;
    Logger.log(`[onFormSubmit] 登壇者名: ${speakerName}`);
    Logger.log(`[onFormSubmit] ポートレート画像URL: ${portraitImageUrl}`);
    const portraitFileId = extractFileIdFromUrl(portraitImageUrl);
    if (!portraitFileId) {
      Logger.log(
        `[onFormSubmit] Error: ファイルIDを抽出できませんでした: ${getVal(
          "portrait_image"
        )}`
      );
    }

    // GCSに画像をアップロード
    const portraitUrl = portraitFileId
      ? uploadImageToGCS(portraitFileId, speakerName)
      : CONFIG.DEFAULT_PORTRAIT_URL;
    Logger.log(`[onFormSubmit] ポートレートURL: ${portraitUrl}`);

    // スプレッドシートにGCSのURLを保存
    if (columnMap.portrait_gcs_url !== undefined) {
      sheet
        .getRange(rowId, columnMap.portrait_gcs_url + 1)
        .setValue(portraitUrl);
      Logger.log(`[onFormSubmit] GCS URLを保存しました。`);
    }

    // イベントページ掲載文を生成（connpass用）
    const eventPageParams = {
      name: speakerName,
      affiliation: getVal("affiliation") as string,
      title: getVal("title") as string,
      session_title: getVal("session_title") as string,
      session_description: getVal("session_description") as string,
      portrait_gcs_url: portraitUrl,
      xAccount: getVal("x_account") as string,
      bio: getVal("bio") as string,
    };

    const eventPageText = generateEventPageText(eventPageParams);

    // イベントページ掲載文をスプレッドシートに保存
    if (columnMap.event_page_text !== undefined) {
      sheet
        .getRange(rowId, columnMap.event_page_text + 1)
        .setValue(eventPageText);
      Logger.log(`[onFormSubmit] イベントページ掲載文を保存しました。`);
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SpreadsheetApp.getActiveSpreadsheet().getId()}/edit#gid=${sheet.getSheetId()}`;

    // 承認カードを生成
    const card = buildApprovalCard({
      rowId: `row-${rowId}`,
      name: speakerName,
      portrait_gcs_url: portraitUrl,
      eventPageText: eventPageText,
      sheetUrl,
    });

    Logger.log(
      `[onFormSubmit] チャットカードを送信します: ${CONFIG.GOOGLE_CHAT_SPACE_ID}`
    );
    // チャットカードを送信
    const message = sendChatCardV2(
      CONFIG.GOOGLE_CHAT_SPACE_ID,
      card,
      `row-${rowId}`
    );

    // メッセージ情報を保存
    if (message && message.name) {
      if (columnMap.post_status !== undefined) {
        sheet.getRange(rowId, columnMap.post_status + 1).setValue("pending");
      }
      Logger.log(
        `[onFormSubmit] メッセージ情報を保存しました。 messageName: ${message.name}`
      );
    } else {
      Logger.log(
        "[onFormSubmit] Error: チャットカードを送信できませんでした。または、メッセージレスポンスを取得できませんでした。"
      );
    }
  } catch (err: any) {
    Logger.log(
      `[onFormSubmit] 予期しないエラーが発生しました: ${err.toString()}`
    );
    Logger.log(`[onFormSubmit] スタックトレース: ${err.stack}`);
  }
  Logger.log("[onFormSubmit] 終了");
}

// GAS から直接実行できるようにグローバル公開
(globalThis as any).onFormSubmit = onFormSubmit;
(globalThis as any).manualTestWorkflow = manualTestWorkflow;

// 手動テスト用エントリポイント
export function manualTestWorkflow(): void {
  Logger.log("[manualTestWorkflow] 開始");
  try {
    const sheet = findFormResponseSheet();
    if (!sheet) {
      Logger.log(
        "[manualTestWorkflow] Error: フォームの回答シートが見つかりません。"
      );
      return;
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("[manualTestWorkflow] Error: データ行がありません。");
      return;
    }
    Logger.log(`[manualTestWorkflow] 最終行を処理します: ${lastRow}`);

    // onFormSubmitと同様のイベントオブジェクトを擬似的に作成
    const pseudoEvent = {
      range: sheet.getRange(lastRow, 1),
      // namedValues や values は onFormSubmit 内で range から再取得されるため、ここでは不要
    } as GoogleAppsScript.Events.SheetsOnFormSubmit;

    // onFormSubmitを直接呼び出す
    onFormSubmit(pseudoEvent);
  } catch (err: any) {
    Logger.log(
      `[manualTestWorkflow] 予期しないエラーが発生しました: ${err.toString()}`
    );
    Logger.log(`[manualTestWorkflow] スタックトレース: ${err.stack}`);
  }
  Logger.log("[manualTestWorkflow] 終了");
}
