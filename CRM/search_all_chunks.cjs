const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractJsLinks(html) {
  const regex = /href="(\/assets\/[^"]+\.js)"|src="(\/assets\/[^"]+\.js)"/g;
  let links = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) links.push(match[1]);
    if (match[2]) links.push(match[2]);
  }
  return [...new Set(links)];
}

async function searchAllChunks() {
  console.log('Fetching index.html from crm.yourphotocrew.com...');
  const html = await fetchUrl('https://crm.yourphotocrew.com/');
  const links = extractJsLinks(html);
  
  if (!links.length) {
    console.log('No JS links found.');
    return;
  }
  
  console.log('Found JS chunks:', links.length);
  
  for (const link of links) {
    const jsUrl = 'https://crm.yourphotocrew.com' + link;
    const jsCode = await fetchUrl(jsUrl);
    
    if (jsCode.includes('15W2h5GAgVeMPGCscmX')) {
      console.log('!!! FOUND IN CHUNK:', jsUrl);
    }
  }
  console.log('Done scanning.');
}

searchAllChunks();
