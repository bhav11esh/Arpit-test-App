const https = require('https');
const fs = require('fs');

const url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
const payload = JSON.stringify({
  action: 'read',
  sheetId: '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA'
});

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      let body = '';
      res2.on('data', c => body += c);
      res2.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.status === 'success' && json.data) {
            const d = json.data;
            const matches = [];
            for (let i=0; i<d.length; i++) {
              const str = JSON.stringify(d[i]);
              if (str.includes('14/08/2025') || str.includes('14-08') || str.includes('14 - 08') || str.includes('1PtThTisNNNy6_9gAwb4Ub6Bp_XVcDMOM')) {
                matches.push(`ROW ${i+1}: ` + str);
              }
            }
            fs.writeFileSync('C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/sheet_dump3.txt', matches.join('\n'));
            console.log('Done!');
          }
        } catch(e) {}
      });
    });
  }
});

req.write(payload);
req.end();
