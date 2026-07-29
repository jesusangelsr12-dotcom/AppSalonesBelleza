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

/**
 * Obtiene el ID numérico de una hoja dentro de un spreadsheet.
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} sheetName - Nombre de la hoja (ej: "Citas")
 * @returns {Promise<number>} sheetId numérico
 */
async function getSheetId(spreadsheetId, sheetName) {
  const sheets = getClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const sheet = response.data.sheets.find(
    (s) => s.properties.title === sheetName
  );
  if (!sheet) throw new Error(`Hoja "${sheetName}" no encontrada`);
  return sheet.properties.sheetId;
}

/**
 * Se asegura de que exista una hoja; si no, la crea con sus encabezados.
 * Es idempotente y solo agrega: nunca toca datos existentes.
 *
 * Sirve para salones creados antes de que existiera la hoja (escribir en
 * una hoja inexistente falla), así que se llama solo desde los caminos de
 * escritura. Para leer, envolver en try/catch y devolver vacío.
 *
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} sheetName - Nombre de la hoja (ej: "Clientas")
 * @param {string[]} headers - Encabezados a escribir si se crea
 */
async function ensureSheet(spreadsheetId, sheetName, headers) {
  const sheets = getClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });

  const exists = response.data.sheets.some((s) => s.properties.title === sheetName);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });

  if (headers && headers.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

/**
 * Elimina una fila específica de una hoja.
 * @param {string} spreadsheetId - ID del Google Sheet
 * @param {string} sheetName - Nombre de la hoja (ej: "Citas")
 * @param {number} rowIndex - Índice de la fila (0-based, incluyendo header)
 */
async function deleteRow(spreadsheetId, sheetName, rowIndex) {
  const sheets = getClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

module.exports = { readSheet, appendSheet, updateSheet, deleteRow, ensureSheet };
