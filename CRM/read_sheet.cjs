const https = require('https');

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
  // Follow redirects (Apps script redirects to script.googleusercontent.com)
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      let body = '';
      res2.on('data', c => body += c);
      res2.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.status === 'success' && json.data) {
            const d = json.data;
            console.log('Row 298:', d[297]); // 0-indexed
            console.log('Row 356:', d[355]);
            console.log('Row 372:', d[371]);
          } else {
            console.log('Error from script:', json);
          }
        } catch(e) {
          console.log('Parse error:', e, body.substring(0, 100));
        }
      });
    });
  } else {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => console.log('Direct response:', body));
  }
});

req.write(payload);
req.end();
