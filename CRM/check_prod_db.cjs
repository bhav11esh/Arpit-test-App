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

async function checkProdDb() {
  console.log('Fetching index.html from crm.yourphotocrew.com...');
  const html = await fetchUrl('https://crm.yourphotocrew.com/');
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  
  if (!match) {
    console.log('Could not find main JS bundle in index.html');
    return;
  }
  
  const jsUrl = 'https://crm.yourphotocrew.com' + match[1];
  console.log('Found JS bundle:', jsUrl);
  
  const jsCode = await fetchUrl(jsUrl);
  const supabaseMatches = jsCode.match(/https:\/\/[a-zA-Z0-9_-]+\.supabase\.co/g);
  
  if (supabaseMatches) {
    // Unique matches
    const unique = [...new Set(supabaseMatches)];
    console.log('Found Supabase URLs in production bundle:');
    console.log(unique);
  } else {
    console.log('No Supabase URLs found in the bundle.');
  }
}

checkProdDb();
