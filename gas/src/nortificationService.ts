import { CONFIG } from "./config";
import { fetchServiceAccountAccessToken } from "./authService";

export function sendChatCardV2(
  space: string,
  cardV2: any,
  threadKey?: string
): any {
  const spaceId = space.replace(/^spaces\//, "");
  const url = threadKey
    ? `https://chat.googleapis.com/v1/spaces/${encodeURIComponent(
        spaceId
      )}/messages?threadKey=${encodeURIComponent(threadKey)}`
    : `https://chat.googleapis.com/v1/spaces/${encodeURIComponent(
        spaceId
      )}/messages`;

  const payload = JSON.stringify({ cardsV2: [cardV2] });
  const accessToken = fetchServiceAccountAccessToken(
    "https://www.googleapis.com/auth/chat.bot"
  );
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    headers: { Authorization: `Bearer ${accessToken}` },
    contentType: "application/json",
    payload,
    muteHttpExceptions: true,
  });
  return JSON.parse(res.getContentText());
}

export function updateChatMessage(messageName: string, cardV2: any): any {
  const url = `https://chat.googleapis.com/v1/${messageName}?updateMask=cardsV2`; // PATCH
  const payload = JSON.stringify({ cardsV2: [cardV2] });
  const accessToken = fetchServiceAccountAccessToken(
    "https://www.googleapis.com/auth/chat.bot"
  );
  const res = UrlFetchApp.fetch(url, {
    method: "patch",
    headers: { Authorization: `Bearer ${accessToken}` },
    contentType: "application/json",
    payload,
    muteHttpExceptions: true,
  });
  return JSON.parse(res.getContentText());
}

export function buildApprovalCard(params: {
  name: string;
  portrait_gcs_url: string;
  eventPageText: string;
  sheetUrl: string;
  rowId: string;
}): any {
  return {
    cardId: `confirm-${params.rowId}`,
    card: {
      header: {
        title: "登壇者承認",
        subtitle: params.name,
        imageUrl: params.portrait_gcs_url,
      },
      sections: [
        { widgets: [{ textParagraph: { text: params.eventPageText } }] },
        {
          widgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: "承認",
                    onClick: {
                      action: {
                        function: "approve_post",
                        parameters: [
                          { key: "rowId", value: params.rowId },
                          { key: "cardId", value: `confirm-${params.rowId}` },
                        ],
                      },
                    },
                  },
                  {
                    text: "却下",
                    onClick: {
                      action: {
                        function: "reject_post",
                        parameters: [
                          { key: "rowId", value: params.rowId },
                          { key: "cardId", value: `confirm-${params.rowId}` },
                        ],
                      },
                    },
                  },
                  {
                    text: "シートを開く",
                    onClick: { openLink: { url: params.sheetUrl } },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}
