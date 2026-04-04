const sheetData = [
  [''], // index 0 skipped
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/1a-j9-OqXcCfmyOK8aAAIhmfyDU5tzRbN'], // 356
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/1ur7w68KPyfonjgQOS4XA6VH-PFJGYaLY'], // 357
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/1r_lecfdCytc_UJcO4KN6pmb0M6qp8U_T'], // 358
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/1ycV-AdpY_V2AMKaCNWnYGDES8hl8xPWRi'], // 359
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/163kfd85juJjnct6c16NMRwC-wRD926oQ'], // 360
  ['', '25/01/2026', 'https://drive.google.com/drive/folders/1ftDB7j42wPVEM3Ij3iM3F4px5jnAG1Bg'], // 361
];

function normalizeDate(d) {
  if (!d) return "";
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return s.replace(/-/g, '/');
}

function findRowIndex(displayData, delivery, colIdx, updatedIndices) {
  const targetId = String(delivery.id || "").trim();
  const targetSig = String(delivery.signature || "").trim().toLowerCase();
  
  const targetLink = String(delivery.footage_link || "").trim();
  const lowerTargetLink = targetLink.toLowerCase();
  
  const targetDate = normalizeDate(delivery.date);
  
  let dateOnlyMatch = -1;

  for (let i = 1; i < displayData.length; i++) {
    if (updatedIndices && updatedIndices.has(i)) continue;
    
    const row = displayData[i];
    
    const rowDate = colIdx.date > -1 ? normalizeDate(row[colIdx.date]) : "";
    if (targetDate && rowDate === targetDate) {
      
      if (lowerTargetLink) {
        for (let j = 0; j < row.length; j++) {
          const cellStr = String(row[j]).trim().toLowerCase();
          if (cellStr && (cellStr === lowerTargetLink || (lowerTargetLink.length > 5 && cellStr.includes(lowerTargetLink)))) {
             return i;
          }
        }
      }
      
      if (dateOnlyMatch === -1) dateOnlyMatch = i;
    }
  }
  
  return dateOnlyMatch;
}

const deliveries = [
  { 
    id: "7b4af96e", 
    date: "2026-01-25", 
    footage_link: "https://drive.google.com/drive/folders/1r_IecfdCytc_UJcO4KN6pmb0M6qp8U_T" // 358 payload
  },
  { 
    id: "9f8967c9", 
    date: "2026-01-27", 
    footage_link: "https://drive.google.com/drive/folders/1a-j9-OqXcCfmyOK8aAAIhmfyDU5tzRbN" // 356 payload (different date!)
  }
];

const colIdx = { id: -1, signature: -1, date: 1, phone: -1, photographer: -1, amount: -1 };
const updatedIndices = new Set();

deliveries.forEach(del => {
  const idx = findRowIndex(sheetData, del, colIdx, updatedIndices);
  console.log(`Payload Date: ${normalizeDate(del.date)}, Link: ${del.footage_link.slice(-15)}`);
  console.log(`Matched Row Index: ${idx}`);
  if (idx > -1) updatedIndices.add(idx);
});
