const https = require('https');
const fs = require('fs');

const url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec?sheetId=1eTlyS7N_17e3_J2FshA0wB73l5IHTEeLqENMZlA';

console.log(`Fetching from ${url}...`);

https.get(url, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    console.log(`Redirecting to ${res.headers.location}`);
    https.get(res.headers.location, (res2) => {
      handleResponse(res2);
    });
  } else {
    handleResponse(res);
  }
}).on('error', (e) => {
  console.error('Error:', e);
});

function handleResponse(res) {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      fs.writeFileSync('apple_auto_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } catch (e) {
      console.error('Parse Error:', e);
      console.log('Body start:', body.substring(0, 100));
    }
  });
}
