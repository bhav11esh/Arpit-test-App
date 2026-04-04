/**
 * V12.0 Advanced Multi-Tab Sync Service (STRICT DE-DUPLICATION)
 * FEATURES: 
 * - Auto-Repair Headers (Force adds Signature, CRM ID, Updated At)
 * - Strict Signature/ID Matching (Priority: CRM ID > Signature > Name)
 * - Alias support ("Customer Name" -> "Delivery Name")
 * - Bulk Sync Optimized (Safe for re-imports)
 * - Zero-Duplication Logic: Updates existing rows if ANY key matches.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for other processes to finish
    lock.waitLock(30000);
    
    const request = JSON.parse(e.postData.contents);
    const { action, sheetId, sheetName, delivery, deliveries, id } = request;
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    
    // Targeted sheet selection
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

    if (action === 'delete') {
      return deleteRow(sheet, id);
    } else if (deliveries) {
      return processBulkSync(sheet, deliveries);
    } else {
      return processSync(sheet, delivery);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
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

  const stats = { added: 0, updated: 0 };
  
  deliveries.forEach(delivery => {
    const rowIdx = findRowIndex(data, delivery, colIdx);
    
    if (rowIdx > -1) {
      const rowValues = updateRowArray(data[rowIdx], delivery, refreshedHeaders, colIdx);
      sheet.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
      stats.updated++;
    } else {
      const newRow = createRowArray(delivery, refreshedHeaders, colIdx);
      sheet.appendRow(newRow);
      // To prevent duplicates WITHIN the same batch if re-importing identical data
      data.push(newRow);
      stats.added++;
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', stats: stats }))
    .setMimeType(ContentService.MimeType.JSON);
}

function findRowIndex(data, delivery, colIdx) {
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 1. CRM ID Match
    if (colIdx.id > -1 && String(row[colIdx.id]) === String(delivery.id)) return i;
    
    // 2. Signature Match
    if (colIdx.signature > -1 && delivery.signature && String(row[colIdx.signature]) === String(delivery.signature)) return i;
    
    // 3. Name Match (Fallback for rows without Signature/ID yet)
    if (colIdx.name > -1 && delivery.delivery_name && String(row[colIdx.name]) === String(delivery.delivery_name)) {
      // Security: Only match by name if the row hasn't been "claimed" by another ID/Signature yet
      const rowId = colIdx.id > -1 ? String(row[colIdx.id]) : "";
      const rowSig = colIdx.signature > -1 ? String(row[colIdx.signature]) : "";
      if (!rowId && !rowSig) return i;
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
    'deliveryname': ['deliveryname', 'customername', 'name', 'delivery'],
    'crmid': ['crmid', 'id', 'recordid'],
    'photographer': ['photographer', 'photographername', 'user', 'photog'],
    'amount': ['amount', 'receivedamount', 'price', 'amt'],
    'footagelink': ['footagelink', 'drivelink', 'link', 'footage']
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
