import { CONFIG } from "./config";

export function findFormResponseSheet(): GoogleAppsScript.Spreadsheet.Sheet | null {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const target = sheets.find((s) => s.getName().includes("フォームの回答"));
  return target || null;
}
