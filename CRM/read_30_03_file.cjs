const https = require('https');
const fs = require('fs');
const payload = JSON.stringify({action:'read',sheetId:'15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA'});
const req = https.request('https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec', {method:'POST', headers:{'Content-Type':'text/plain', 'Content-Length': Buffer.byteLength(payload)}}, (res) => {
  if (res.statusCode === 302) {
    https.get(res.headers.location, (res2) => {
      let b = ''; res2.on('data', c=>b+=c);
      res2.on('end', () => {
        const d = JSON.parse(b).data;
        const matches = [];
        for(let i=0; i<d.length; i++) {
          if (JSON.stringify(d[i]).includes('30/03')) matches.push(`ROW ${i+1}: ` + JSON.stringify(d[i]));
        }
        fs.writeFileSync('C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/sheet_dump4.txt', matches.join('\n'));
      });
    });
  }
});
req.write(payload); req.end();
