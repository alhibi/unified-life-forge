/**
 * `csv-parse` worker: streaming RFC 4180 parser, returns typed rows.
 * Used by the Time Ledger exporter, German Club imports, and PKM bulk
 * uploads.
 */

import * as Comlink from 'comlink';

export type CsvInput = {
  op: 'parse';
  text: string;
  delimiter?: string;
  hasHeader: boolean;
};

export type CsvOutput = {
  op: 'parse';
  headers: string[];
  rows: string[][];
};

function parse(input: string, delimiter: string): { headers: string[]; rows: string[][] } {
  const cells: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      cells.push(row);
      row = [];
      field = '';
      continue;
    }
    field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    cells.push(row);
  }
  if (cells.length === 0) return { headers: [], rows: [] };
  const headers = cells[0];
  return { headers, rows: cells.slice(1) };
}

const api = {
  run(input: CsvInput): CsvOutput {
    const delim = input.delimiter ?? ',';
    const parsed = parse(input.text, delim);
    if (!input.hasHeader) {
      return { op: 'parse', headers: [], rows: parsed.rows.length > 0 ? [['', ...parsed.rows[0]].concat(parsed.rows.slice(1).map((r) => r.join(delim)))] : [] };
    }
    return { op: 'parse', headers: parsed.headers, rows: parsed.rows };
  },
};

Comlink.expose(api);