const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f =>
    /\.(txt|json|cjs|js|ts)$/.test(f) &&
    !f.includes('node_modules') &&
    !f.includes('.git')
);

files.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            // Try reading as utf16le first, if it fails or looks weird, try utf8
            let content = fs.readFileSync(filePath, 'utf16le');
            if (!content.includes('PPS') && !content.includes('Mahindra')) {
                content = fs.readFileSync(filePath, 'utf8');
            }

            if (content.includes('PPS')) {
                console.log(`\nFound "PPS" in ${file}:`);
                // const lines = content.split('\n'); // Removed duplicate
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('PPS')) {
                        console.log(`\n--- Match in ${file} ---`);
                        // Print 5 lines before and after
                        const start = Math.max(0, index - 5);
                        const end = Math.min(lines.length - 1, index + 5);
                        for (let i = start; i <= end; i++) {
                            console.log(`${i + 1}: ${lines[i].trim()}`);
                        }
                    }
                });
            } else {
                console.log(`\n"PPS" not found in ${file}`);
            }
        } else {
            console.log(`\nFile ${file} does not exist.`);
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});
