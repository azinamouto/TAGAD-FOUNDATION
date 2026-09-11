import { ValidationError } from './errors';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  rawRecords: Array<Record<string, string>>;
}

/**
 * Parses RFC 4180-compliant CSV text with proper handling of quotes,
 * commas inside quotes, multi-line quoted fields, and CRLF line breaks.
 */
export function parseCsv(csvContent: string): ParsedCsv {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new ValidationError('CSV content is empty or invalid.');
  }

  // Remove BOM if present
  const content = csvContent.charCodeAt(0) === 0xfeff ? csvContent.slice(1) : csvContent;

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes) {
        // Look ahead for escaped double-quote
        if (i + 1 < len && content[i + 1] === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        inQuotes = true;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Handle \r\n
      if (char === '\r' && i + 1 < len && content[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = '';

      // Ignore empty trailing lines
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rawRows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
    i++;
  }

  // Push final cell/row if exists
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) {
    throw new ValidationError('CSV file contains no data or headers.');
  }

  const headers = rawRows[0].map((h) => h.trim());
  if (headers.length === 0 || headers.every((h) => h === '')) {
    throw new ValidationError('CSV file is missing a valid header row.');
  }

  const rows = rawRows.slice(1);
  const rawRecords: Array<Record<string, string>> = [];

  for (const row of rows) {
    // Skip rows where every cell is blank
    const hasAnyVal = row.some((cell) => cell !== '');
    if (!hasAnyVal) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      record[header] = row[colIdx] !== undefined ? row[colIdx] : '';
    });
    rawRecords.push(record);
  }

  return {
    headers,
    rows,
    rawRecords,
  };
}
