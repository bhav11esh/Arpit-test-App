const https = require('https');
const payload = JSON.stringify({action:'read',sheetId:'15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA'});

const req = https.request('https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(payload) }
}, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      let body = '';
      res2.on('data', c => body += c);
      res2.on('end', () => {
        const result = JSON.parse(body);
        let rawRows = result.data;
        const headers = rawRows[0];
        
        rawRows = rawRows.slice(1).map((row) => {
          const obj = {};
          if (Array.isArray(row)) {
            headers.forEach((h, i) => {
              if (h) obj[h.trim()] = row[i];
            });
          }
          return obj;
        });

        const rows = rawRows.map((r) => {
          const normalized = {};
          Object.keys(r).forEach(key => {
            if (key) {
              const cleanKey = key.trim();
              normalized[cleanKey] = typeof r[key] === 'string' ? r[key].trim() : r[key];
            }
          });
          return normalized;
        });

        const getValueLocal = (row, ...keys) => {
          if (!row || typeof row !== 'object') return null;
          for (const key of keys) {
            if (!key) continue;
            if (row[key] !== undefined) return row[key];
            const foundKey = Object.keys(row).find(k => k && k.toLowerCase() === key.toLowerCase());
            if (foundKey) return row[foundKey];
          }
          return null;
        };

        const parseDateLocal = (dStr) => {
          if (!dStr) return null;
          if (typeof dStr === 'number') {
            try {
              const date = new Date(Math.round((dStr - 25569) * 86400 * 1000));
              if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
            } catch (e) {}
          }
          const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
          let resultParsed = null;
          const normalizedTrimmed = trimmed.replace(/[\u2013\u2014]/g, '-');
          const dmyMatch = normalizedTrimmed.match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
          if (dmyMatch) {
            let [_, d, m, y] = dmyMatch;
            if (y.length === 2) y = '20' + y;
            resultParsed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          if (!resultParsed && trimmed.includes('T') && trimmed.includes('Z')) {
            try {
              const date = new Date(trimmed);
              if (!isNaN(date.getTime())) {
                const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                resultParsed = localDate.toISOString().split('T')[0];
              }
            } catch (e) {}
          }
          if (!resultParsed) {
            try {
              const nativeDate = new Date(normalizedTrimmed);
              if (!isNaN(nativeDate.getTime())) {
                resultParsed = nativeDate.toISOString().split('T')[0];
              }
            } catch (e) {}
          }
          if (resultParsed) {
            const yearNum = parseInt(resultParsed.split('-')[0]);
            if (yearNum < 2020 || yearNum > 2100) return null;
          }
          return resultParsed;
        };

        let dropped = [];
        const mappedRows = rows.filter((row, index) => {
          if (!row) { dropped.push({index: index+2, reason: '!row'}); return false; }
          const rawDate = getValueLocal(row, "Date", "date") || "";
          const parsedDate = parseDateLocal(rawDate);
          
          if (!parsedDate || (typeof parsedDate === 'string' && parsedDate.toLowerCase().includes('date'))) {
            dropped.push({index: index+2, DateCell: rawDate, reason: 'invalid date', rawRow: row});
            return false;
          }
          
          const hasData = Object.keys(row).some(key => {
            if (!key) return false;
            if (key.toLowerCase() === 'date' || key === '_parsedDate') return false;
            return !!row[key];
          });
          
          if (!hasData) {
            dropped.push({index: index+2, reason: '!hasData'});
            return false;
          }
          
          row._parsedDate = parsedDate;
          return true;
        });

        console.log(`Total valid mapped rows: ${mappedRows.length}`);
        console.log('Dropped rows:', JSON.stringify(dropped, null, 2));
      });
    });
  }
});
req.write(payload);
req.end();
