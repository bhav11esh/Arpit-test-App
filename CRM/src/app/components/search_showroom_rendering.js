const fs = require('fs');
const file = 'C:/Users/dell/.gemini/antigravity/scratch/Arpit-test-App/CRM/src/app/components/ViewScreen.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<FraudAuditShowroomCard')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    // Print 10 lines after
    for (let i = 1; i <= 15; i++) {
      console.log(`Line ${idx + 1 + i}: ${lines[idx + idx + i] ? lines[idx + i] : ''}`);
    }
  }
});
