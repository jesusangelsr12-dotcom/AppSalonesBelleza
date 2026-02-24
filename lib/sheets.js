/**
 * Cliente Google Sheets API v4
 * Autenticación con Service Account + operaciones de lectura/escritura
 */

const { google } = require('googleapis');

let sheetsClient = null;

/** Inicializa y retorna el cliente autenticado de Sheets */
function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Lee un rango de una hoja de cálculo.
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} range - Rango (ej: "Citas!A:F")
 * @returns {Promise<string[][]>} Filas de datos
 */
async function readSheet(spreadsheetId, range) {
  const sheets = getClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

/**
 * Escribe (append) filas al final de un rango.
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} range - Rango (ej: "Citas!A:F")
 * @param {string[][]} values - Filas a agregar
 */
async function appendSheet(spreadsheetId, range, values) {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Actualiza un rango específico (sobreescribe).
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} range - Rango exacto (ej: "Config!D2")
 * @param {string[][]} values - Datos a escribir
 */
async function updateSheet(spreadsheetId, range, values) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

module.exports = { readSheet, appendSheet, updateSheet };
