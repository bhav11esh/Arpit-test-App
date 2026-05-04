const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'HomeScreen.tsx',
  'DeliveryCard.tsx',
  'ProfileScreen.tsx',
  'ReelBacklog.tsx',
  'LeaveManagement.tsx',
  'TimingPrompt.tsx',
  'AcceptRejectDialog.tsx'
];

const basePath = path.join(__dirname, 'src', 'app', 'components');

const replacements = [
  { from: /text-indigo-/g, to: 'text-orange-' },
  { from: /bg-indigo-/g, to: 'bg-orange-' },
  { from: /border-indigo-/g, to: 'border-orange-' },
  { from: /from-indigo-/g, to: 'from-orange-' },
  { from: /via-indigo-/g, to: 'via-orange-' },
  { from: /to-indigo-/g, to: 'to-orange-' },
  { from: /text-purple-/g, to: 'text-amber-' },
  { from: /bg-purple-/g, to: 'bg-amber-' },
  { from: /border-purple-/g, to: 'border-amber-' },
  { from: /from-purple-/g, to: 'from-amber-' },
  { from: /to-purple-/g, to: 'to-amber-' },
  { from: /text-blue-/g, to: 'text-zinc-' },
  { from: /bg-blue-/g, to: 'bg-zinc-' },
  { from: /border-blue-/g, to: 'border-zinc-' },
];

let totalChanges = 0;

for (const fileName of filesToUpdate) {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${fileName}`);
    totalChanges++;
  }
}

console.log(`Finished updating ${totalChanges} files.`);
