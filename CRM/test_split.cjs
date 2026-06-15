const https = require('https');

https.get('https://crm.yourphotocrew.com/assets/index-ZQSHRjvp.js', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    // Search for pattern resembling splitting by underscore instead of |||
    const matches = body.match(/\.split\(['"]_['"]\)/g);
    if (matches) {
      console.log('FOUND SPLIT BY UNDERSCORE IN PROD BUNDLE:', matches.length, 'times');
    } else {
      console.log('No underscore split found.');
    }
  });
});
