/**
 * GOOGLE SHEETS SYNC BRIDGE (V4.2 - LITERAL STRINGS)
 * 
 * Version 4.2: Uses getDisplayValues() to get literal text from cells.
 */

function doPost(e) {
    var responseObj = { status: 'error', version: 'v4.2' };
    try {
        var data = JSON.parse(e.postData.contents);
        var sheetId = data.sheetId;
        var action = data.action || 'sync';

        if (!sheetId) {
            responseObj.message = 'Missing sheetId';
            return returnJson(responseObj);
        }

        var ss = SpreadsheetApp.openById(sheetId);
        var sheets = ss.getSheets();
        var sheet = sheets[0];

        // Find the first tab that has actual data
        for (var i = 0; i < sheets.length; i++) {
            if (sheets[i].getLastRow() > 1) {
                sheet = sheets[i];
                break;
            }
        }

        // Handle READ action
        if (action === 'read') {
            var range = sheet.getDataRange();
            var displayValues = range.getDisplayValues(); // Literal text as seen in sheet

            var headers = displayValues[0];
            var rows = displayValues.slice(1).map(function (row) {
                var obj = {};
                headers.forEach(function (header, i) {
                    obj[header] = row[i];
                });
                return obj;
            });
            responseObj.status = 'success';
            responseObj.data = rows;
            responseObj.sheetName = sheet.getName();
            responseObj.version = 'v4.2';
            return returnJson(responseObj);
        }

        // Handle SYNC action
        var deliveries = data.deliveries || [data.delivery];
        deliveries.forEach(function (delivery) {
            if (!delivery) return;
            sheet.appendRow([
                delivery.delivery_name,
                delivery.date, // Send literal date string
                delivery.timing || 'N/A',
                delivery.payment_type,
                delivery.footage_link || 'Pending',
                delivery.reel_link || 'Pending',
                new Date().toLocaleString()
            ]);
        });
        responseObj.status = 'success';
        responseObj.count = deliveries.length;
        responseObj.version = 'v4.2';
        return returnJson(responseObj);

    } catch (error) {
        responseObj.message = error.toString();
        return returnJson(responseObj);
    }
}

function returnJson(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
    return ContentService.createTextOutput("Sync Bridge V4.2 is alive! Web App is correctly receiving requests. Using display values for perfect date parsing.");
}
