
// Simple fetch test using native fetch (Node 18+)
async function test() {
    console.log('Testing Google Script Fetch...');
    const url = "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";

    // Pavan Hyundai Sheet ID (from earlier logs/code)
    // 11d27b2a-8d... wait, that's dealership ID.
    // Need a real sheet ID. Let's look up Pavan's sheet ID from DB or assume known.
    // Actually, let's just use the dealership ID lookup again here to be safe.

    // But to keep it simple and dependency-free, I'll just try to fetch without sheetId first to see if endpoint reachable,
    // or pass a dummy one.

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ sheetId: 'dummy', action: 'read' })
        });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response length:', text.length);
        console.log('Response preview:', text.substring(0, 100));
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

test();
