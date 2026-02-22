const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CRM_DIR = path.join(__dirname, 'CRM');
const PUBLIC_CRM_DIR = path.join(__dirname, 'public', 'crm');

console.log('🚀 Starting Unified Build Process...');

try {
    // 1. Install CRM Dependencies (include dev deps for vite)
    console.log('\n📦 Installing CRM dependencies...');
    execSync('npm install --include=dev', { cwd: CRM_DIR, stdio: 'inherit' });

    // 2. Build CRM Project
    console.log('\n🔨 Building CRM project...');
    execSync('npm run build', { cwd: CRM_DIR, stdio: 'inherit' });

    // 3. Prepare config for move
    // Ensure public/crm exists and is empty-ish (we'll overwrite)
    if (!fs.existsSync(PUBLIC_CRM_DIR)) {
        console.log('\nVg Creating public/crm directory...');
        fs.mkdirSync(PUBLIC_CRM_DIR, { recursive: true });
    }

    // 4. Move Dist to Public
    console.log('\n🚚 Moving built assets to public/crm...');
    const distDir = path.join(CRM_DIR, 'dist');

    // Helper to copy directory recursively
    function copyRecursiveSync(src, dest) {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();

        if (isDirectory) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }
            fs.readdirSync(src).forEach((childItemName) => {
                copyRecursiveSync(
                    path.join(src, childItemName),
                    path.join(dest, childItemName)
                );
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    copyRecursiveSync(distDir, PUBLIC_CRM_DIR);

    console.log('\n✅ CRM Build & Move Complete!');
    console.log('👉 Verify at: ' + PUBLIC_CRM_DIR);

} catch (error) {
    console.error('\n❌ Build Failed:', error);
    process.exit(1);
}
