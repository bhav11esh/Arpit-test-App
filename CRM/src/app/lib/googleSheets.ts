import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // This will be dynamic per dealer soon
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export const syncToGoogleSheet = async (dealerSheetId: string, deliveryData: any) => {
    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        console.warn('Google Sheets credentials missing. Skipping sync.');
        return;
    }

    try {
        const serviceAccountAuth = new JWT({
            email: SERVICE_ACCOUNT_EMAIL,
            key: PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(dealerSheetId, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0]; // Assuming first sheet for now

        // Add row to spreadsheet
        await sheet.addRow({
            'Booking ID': deliveryData.request_id,
            'Date': new Date(deliveryData.created_at).toLocaleDateString(),
            'Venue': deliveryData.venue_name,
            'Table': deliveryData.table_name || 'N/A',
            'Drive Link': deliveryData.drive_link || 'Pending',
            'Status': deliveryData.status,
            'Updated At': new Date().toLocaleString(),
        });

        console.log(`Successfully synced ${deliveryData.request_id} to sheet ${dealerSheetId}`);
    } catch (error) {
        console.error('Error syncing to Google Sheets:', error);
    }
};
