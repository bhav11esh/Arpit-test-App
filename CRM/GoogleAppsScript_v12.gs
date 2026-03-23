/**
 * V15.0 Extreme Resilient Sync Service (THE OVERRIDE)
 * FEATURES: 
 * - Audit Logs (Executions tab)
 * - Hyper-Aggressive Adoption (Claim rows by Name+Date fallback)
 * - Partial Link Matching (Resilient to truncation)
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const request = JSON.parse(e.postData.contents);
    const { action, sheetId, sheetName, delivery, deliveries, id } = request;
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

    console.log(`[V15 Audit] Action: ${action || (deliveries ? 'sync_bulk' : 'sync')}, Sheet: ${sheet.getName()}`);

    if (action === 'delete') {
      return deleteRow(sheet, id);
    } else if (action === 'read') {
      return readSheet(sheet);
    } else if (deliveries || action === 'sync_bulk') {
      return processBulkSync(sheet, deliveries || []);
    } else {
      return processSync(sheet, delivery);
    }
    
  } catch (err) {
    console.error(`[V15 Fatal] ${err.toString()}`);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function readSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function processSync(sheet, delivery) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  repairHeadersIfNeeded(sheet, headers);
  const refreshedHeaders = sheet.getDataRange().getValues()[0];
  const colIdx = mapHeaders(refreshedHeaders);
  
  const rowIdx = findRowIndex(data, delivery, colIdx);

  if (rowIdx > -1) {
    const rowValues = updateRowArray(data[rowIdx], delivery, refreshedHeaders, colIdx);
    sheet.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'updated', row: rowIdx + 1 }))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    const newRow = createRowArray(delivery, refreshedHeaders, colIdx);
    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'added' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processBulkSync(sheet, deliveries) {
  const data = sheet.getDataRange().getValues();
  let headers = data[0];
  
  repairHeadersIfNeeded(sheet, headers);
  const refreshedHeaders = sheet.getDataRange().getValues()[0];
  const colIdx = mapHeaders(refreshedHeaders);

  console.log(`[V15 Audit] Header Mapping: ${JSON.stringify(colIdx)}`);

  const stats = { added: 0, updated: 0 };
  
  deliveries.forEach((delivery, i) => {
    const rowIdx = findRowIndex(data, delivery, colIdx);
    
    if (rowIdx > -1) {
      const rowValues = updateRowArray(data[rowIdx], delivery, refreshedHeaders, colIdx);
      sheet.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
      stats.updated++;
    } else {
      const newRow = createRowArray(delivery, refreshedHeaders, colIdx);
      sheet.appendRow(newRow);
      // To prevent massive append on re-click
      data.push(newRow);
      stats.added++;
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'success', 
    summary: `Sync Complete: ${stats.updated} updated, ${stats.added} appended.` 
  })).setMimeType(ContentService.MimeType.JSON);
}

function normalizeDate(d) {
  if (!d) return "";
  if (d instanceof Date) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return s.replace(/-/g, '/');
}

function findRowIndex(data, delivery, colIdx) {
  if (!delivery) return -1;
  const targetId = String(delivery.id || "").trim();
  const targetSig = String(delivery.signature || "").trim().toLowerCase();
  const targetLink = String(delivery.footage_link || "").trim();
  const targetName = String(delivery.delivery_name || "").trim().toLowerCase();
  const targetDate = normalizeDate(delivery.date);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 1. Strong ID Match
    const rowId = colIdx.id > -1 ? String(row[colIdx.id]).trim() : "";
    if (targetId && rowId === targetId) return i;
    
    // 2. Signature Match
    const rowSig = colIdx.signature > -1 ? String(row[colIdx.signature]).trim().toLowerCase() : "";
    if (targetSig && rowSig === targetSig) return i;
    
    // 3. Resilient Weak Match (Date + [Name OR Link])
    const rowDate = colIdx.date > -1 ? normalizeDate(row[colIdx.date]) : "";
    const rowName = colIdx.name > -1 ? String(row[colIdx.name]).trim().toLowerCase() : "";
    
    // Date Match is MANDATORY for adoption
    if (targetDate && rowDate === targetDate) {
      // Check Name
      if (targetName && rowName && targetName.includes(rowName)) {
        console.log(`[V15 Audit] ADOPTED Row ${i+1}: Date(${rowDate}) and Name(${rowName}) matched.`);
        return i;
      }
      
      // Check Link (Fuzzy/Partial)
      if (targetLink && targetLink.length > 20) {
        for (let j = 0; j < row.length; j++) {
          const cellStr = String(row[j]).trim();
          if (cellStr.length > 15 && targetLink.includes(cellStr)) {
            console.log(`[V15 Audit] ADOPTED Row ${i+1}: Date(${rowDate}) and Partial Link Match at Col ${j+1}`);
            return i;
          }
        }
      }
    }
  }
  return -1;
}

function repairHeadersIfNeeded(sheet, headers) {
  const required = ['Signature', 'CRM ID', 'Updated At'];
  let modified = false;
  
  required.forEach(req => {
    if (findCol(headers, req) === -1) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(req)
        .setBackground('#f3f3f3')
        .setFontWeight('bold');
      headers.push(req);
      modified = true;
    }
  });
  
  if (modified) SpreadsheetApp.flush();
}

function mapHeaders(headers) {
  return {
    date: findCol(headers, 'Date'),
    link: findCol(headers, 'Footage Link'),
    reel: findCol(headers, 'Reel Link'),
    photog: findCol(headers, 'Photographer'),
    amount: findCol(headers, 'Amount'),
    phone: findCol(headers, 'Phone'),
    rapido: findCol(headers, 'Rapido'),
    name: findCol(headers, 'Delivery Name'), 
    signature: findCol(headers, 'Signature'),
    id: findCol(headers, 'CRM ID'),
    updated: findCol(headers, 'Updated At')
  };
}

function findCol(headers, name) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(name);
  
  const aliases = {
    'deliveryname': ['deliveryname', 'customername', 'name', 'delivery', 'customer'],
    'crmid': ['crmid', 'id', 'recordid', 'internalid'],
    'photographer': ['photographer', 'photographername', 'user', 'photog', 'assignedto'],
    'amount': ['amount', 'receivedamount', 'price', 'amt', 'payment'],
    'footagelink': ['footagelink', 'drivelink', 'link', 'footage', 'folderlink']
  };

  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (h === target) return i;
    if (aliases[target] && aliases[target].includes(h)) return i;
  }
  return -1;
}

function createRowArray(delivery, headers, colIdx) {
  const row = new Array(headers.length).fill('');
  return updateRowArray(row, delivery, headers, colIdx);
}

function updateRowArray(row, delivery, headers, colIdx) {
  if (colIdx.date > -1) row[colIdx.date] = delivery.date || '';
  if (colIdx.name > -1) row[colIdx.name] = delivery.delivery_name || '';
  if (colIdx.link > -1) row[colIdx.link] = delivery.footage_link || '';
  if (colIdx.reel > -1) row[colIdx.reel] = delivery.reel_link || '';
  if (colIdx.photog > -1) row[colIdx.photog] = delivery.photographer_name || '';
  if (colIdx.amount > -1) row[colIdx.amount] = delivery.received_amount || 0;
  if (colIdx.phone > -1) row[colIdx.phone] = delivery.customer_phone || '';
  if (colIdx.rapido > -1) row[colIdx.rapido] = delivery.rapido_charge || 0;
  
  if (colIdx.signature > -1) row[colIdx.signature] = delivery.signature || '';
  if (colIdx.id > -1) row[colIdx.id] = delivery.id || '';
  if (colIdx.updated > -1) row[colIdx.updated] = new Date().toLocaleString('en-IN');
  
  return row;
}

function deleteRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = findCol(headers, 'CRM ID');
  
  if (idCol === -1) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'CRM ID column not found' }));

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'deleted' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Row not found' }));
}
