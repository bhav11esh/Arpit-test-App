async function testFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbxXZnQvkpnNwWwHZL69BzFOTEbxR1t-F5MOZ9c0uXJCg1f9qB3q9RtS0rEWXj1M1ti6/exec';
  const sheetId = '1uU-YZhZ0OK_Cl3KOjvs1fHD3EBR0BUpbRIceBKA17ws';

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'read', sheetId: sheetId })
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body snippet:', text.substring(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testFetch();
