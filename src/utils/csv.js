/**
 * Safe CSV Parsing and Generation.
 */

/**
 * Parses raw CSV text into array of objects using first line as headers.
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    for (let h = 0; h < headers.length; h++) {
      const headerKey = headers[h].trim();
      row[headerKey] = values[h] !== undefined ? values[h] : '';
    }
    results.push(row);
  }

  return results;
}

/**
 * Parses a single CSV line accounting for quotes and escaped quotes.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Converts array of objects to standard CSV string.
 */
export function generateCSV(dataArray, columns = null) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return '';

  const headers = columns || Object.keys(dataArray[0]);
  const lines = [headers.join(',')];

  for (const item of dataArray) {
    const row = headers.map(header => {
      const val = item[header];
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // Escape double quotes by doubling them
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(row.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Triggers a browser file download for text/csv or text/json.
 */
export function downloadFile(content, fileName, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

