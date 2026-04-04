/**
 * V16.7 UNIVERSAL "DOUBLE-LOCK" SYNC SERVICE
 * FEATURES: 
 * - Multi-Layer Date Fix: Overcomes US/India locale mismatch by reading Display Values.
 * - Hunter Priority: Matches by Google Drive ID BEFORE checking any dates.
 * - ID-Extract: Strips everything but the unique folder code for matching.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const request = JSON.parse(e.postData.contents);
    const { action, sheetId, sheetName, delivery, deliveries, id } = request;
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const tz = spreadsheet.getSpreadsheetTimeZone();
    let sheet;
    if (sheetName) sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      for (let s of sheets) { if (s.getLastRow() > 1) { sheet = s; break; } }
    }
    if (!sheet) sheet = spreadsheet.getSheets()[0];

    console.log(`[V16.3 Audit] Action: ${action || (deliveries ? 'sync_bulk' : 'sync')}, Sheet: ${sheet.getName()}`);
    
    // Repair headers if needed to ensure CRM ID is present
    repairHeadersIfNeeded(sheet);
    
    if (action === 'delete') return deleteRow(sheet, id);
    if (action === 'read') return readSheet(sheet);
    if (deliveries) return processBulkSync(sheet, deliveries, tz);
    return processSync(sheet, delivery, tz);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function readSheet(sheet, tz) {
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  
  const result = data.map((row, rIdx) => {
    return row.map((cell, cIdx) => {
      let val = cell;
      // 1. Force convert Date objects to ISO
      if (Object.prototype.toString.call(val) === '[object Date]') {
        return Utilities.formatDate(val, tz || "GMT+5:30", "yyyy-MM-dd");
      }
      // 2. If it is a string like "8-10-25", manually parse it before returning
      const s = String(displayData[rIdx][cIdx]).trim();
      const match = s.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})\s*$/);
      if (match) {
        let d = parseInt(match[1]);
        let m = parseInt(match[2]);
        let y = match[3];
        if (y.length === 2) y = '20' + y;
        // In India, 25-08 or 08-10 is Day-Month
        // But if m > 12, it must be Month-Day
        if (m > 12 && d <= 12) { let temp = d; d = m; m = temp; }
        return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      }
      return s;
    });
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
}

function processSync(sheet, delivery, tz) {
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const headers = displayData[0];
  const colIdx = buildColIdx(headers);
  const rowIdx = findRowIndex(displayData, data, delivery, colIdx, null, tz);
  if (rowIdx > -1) {
    const rowValues = updateRowArray(data[rowIdx], delivery, headers, colIdx);
    sheet.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
    if (colIdx.date > -1) sheet.getRange(rowIdx + 1, colIdx.date + 1).setNumberFormat('dd-mm-yyyy');
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'updated', row: rowIdx + 1 })).setMimeType(ContentService.MimeType.JSON);
  } else {
    const newRow = createRowArray(delivery, headers, colIdx);
    sheet.appendRow(newRow);
    if (colIdx.date > -1) sheet.getRange(sheet.getLastRow(), colIdx.date + 1).setNumberFormat('dd-mm-yyyy');
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'appended', row: sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processBulkSync(sheet, deliveries, tz) {
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const headers = displayData[0];
  const colIdx = buildColIdx(headers);
  let stats = { updated: 0, appended: 0 };
  const updatedIndices = new Set();
  
  deliveries.forEach(delivery => {
    const rowIdx = findRowIndex(displayData, data, delivery, colIdx, updatedIndices, tz);
    if (rowIdx > -1) {
      if (!updatedIndices.has(rowIdx)) {
        const rowValues = updateRowArray(data[rowIdx], delivery, headers, colIdx);
        sheet.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
        if (colIdx.date > -1) sheet.getRange(rowIdx + 1, colIdx.date + 1).setNumberFormat('dd-mm-yyyy');
        stats.updated++;
        updatedIndices.add(rowIdx);
      }
    } else {
      const newRow = createRowArray(delivery, headers, colIdx);
      sheet.appendRow(newRow);
      stats.appended++;
      // Re-read data after append to avoid index mismatch
      const newData = sheet.getDataRange().getValues();
      const newDisplay = sheet.getDataRange().getDisplayValues();
      data.push(newData[newData.length-1]);
      displayData.push(newDisplay[newDisplay.length-1]);
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', stats: stats })).setMimeType(ContentService.MimeType.JSON);
}

function buildColIdx(headers) {
  return {
    date: findCol(headers, 'date'),
    link: findCol(headers, 'footagelink'),
    id: findCol(headers, 'crmid'),
    photog: findCol(headers, 'photographer'),
    amount: findCol(headers, 'amount'),
    phone: findCol(headers, 'phone'),
    rapido: findCol(headers, 'rapido'),
    signature: findCol(headers, 'signature'),
    updated: findCol(headers, 'updatedat'),
    reel: findCol(headers, 'reellink')
  };
}

function extractId(s) {
  if (!s) return "";
  const match = String(s).match(/[-\w]{25,}/);
  return match ? match[0] : String(s).replace(/\s/g, '');
}

function normalizeDate(d, tz) {
  if (!d) return "";
  if (Object.prototype.toString.call(d) === '[object Date]') return Utilities.formatDate(d, tz || "GMT+5:30", "dd/MM/yyyy");
  let s = String(d).trim().replace(/[-_]\d+$/, '').replace(/[^\d\/\-\.]/g, '');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  s = s.replace(/[-\.]/g, '/');
  const dmyMatch = s.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})/);
  if (dmyMatch) return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3].length === 2 ? "20"+dmyMatch[3] : dmyMatch[3]}`;
  return s;
}

function findRowIndex(displayData, data, delivery, colIdx, updatedIndices, tz) {
  const targetId = String(delivery.id || "").trim();
  const targetLinkID = extractId(delivery.footage_link || "");
  const targetReelID = extractId(delivery.reel_link || "");
  const targetPhotog = String(delivery.photographer_name || "").trim().toLowerCase();
  const targetDate = normalizeDate(delivery.date, tz);
  let dateOnlyMatch = -1;

  // Cache formulas if Hunter Mode is needed
  let formulas = null;

  for (let i = 1; i < displayData.length; i++) {
    if (updatedIndices && updatedIndices.has(i)) continue;
    const rowStr = displayData[i];
    const rowRaw = data[i];
    
    // 1. PRIMARY MATCH: Google Drive Folder ID (Hunter Mode)
    // Checks both footage and reel links for a match anywhere in the row
    if (targetLinkID || targetReelID) {
      let matchedByLink = false;
      for (let j = 0; j < rowStr.length; j++) {
        const cellStr = String(rowStr[j]);
        if (targetLinkID && cellStr.includes(targetLinkID)) { matchedByLink = true; break; }
        if (targetReelID && cellStr.includes(targetReelID)) { matchedByLink = true; break; }
      }
      
      // If not found in display text, check formulas (for hidden URLs in HYPERLINK or Smart Chips)
      if (!matchedByLink) {
        if (!formulas) formulas = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(1, 1, displayData.length, displayData[0].length).getFormulas();
        const rowFormulas = formulas[i];
        for (let j = 0; j < rowFormulas.length; j++) {
          const formStr = rowFormulas[j];
          if (formStr) {
            if (targetLinkID && formStr.includes(targetLinkID)) { matchedByLink = true; break; }
            if (targetReelID && formStr.includes(targetReelID)) { matchedByLink = true; break; }
          }
        }
      }

      if (matchedByLink) return i;
    }

    // 2. ID Match (Existing CRM ID) - SECUREst
    const rowId = colIdx.id > -1 ? String(rowStr[colIdx.id]).trim() : "";
    if (targetId && rowId === targetId) return i;
    
    // 3. Fallback: Date + Photographer
    const rowDateRaw = colIdx.date > -1 ? normalizeDate(rowRaw[colIdx.date], tz) : "";
    const rowDateStr = colIdx.date > -1 ? normalizeDate(rowStr[colIdx.date], tz) : "";
    
    if (targetDate && (rowDateRaw === targetDate || rowDateStr === targetDate)) {
      const rowPhotog = colIdx.photog > -1 ? String(rowStr[colIdx.photog]).trim().toLowerCase() : "";
      if (targetPhotog && rowPhotog && (targetPhotog.includes(rowPhotog) || rowPhotog.includes(targetPhotog))) return i;
      if (dateOnlyMatch === -1) dateOnlyMatch = i;
    }
  }
  return dateOnlyMatch;
}

function repairHeadersIfNeeded(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const required = ['CRM ID', 'Signature', 'Updated At'];
  let modified = false;

  required.forEach(req => {
    if (findCol(headers, req) === -1) {
      const lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1).setValue(req)
        .setBackground('#EFEFEF')
        .setFontWeight('bold');
      headers.push(req);
      modified = true;
    }
  });

  if (modified) SpreadsheetApp.flush();
}


function findCol(headers, name) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s_\-]/g, "");
  const target = norm(name);
  const aliases = {
    'crmid': ['crmid', 'id', 'recordid'],
    'photographer': ['photographer', 'photographername', 'user', 'photog', 'assignedto'],
    'amount': ['amount', 'receivedamount', 'price', 'amt'],
    'footagelink': ['footagelink', 'drivelink', 'link', 'footage'],
    'date': ['date', 'deliverydate', 'shootdate'],
    'reellink': ['reellink', 'reel'],
    'phone': ['phone', 'contact'],
    'rapido': ['rapido', 'travel'],
    'signature': ['signature', 'sig'],
    'updatedat': ['updatedat', 'lastupdated', 'updated']
  };
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (h === target || (aliases[target] && aliases[target].includes(h))) return i;
  }
  return -1;
}

function createRowArray(delivery, headers, colIdx) {
  return updateRowArray(new Array(headers.length).fill(''), delivery, headers, colIdx);
}

function updateRowArray(row, delivery, headers, colIdx) {
  if (colIdx.id > -1) row[colIdx.id] = delivery.id || '';
  if (colIdx.date > -1 && delivery.date) {
    let dateObj = null;
    const s = String(delivery.date);
    if (s.includes('/') || s.includes('-')) {
      const parts = s.split(/[\/\-]/);
      if (parts.length === 3) {
        // Assume context: if 1st part is 4 digits, it's YMD. If last part is 4 digits, it's DMY.
        if (parts[0].length === 4) dateObj = new Date(parts[0], parts[1]-1, parts[2]);
        else if (parts[2].length === 4) dateObj = new Date(parts[2], parts[1]-1, parts[0]);
      }
    }
    if (!dateObj) {
      const tryDate = new Date(s);
      if (!isNaN(tryDate.getTime())) dateObj = tryDate;
    }
    row[colIdx.date] = dateObj || s;
  }
  if (colIdx.link > -1) row[colIdx.link] = delivery.footage_link || '';
  if (colIdx.reel > -1) row[colIdx.reel] = delivery.reel_link || '';
  if (colIdx.photog > -1) row[colIdx.photog] = delivery.photographer_name || '';
  if (colIdx.amount > -1) row[colIdx.amount] = delivery.received_amount || 0;
  if (colIdx.phone > -1) row[colIdx.phone] = delivery.customer_phone || '';
  if (colIdx.rapido > -1) row[colIdx.rapido] = delivery.rapido_charge || 0;
  if (colIdx.signature > -1) row[colIdx.signature] = delivery.signature || '';
  if (colIdx.updated > -1) row[colIdx.updated] = new Date().toLocaleString('en-IN');
  return row;
}

function deleteRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const idCol = findCol(data[0], 'CRM ID');
  if (idCol === -1) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'CRM ID column not found' }));
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'deleted' }));
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Row not found' }));
}