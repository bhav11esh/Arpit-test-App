/**
 * 🚀 GOOGLE APPS SCRIPT SYNC BRIDGE - V17.6 (SMART SENSING)
 * 
 * FEATURES:
 * - Smart Header Sensing: Dynamically finds the header row (scans first 10 rows).
 * - Multi-Layer Date Fix: Overcomes US/India locale mismatch by reading Display Values.
 * - Hunter Priority: Matches by Google Drive ID BEFORE checking any dates.
 * - Quad-Factor Matching (QFM): Matches by Date, Photographer, and Link Text for text-only rows.
 * - Robust Meta-Mapping: Ensures CRM ID, Signature, and Updated At are always filled.
 */

const VERSION = "17.8";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', version: VERSION }))
    .setMimeType(ContentService.MimeType.JSON);
}

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
    if (!sheet) sheet = spreadsheet.getSheets()[0];

    const headerRowInfo = findHeaderRow(sheet);
    const headers = headerRowInfo.values;
    repairHeadersIfNeeded(sheet, headerRowInfo.index, headers);
    const finalHeaders = sheet.getRange(headerRowInfo.index, 1, 1, sheet.getLastColumn()).getValues()[0];
    const finalColIdx = buildColIdx(finalHeaders);

    if (action === 'delete') return deleteRow(sheet, finalColIdx, id);
    if (action === 'read') return readSheet(sheet, tz);
    if (deliveries) return processBulkSync(sheet, deliveries, tz, headerRowInfo.index, finalColIdx, finalHeaders);
    return processSync(sheet, delivery, tz, headerRowInfo.index, finalColIdx, finalHeaders);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function findHeaderRow(sheet) {
  const data = sheet.getRange(1, 1, 10, Math.max(sheet.getLastColumn(), 1)).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join(" ").toLowerCase();
    if (rowStr.includes("date") || rowStr.includes("link") || rowStr.includes("crm id") || rowStr.includes("photog")) {
      return { index: i + 1, values: row };
    }
  }
  return { index: 1, values: data[0] };
}

function readSheet(sheet, tz) {
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const result = data.map((row, rIdx) => {
    return row.map((cell, cIdx) => {
      const s = String(displayData[rIdx][cIdx]).trim();
      const dmyMatch = s.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})\s*$/);
      if (dmyMatch) {
         let d = parseInt(dmyMatch[1]);
         let m = parseInt(dmyMatch[2]);
         let y = dmyMatch[3].length === 2 ? '20' + dmyMatch[3] : dmyMatch[3];
         if (m > 12 && d <= 12) return `${y}-${String(d).padStart(2,'0')}-${String(m).padStart(2,'0')}`;
         return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      }
      if (Object.prototype.toString.call(cell) === '[object Date]') return Utilities.formatDate(cell, tz || "GMT+5:30", "yyyy-MM-dd");
      return s;
    });
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function processBulkSync(sheet, deliveries, tz, headerIndex, colIdx, headers) {
  const stats = { updated: 0, appended: 0 };
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const updatedIndices = new Set();

  deliveries.forEach(delivery => {
    const matchIdx = findRowIndex(displayData, data, delivery, colIdx, updatedIndices, tz);
    if (matchIdx > -1) {
      const rowNum = matchIdx + 1;
      const originalRow = data[matchIdx];
      const updatedRow = updateRowArray(originalRow, delivery, headers, colIdx);
      sheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);
      updatedIndices.add(matchIdx);
      stats.updated++;
    } else {
      const newRow = createRowArray(delivery, headers, colIdx);
      sheet.appendRow(newRow);
      stats.appended++;
      // Sync local arrays for next iteration
      data.push(newRow);
      displayData.push(newRow.map(c => String(c)));
    }
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', stats }))
    .setMimeType(ContentService.MimeType.JSON);
}

function processSync(sheet, delivery, tz, headerIndex, colIdx, headers) {
  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const matchIdx = findRowIndex(displayData, data, delivery, colIdx, null, tz);
  if (matchIdx > -1) {
    const updatedRow = updateRowArray(data[matchIdx], delivery, headers, colIdx);
    sheet.getRange(matchIdx + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'updated' }));
  } else {
    sheet.appendRow(createRowArray(delivery, headers, colIdx));
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'appended' }));
  }
}

function buildColIdx(headers) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const find = (target, aliases) => {
    const t = norm(target);
    for (let i = 0; i < headers.length; i++) {
      const h = norm(headers[i]);
      if (h === t || (aliases && aliases.includes(h))) return i;
    }
    return -1;
  };
  return {
    date: find('date', ['deliverydate', 'shootdate']),
    name: find('customername', ['name', 'deliveryname', 'customer']),
    link: find('footagelink', ['link', 'drivelink', 'footage']),
    id: find('crmid', ['id', 'recordid']),
    photog: find('photographer', ['photog', 'user', 'photographername']),
    amount: find('amount', ['received', 'price', 'amt', 'amountreceived', 'receivedamount']),
    phone: find('phone', ['contact', 'customerphone', 'phonenumber', 'customerphonenumber']),
    rapido: find('rapido', ['travel', 'rapi']),
    signature: find('signature', ['sig']),
    updated: find('updatedat', ['updated']),
    reel: find('reellink', ['reel'])
  };
}

function findRowIndex(displayData, data, delivery, colIdx, updatedIndices, tz) {
  const targetId = String(delivery.id || "").trim();
  const targetLinkID = extractId(delivery.footage_link || "");
  const targetReelID = extractId(delivery.reel_link || "");
  const targetPhotog = String(delivery.photographer_name || "").trim().toLowerCase();
  const targetDate = normalizeDate(delivery.date, tz);

  for (let i = 1; i < displayData.length; i++) {
    if (updatedIndices && updatedIndices.has(i)) continue;
    
    // 1. PRIMARY MATCH: CRM ID
    const rowId = colIdx.id > -1 ? String(displayData[i][colIdx.id]).trim() : "";
    if (targetId && rowId === targetId) return i;
    
    // 2. HUNTER MODE: Drive ID
    if (targetLinkID || targetReelID) {
      const rowStr = displayData[i].join(" ");
      if (targetLinkID && rowStr.includes(targetLinkID)) return i;
      if (targetReelID && rowStr.includes(targetReelID)) return i;
    }

    // 3. Fallback: Date + Photographer + (Optional) Text Match
    // 🚀 V17.6: We use displayData[i] (what you see) instead of data[i] 
    // to avoid "Date Flipping" by US-locale sheets.
    const rowDateRaw = colIdx.date > -1 ? normalizeDate(displayData[i][colIdx.date], tz) : "";
    if (targetDate && rowDateRaw === targetDate) {
      const rowPhotog = colIdx.photog > -1 ? String(displayData[i][colIdx.photog]).trim().toLowerCase() : "";
      if (targetPhotog && rowPhotog && (targetPhotog.includes(rowPhotog) || rowPhotog.includes(targetPhotog))) {
        if (!targetLinkID && !targetReelID) {
          const rowFLink = colIdx.link > -1 ? String(displayData[i][colIdx.link]).trim().toLowerCase() : "";
          const targetFLink = String(delivery.footage_link || "").trim().toLowerCase();
          const rowRLink = colIdx.reel > -1 ? String(displayData[i][colIdx.reel]).trim().toLowerCase() : "";
          const targetRLink = String(delivery.reel_link || "").trim().toLowerCase();
          const fMatch = (targetFLink && rowFLink && targetFLink === rowFLink);
          const rMatch = (targetRLink && rowRLink && targetRLink === rowRLink);
          if (fMatch || rMatch) return i;
          if (!targetFLink && !rowFLink && !targetRLink && !rowRLink) return i;
          continue;
        }
        return i;
      }
    }
  }
  return -1;
}

function updateRowArray(row, delivery, headers, colIdx) {
  while(row.length < headers.length) row.push("");
  if (colIdx.id > -1) row[colIdx.id] = String(delivery.id || "");
  if (colIdx.date > -1 && delivery.date) row[colIdx.date] = delivery.date;
  if (colIdx.name > -1) row[colIdx.name] = delivery.delivery_name || "";
  if (colIdx.link > -1) row[colIdx.link] = delivery.footage_link || "";
  if (colIdx.reel > -1) row[colIdx.reel] = delivery.reel_link || "";
  if (colIdx.photog > -1) row[colIdx.photog] = delivery.photographer_name || "";
  if (colIdx.amount > -1) row[colIdx.amount] = delivery.received_amount || 0;
  if (colIdx.phone > -1) row[colIdx.phone] = delivery.customer_phone || "";
  if (colIdx.rapido > -1) row[colIdx.rapido] = delivery.rapido_charge || 0;
  if (colIdx.signature > -1) row[colIdx.signature] = delivery.signature || "";
  if (colIdx.updated > -1) row[colIdx.updated] = Utilities.formatDate(new Date(), "GMT+5:30", "dd/MM/yyyy HH:mm:ss");
  return row;
}

function createRowArray(delivery, headers, colIdx) {
  return updateRowArray(new Array(headers.length).fill(""), delivery, headers, colIdx);
}

function repairHeadersIfNeeded(sheet, headIdx, headers) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const required = ['CRM ID', 'Signature', 'Updated At'];
  required.forEach(req => {
    const t = norm(req);
    let found = false;
    for (let h of headers) { if (norm(h) === t) { found = true; break; } }
    if (!found) {
      const lastCol = sheet.getLastColumn();
      sheet.getRange(headIdx, lastCol + 1).setValue(req).setBackground('#EFEFEF').setFontWeight('bold');
      headers.push(req);
    }
  });
}

function deleteRow(sheet, colIdx, id) {
  const displayData = sheet.getDataRange().getDisplayValues();
  if (colIdx.id === -1) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'CRM ID column not found' }));
  for (let i = 1; i < displayData.length; i++) {
    if (String(displayData[i][colIdx.id]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', action: 'deleted' }));
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Row not found' }));
}

function extractId(s) {
  if (!s) return "";
  const match = String(s).match(/[-\w]{25,}/);
  return match ? match[0] : "";
}

function normalizeDate(d, tz) {
  if (!d) return "";
  if (Object.prototype.toString.call(d) === '[object Date]') return Utilities.formatDate(d, tz || "GMT+5:30", "yyyy-MM-dd");
  let s = String(d).trim().replace(/[^\d\/\-\.]/g, '');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s;
  const dmyMatch = s.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})$/);
  if (dmyMatch) {
    let dd = parseInt(dmyMatch[1]);
    let mm = parseInt(dmyMatch[2]);
    let yy = dmyMatch[3].length === 2 ? "20"+dmyMatch[3] : dmyMatch[3];
    if (mm > 12 && dd <= 12) return `${yy}-${String(dd).padStart(2,'0')}-${String(mm).padStart(2,'0')}`;
    return `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  }
  return s.split('T')[0];
}