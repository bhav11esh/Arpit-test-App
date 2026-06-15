const axios = require('axios');

const parseDate = (dStr) => {
  if (!dStr) return null;
  if (typeof dStr === 'number') {
    try {
      const date = new Date(Math.round((dStr - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch (e) {}
  }
  const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
  let result = null;
  const normalizedTrimmed = trimmed.replace(/[\u2013\u2014]/g, '-');
  const dmyMatch = normalizedTrimmed.match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
  if (dmyMatch) {
    let [_, d, m, y] = dmyMatch;
    if (y.length === 2) y = '20' + y;
    result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (!result && trimmed.includes('T') && trimmed.includes('Z')) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        result = localDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  if (!result) {
    try {
      const nativeDate = new Date(normalizedTrimmed);
      if (!isNaN(nativeDate.getTime())) {
        result = nativeDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  return result;
};

async function test() {
  const syncUrl = 'https://script.google.com/macros/s/AKfycbzcfiAInjwPevisgq0BluCbHacAh8eCKhlcAdhXQJ1uMfzq5XYY3p55j63dVxb5R4DLWA/exec';
  const sheetId = '1t7Yd4aoDwDtlXaOIcs-NvcwvpLtwqwJdl3LY32r65bY';
  
  console.log('--- AKSHAYA MERCEDES AUDIT START ---');
  try {
    const response = await axios.post(syncUrl, { action: 'read', sheetId: sheetId }, { headers: { 'Content-Type': 'text/plain' } });
    const rawRows = response.data.data;
    const headers = rawRows[0];
    const dataRows = rawRows.slice(1);
    
    const objs = dataRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i]; });
      return obj;
    });

    let validCount = 0;
    let skipped = [];
    objs.forEach((row, i) => {
      const rawDate = row["Date"] || row["date"] || "";
      const parsedDate = parseDate(rawDate);
      const hasData = Object.keys(row).some(key => key.toLowerCase() !== 'date' && !!row[key]);

      if (!parsedDate || !hasData) {
        skipped.push({ sheetRow: i + 2, data: row, reason: !parsedDate ? 'INVALID_DATE' : 'EMPTY_ROW' });
      } else {
        validCount++;
      }
    });

    console.log('Sheet Overview:');
    console.log('  Total Rows (incl header):', rawRows.length);
    console.log('  Valid Records found:', validCount);
    console.log('  Skipped:', skipped.length);
    
    if (skipped.length > 0) {
      console.log('Skipped Sample:', JSON.stringify(skipped[0]));
    }
  } catch (err) {
    console.error('Audit failed:', err.message);
  }
}

test();
