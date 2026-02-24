/**
 * POST /api/login
 * Valida el PIN de un salón comparando hashes SHA-256.
 * Body: { salon_id, pin_hash }
 * Respuesta: { success, salon_nombre, sheet_id, logo_url, servicios }
 */

const { readSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { salon_id, pin_hash } = req.body;

    if (!salon_id || !pin_hash) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Buscar el sheet_id del salón en la hoja maestra
    const masterRows = await readSheet(process.env.MASTER_SHEET_ID, 'Salones!A:C');
    const salonRow = masterRows.find((row) => row[0] === salon_id);

    if (!salonRow) {
      return res.status(404).json({ error: 'Salón no encontrado' });
    }

    const sheetId = salonRow[2];

    // Leer Config del Sheet del salón
    const configRows = await readSheet(sheetId, 'Config!A:D');
    // Row 0 = headers, Row 1 = data
    // Columnas: salon_nombre, logo_url, pin_hash, servicios
    const configData = configRows[1];

    if (!configData) {
      return res.status(500).json({ error: 'Config del salón no encontrada' });
    }

    const storedHash = configData[2];

    if (pin_hash !== storedHash) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    // Parse servicios (JSON array)
    let servicios = [];
    try {
      servicios = JSON.parse(configData[3] || '[]');
    } catch {
      servicios = [];
    }

    res.status(200).json({
      success: true,
      salon_id,
      salon_nombre: configData[0],
      sheet_id: sheetId,
      logo_url: configData[1] || '',
      servicios,
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al validar PIN' });
  }
};
