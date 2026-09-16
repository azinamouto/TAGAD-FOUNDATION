import { ValidationError } from './errors';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  rawRecords: Array<Record<string, string>>;
  rowNumbers: number[];
  layout: { headerRow: number; headerRowCount: number; skippedBannerRows: number };
}

export interface CsvLayout {
  /** One-based CSV record number (quoted multiline values remain one record). */
  headerRow?: number;
  headerRowCount?: number;
}

export function parseCsv(csvContent: string, layout: CsvLayout = {}): ParsedCsv {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) throw new ValidationError('CSV layout must be an object.');
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
      rawRows.push(currentRow);
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (inQuotes) throw new ValidationError('CSV contains an unterminated quoted field.');

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') rawRows.push(currentRow);
  }

  if (rawRows.length === 0) throw new ValidationError('CSV file contains no data or headers.');

  for (const [key, value] of Object.entries(layout)) {
    if (!['headerRow', 'headerRowCount'].includes(key) || !Number.isInteger(value) || value < 1 ||
        (key === 'headerRowCount' && value > 5)) throw new ValidationError('Invalid CSV header layout. Use positive record numbers and at most five header rows.');
  }
  let start = layout.headerRow ? layout.headerRow - 1 : 0;
  if (!layout.headerRow) {
    // Conservative banner detection: skip blank and single-label title records.
    while (start < rawRows.length - 1 && rawRows[start].filter(Boolean).length < 2) start++;
    // A genuine single-column CSV should retain its first nonempty header.
    if (!rawRows.slice(0, start + 1).some(row => row.filter(Boolean).length >= 2)) start = rawRows.findIndex(row => row.some(Boolean));
  }
  let count = layout.headerRowCount ?? 1;
  if (!layout.headerRowCount) {
    while (count < 5 && rawRows[start + count]?.[0] === '' &&
           rawRows[start + count].filter(Boolean).length >= 2 &&
           rawRows[start + count].filter(Boolean).every(value => /^(male|female|total|both sexes|number|percent(?:age)?|\d{4})$/i.test(value))) count++;
  }
  if (start < 0 || start + count > rawRows.length) throw new ValidationError('CSV header layout is outside the file.');
  const headerRows = rawRows.slice(start, start + count);
  const width = Math.max(...headerRows.map(row => row.length));
  const expanded = headerRows.map((row, index) => {
    let parent = '';
    return Array.from({ length: width }, (_, col) => {
      const value = row[col] || '';
      if (value) parent = value;
      return index < count - 1 ? (value || parent) : value;
    });
  });
  const headers = Array.from({ length: width }, (_, col) =>
    [...new Set(expanded.map(row => row[col]).filter(Boolean))].join(' / '));
  if (headers.length === 0 || headers.every((header) => header === '')) {
    throw new ValidationError('CSV file is missing a valid header row.');
  }
  if (headers.some(header => !header) || new Set(headers).size !== headers.length) {
    throw new ValidationError('CSV headers must be nonempty and unique. Select the full header layout before importing.');
  }

  const dataRows = rawRows.slice(start + count).map((row, idx) => ({ row, number: start + count + idx + 1 }))
    .filter(({ row }) => row.some(Boolean));
  for (const { row, number } of dataRows) {
    if (row.length > width && row.slice(width).some(Boolean)) throw new ValidationError(`CSV record ${number} has more values than headers.`);
  }
  const rows = dataRows.map(({ row }) => row.slice(0, width));
  const rawRecords = rows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

  return { headers, rows, rawRecords, rowNumbers: dataRows.map(row => row.number),
    layout: { headerRow: start + 1, headerRowCount: count, skippedBannerRows: start } };
}
