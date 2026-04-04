const axios = require('axios');

// Mirroring the client-side parseDate from DealershipsConfigScreen.tsx
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
  if (result) {
    const yearNum = parseInt(result.split('-')[0]);
    if (yearNum < 2020 || yearNum > 2100) return null;
  }
  return result;
};

const getValue = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
    const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return row[foundKey];
  }
  return null;
};

async function test() {
  const syncUrl = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
  const sheetId = '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA';
  
  try {
    const response = await axios.post(syncUrl, { action: 'read', sheetId: sheetId }, { headers: { 'Content-Type': 'text/plain' } });
    const result = response.data;
    const rawRows = result.data;
    
    // Arrays to Objects conversion as in the client
    const headers = rawRows[0];
    const objs = rawRows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i]; });
      return obj;
    });

    console.log('--- DIAGNOSING FILTERED ROWS ---');
    console.log('Total data rows to check:', objs.length);

    let count = 0;
    objs.forEach((row, i) => {
      const rawDate = getValue(row, "Date", "date") || "";
      const parsedDate = parseDate(rawDate);
      
      const hasData = Object.keys(row).some(key => {
        if (key.toLowerCase() === 'date' || key === '_parsedDate') return false;
        const val = row[key];
        return val !== undefined && val !== null && val !== "" && String(val).trim().length > 0;
      });

      if (!parsedDate || (parsedDate.toLowerCase && parsedDate.toLowerCase().includes('date')) || !hasData) {
        console.log(`Row ${i+2} (Sheet Row) SKIPPED:`);
        console.log(`  Reason: ${!parsedDate ? 'INVALID_DATE' : (!hasData ? 'NO_DATA_OTHER_THAN_DATE' : 'HEADER_TEXT_MATCH')}`);
        console.log(`  Raw Content:`, JSON.stringify(row));
      } else {
        count++;
      }
    });

    console.log('Total rows that would be imported:', count);
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

test();
