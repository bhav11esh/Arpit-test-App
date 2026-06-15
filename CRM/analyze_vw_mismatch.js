import https from 'https';
import fs from 'fs';

const url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
const body = JSON.stringify({
  action: 'read',
  sheetId: '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZIA'
});

function post(url, body) {
  return new Promise((resolve, reject) => {
    // Handle redirect since GAS uses redirects
    function request(currentUrl) {
      const req = https.request(currentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect. Note: GAS changes POST to GET on 302 sometimes, 
          // but if we use a new request it should be fine. Actually for scripts 
          // it's better to just follow the location.
          const newUrl = res.headers.location;
          // For GAS, the redirect is usually a GET to a different domain.
          https.get(newUrl, (res2) => {
            let data = '';
            res2.on('data', (chunk) => data += chunk);
            res2.on('end', () => resolve(data));
          }).on('error', reject);
          return;
        }

        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    }
    
    request(url);
  });
}

post(url, body)
  .then(data => {
    fs.writeFileSync('vw_raw.json', data);
    console.log('Successfully saved raw Volkswagen data.');
    
    // Quick analysis
    const json = JSON.parse(data);
    if (json.status === 'success') {
      const rows = json.data;
      console.log('Total rows (including header):', rows.length);
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      // Mirror the CRM logic
      const parseDate = (dStr) => {
        if (!dStr) return null;
        const trimmed = String(dStr).trim();
        let result = null;
        
        if (trimmed.includes('T') && trimmed.includes('Z')) {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                result = localDate.toISOString().split('T')[0];
            }
        }

        if (!result) {
            const dmyMatch = trimmed.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})/);
            if (dmyMatch) {
                let [_, d, m, y] = dmyMatch;
                if (y.length === 2) y = '20' + y;
                result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }

        if (!result) {
            const nativeDate = new Date(trimmed);
            if (!isNaN(nativeDate.getTime())) {
                result = nativeDate.toISOString().split('T')[0];
            }
        }

        if (result) {
            const yearNum = parseInt(result.split('-')[0]);
            if (yearNum < 2020 || yearNum > 2100) return null;
        }
        return result;
      };

      let skippedCount = 0;
      const skippedRows = [];
      
      dataRows.forEach((row, i) => {
        // Convert array to object
        const obj = {};
        headers.forEach((h, j) => obj[h] = row[j]);
        
        const rawDate = obj["Date"] || obj["date"] || "";
        const parsedDate = parseDate(rawDate);
        
        const hasData = !!(
            obj["Photographer"] || 
            obj["Phone Number"] || 
            obj["Customer Phone"] ||
            obj["Amount Received"] ||
            obj["Received Amount"] ||
            obj["Reel Link"] ||
            obj["Footage Link"]
        );

        if (!parsedDate || parsedDate.toLowerCase().includes('date') || !hasData) {
          skippedCount++;
          skippedRows.push({
            sheetRow: i + 2,
            reason: !parsedDate ? 'INVALID_DATE' : (!hasData ? 'MISSING_DATA' : 'HEADER_REPETITION'),
            rawData: obj
          });
        }
      });

      console.log('CRM Filter Simulation Results:');
      console.log('Total Data Rows:', dataRows.length);
      console.log('Imported:', dataRows.length - skippedCount);
      console.log('Skipped:', skippedCount);
      console.log('Skipped Rows Info:', JSON.stringify(skippedRows, null, 2));
    }
  })
  .catch(err => console.error('Error:', err));
