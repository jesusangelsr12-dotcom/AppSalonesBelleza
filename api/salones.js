/**
 * GET /api/salones
 * Retorna la lista de salones desde la hoja maestra.
 * Respuesta: { salones: [{ salon_id, salon_nombre, sheet_id }] }
 */

const { readSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const rows = await readSheet(process.env.MASTER_SHEET_ID, 'Salones!A:C');

    // La primera fila son headers, las siguientes son datos
    const salones = rows.slice(1).map((row) => ({
      salon_id: row[0],
      salon_nombre: row[1],
      sheet_id: row[2],
    }));

    res.status(200).json({ salones });
  } catch (error) {
    console.error('Error al leer salones:', error);
    res.status(500).json({ error: 'Error al obtener salones' });
  }
};
