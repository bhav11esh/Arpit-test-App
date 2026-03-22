/**
 * V7.9 Advanced Multi-Tab Sync Service
 * FEATURES: 
 * - Auto-Sheet Detection (Skips empty tabs)
 * - Explicit sheetName support
 * - Row Preservation (Updates specific columns instead of overwriting whole row)
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for other processes to finish
    lock.waitLock(30000);
    
    const request = JSON.parse(e.postData.contents);
    const { action, sheetId, sheetName, delivery, deliveries, id } = request;
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    
    // V7.9.2: Targeted sheet selection with Lock
    let sheet;
    if (sheetName) {
      sheet = spreadsheet.getSheetByName(sheetName);
    }
    
    // Auto-detect: Skip empty sheets (like templates) to find real data
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      for (let s of sheets) {
        if (s.getLastRow() > 1) { // More than just a header
          sheet = s;
          break;
        }
      }
    }
    
    if (!sheet) sheet = spreadsheet.getSheets()[0];
    
    switch (action) {
      case 'sync':
        return processSync(sheet, [delivery]);
      case 'sync_bulk':
        return processSync(sheet, deliveries);
      case 'delete':
        return handleDelete(sheet, id);
      case 'read':
        return handleRead(sheet);
      default:
        return createResponse({ status: 'error', message: "Unknown action: " + action });
    }
  } catch (error) {
    return createResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const sheetId = e.parameter.sheetId;
    const sheetName = e.parameter.sheetName;
    if (!sheetId) return createResponse({ status: 'error', message: 'Missing sheetId' });
    
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    let sheet;
    if (sheetName) {
      sheet = spreadsheet.getSheetByName(sheetName);
    }
    
    if (!sheet) {
      const sheets = spreadsheet.getSheets();
      for (let s of sheets) {
        if (s.getLastRow() > 1) {
          sheet = s;
          break;
        }
      }
    }
    
    if (!sheet) sheet = spreadsheet.getSheets()[0];
    
    return handleRead(sheet);
  } catch (error) {
    return createResponse({ status: 'error', message: error.toString() });
  }
}


function processSync(sheet, incomingDeliveries) {
  if (!incomingDeliveries || !incomingDeliveries.length) return createResponse({ status: 'success', message: 'No data' });
  
  const range = sheet.getDataRange();
  const data = range.getValues();
  let headers = data[0];

  // V8.0: Auto-Repair Headers if missing metadata columns
  const required = ["Signature", "CRM ID", "Updated At"];
  let headerChanged = false;
  required.forEach(req => {
    if (findCol(headers, req) === -1) {
      headers.push(req);
      headerChanged = true;
    }
  });
  
  if (headerChanged) {
    // Write back entire data range with new header
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Pad existing data rows to match new header length
    for (let i = 1; i < data.length; i++) {
       while (data[i].length < headers.length) data[i].push("");
    }
  }

  const colMap = {
    date: findCol(headers, "Date"),
    photog: findCol(headers, "Photog"),  // Matches "Photographer" or "Photographer Name"
    link: findCol(headers, "Footage"),  
    reel: findCol(headers, "Reel"),     
    id: findCol(headers, "CRM ID"),
    updated: findCol(headers, "Updated At"),
    name: findCol(headers, "Name"),      // Matches "Delivery Name" or "Customer Name"
    amount: findCol(headers, "Amount"),
    phone: findCol(headers, "Phone"),
    rapido: findCol(headers, "Rapido"),
    signature: findCol(headers, "Signature")
  };

  const extractId = (url) => {
    if (!url || typeof url !== 'string' || url.toLowerCase().includes('only photos')) return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : url.trim().toLowerCase();
  };

  const normalize = (val) => String(val || "").trim().toLowerCase();
  
  const formatDate = (val) => {
    if (val instanceof Date) return val.toLocaleDateString('en-GB');
    const s = String(val || "").trim();
    if (s.includes('-') && s.split('-').length === 3) return s.split('-').reverse().join('/');
    return s;
  };

  const matchedRowIndices = new Set();
  const newRows = [];
  const addedLinksInThisBatch = new Set();
  const count = { update: 0, add: 0 };

  incomingDeliveries.forEach(delivery => {
    let targetIdx = -1;
    const incId = String(delivery.id || "");
    const incSignature = String(delivery.signature || "");
    const incFootageId = extractId(delivery.footage_link);
    const incReelId = extractId(delivery.reel_link);
    const incDate = formatDate(delivery.date);
    const incPhotog = normalize(delivery.photographer_name);

    // Batch de-duplication
    if (incFootageId && addedLinksInThisBatch.has(incFootageId)) {
        for (let r = 0; r < newRows.length; r++) {
            const rowLink = extractId(newRows[r][colMap.link]);
            if (rowLink === incFootageId) {
                updateRowArray(newRows[r], colMap, delivery);
                count.update++;
                return;
            }
        }
    }

    // Matching loop
    for (let i = 1; i < data.length; i++) {
      if (matchedRowIndices.has(i)) continue;
      const row = data[i];
      const getVal = (idx) => (idx !== -1 && idx < row.length) ? String(row[idx] || "").trim() : "";
      
      const rowCrmId = getVal(colMap.id);
      const rowSignature = getVal(colMap.signature);
      const rowFootageId = extractId(getVal(colMap.link));

      // Match Strategy: CRM ID > Signature > Footage Link > Date+Photog
      if (incId && rowCrmId === incId) { targetIdx = i; break; }
      if (incSignature && rowSignature === incSignature) { targetIdx = i; break; }
      if (incFootageId && rowFootageId === incFootageId) { targetIdx = i; break; }
      
      if (!rowCrmId && !rowSignature && !rowFootageId && incDate) {
        if (formatDate(row[colMap.date]) === incDate && normalize(row[colMap.photog]) === incPhotog) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx !== -1) {
      matchedRowIndices.add(targetIdx);
      updateRowArray(data[targetIdx], colMap, delivery);
      count.update++;
    } else {
      const newRow = new Array(headers.length).fill("");
      updateRowArray(newRow, colMap, delivery);
      newRows.push(newRow);
      if (incFootageId) addedLinksInThisBatch.add(incFootageId);
      count.add++;
    }
  });

  // Write updates
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  }
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }
  
  return createResponse({ status: 'success', summary: `Matched: ${count.update}, Added: ${count.add}, Sheet: ${sheet.getName()}` });
}

function findCol(headers, name) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  const search = norm(name);
  
  // Custom Aliases
  const aliases = {
    'name': ['customer name', 'client name', 'person name', 'dealer name', 'customer'],
    'photog': ['photographer name', 'cameraman'],
    'link': ['footage link', 'drive link', 'video link'],
    'updated at': ['updated', 'last updated', 'time stamp']
  };

  const match = headers.findIndex(h => {
    const header = norm(h);
    if (header.includes(search)) return true;
    if (aliases[search]) return aliases[search].some(a => header.includes(a));
    return false;
  });
  
  return match;
}

function updateRowArray(row, colMap, d) {
  Object.keys(colMap).forEach(key => {
    const idx = colMap[key];
    if (idx === -1 || idx >= row.length) return;
    switch(key) {
      case 'date': row[idx] = d.date || row[idx]; break;
      case 'photog': row[idx] = d.photographer_name || row[idx]; break;
      case 'link': row[idx] = d.footage_link || ''; break;
      case 'reel': row[idx] = d.reel_link || ''; break;
      case 'id': row[idx] = d.id || row[idx]; break;
      case 'updated': row[idx] = d.updated_at || new Date().toISOString(); break;
      case 'name': row[idx] = d.delivery_name || row[idx]; break;
      case 'amount': row[idx] = d.received_amount || row[idx]; break;
      case 'phone': row[idx] = d.customer_phone || row[idx]; break;
      case 'rapido': row[idx] = d.rapido_charge || row[idx]; break;
      case 'signature': row[idx] = d.signature || row[idx]; break;
    }
  });
}

function handleDelete(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = findCol(headers, "CRM ID");
  if (idCol === -1) throw new Error("Missing 'CRM ID' column");
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return createResponse({ status: 'success', message: 'Deleted' });
    }
  }
  return createResponse({ status: 'error', message: 'Row not found' });
}

function handleRead(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  const data = values.map((row, r) => {
    return row.map((cell, c) => {
      // V7.9.1 FIX: Use display value for dates to avoid auto-swap in JSON serialization
      if (cell instanceof Date) {
        return displayValues[r][c];
      }
      return cell;
    });
  });

  return createResponse({ status: 'success', data: data, sheetName: sheet.getName() });
}

function createResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
