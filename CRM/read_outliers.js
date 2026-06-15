const fs = require('fs');
try {
    const content = fs.readFileSync('c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/debug_out.txt', 'utf8');
    const lines = content.split('\n');
    let capturing = false;
    lines.forEach(line => {
        if (line.includes('FOUND OUTLIERS')) capturing = true;
        if (capturing) {
            // Clean up weird chars
            console.log(line.replace(/[^\x20-\x7E]/g, ''));
        }
    });
} catch (e) { console.error(e); }
