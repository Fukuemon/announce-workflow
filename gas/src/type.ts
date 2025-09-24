export type ColumnKey =
  | "timestamp"
  | "name"
  | "name_kana"
  | "email"
  | "affiliation"
  | "title"
  | "portrait_image"
  | "bio"
  | "session_title"
  | "session_description"
  | "connpass_id"
  | "x_account";

export type ExtraColumnKey =
  | "portrait_gcs_url"
  | "event_page_text"
  | "sns_post_text"
  | "post_status";

export type AllColumnKey = ColumnKey | ExtraColumnKey;

export type ColumnMap = { [K in AllColumnKey]?: number };

export type ExtraColumnDefinition = {
  key: ExtraColumnKey;
  name: string;
};

export interface SpeakerSubmission {
  rowIndex: number;
  valuesByColIndex: Record<number, string>;
  columns: ColumnMap;
}

export interface ChatActionParameter {
  key: string;
  value: string;
}

export interface ChatEvent {
  type: string;
  message?: any;
  action?: { parameters?: ChatActionParameter[]; actionMethodName?: string };
  space?: { name?: string; type?: string };
  user?: { name?: string; displayName?: string; email?: string };
  messageThread?: { name?: string };
}
