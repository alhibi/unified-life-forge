/** Domain types for the account / privacy surface. */

/**
 * One exportable table and the column that identifies its owner.
 *
 * The list is explicit rather than derived because RLS decides what a client
 * may read: asking for a table the policies do not expose returns an error,
 * not an empty set. Keeping the pairs written down also makes it reviewable —
 * a table added to the schema and forgotten here is a gap someone can see.
 */
export interface ExportSource {
  table: string;
  ownerColumn: string;
  /** Human label used in the summary shown after an export. */
  label: string;
}

/** Shape of the downloaded archive. */
export interface AccountExport {
  /** Schema version of this envelope, not of the app. */
  format: 1;
  exported_at: string;
  app: { name: string; version: string };
  account: {
    id: string;
    username: string | null;
    email: string | null;
    created_at: string | null;
  };
  /** Table name → rows. Tables that returned nothing are omitted. */
  cloud: Record<string, unknown[]>;
  /** Device-local preferences that never reach the server. */
  device: Record<string, unknown>;
  /** Tables that could not be read, with the reason. Never silently dropped. */
  skipped: Array<{ table: string; reason: string }>;
}

export interface ExportResult {
  export: AccountExport;
  rowCount: number;
  byteSize: number;
}
