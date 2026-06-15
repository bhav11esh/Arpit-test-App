
async function testSync() {
  const SYNC_URL = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
  const SHEET_ID = '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA'; // Using 'l' (small L)

  const payload = {
    action: 'sync_bulk',
    sheetId: SHEET_ID,
    deliveries: [
      {
        id: 'test_id_alt_' + Date.now(),
        date: '30/03/2026',
        delivery_name: 'TEST_DIAGNOSTIC_ALT',
        photographer_name: 'Antigravity Debug',
        footage_link: 'https://test.link/footage',
        reel_link: 'https://test.link/reel',
        received_amount: 100,
        customer_phone: '9999999999',
        rapido_charge: 50,
        signature: 'test_alt'
      }
    ]
  };

  console.log('Sending test sync request with ALT ID...');
  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('Raw Response:', text);
  } catch (error) {
    console.error('Network Error:', error);
  }
}

testSync();
