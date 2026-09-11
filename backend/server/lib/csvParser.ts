import { ValidationError } from './errors';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  rawRecords: Array<Record<string, string>>;
}

export function parseCsv(csvContent: string): ParsedCsv {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new ValidationError('CSV content is empty or invalid.');
  }

  const content = csvContent.charCodeAt(0) === 0xfeff ? csvContent.slice(1) : csvContent;
  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') i++;
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.length > 1 || currentRow[0] !== '') rawRows.push(currentRow);
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') rawRows.push(currentRow);
  }

  if (rawRows.length === 0) throw new ValidationError('CSV file contains no data or headers.');

  const headers = rawRows[0].map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header === '')) {
    throw new ValidationError('CSV file is missing a valid header row.');
  }

  const rows = rawRows.slice(1);
  const rawRecords = rows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

  return { headers, rows, rawRecords };
}
