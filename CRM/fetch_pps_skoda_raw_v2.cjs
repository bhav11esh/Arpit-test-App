const https = require('https');
const fs = require('fs');

const url = 'https://script.google.com/macros/s/AKfycbyqiwNwDYDPQT8Evhps6_gsPUHBNYjMhLpF-ltr72XKEIm7mH46AwDdd8lpXbCgPqcTBQ/exec?sheetId=1TJ-zQIGYhw3MaJqzoUerTnc8SoQPvdf9c697067jbOs';

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
      fs.writeFileSync('pps_skoda_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } catch (e) {
      console.error('Parse Error:', e);
    }
  });
}
