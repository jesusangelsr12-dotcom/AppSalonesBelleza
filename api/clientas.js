/**
 * GET /api/clientas
 * Devuelve nombres únicos de clientas desde la hoja de Citas.
 * GET ?sheet_id=xxx → { clientas: ["María", "Ana", ...] }
 */

const { readSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { sheet_id } = req.query;
    if (!sheet_id) {
      return res.status(400).json({ error: 'Falta sheet_id' });
    }

    const rows = await readSheet(sheet_id, 'Citas!C:C');
    // Row 0 = header ("clienta"), skip it
    const names = new Set();
    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i][0] || '').trim();
      if (name) names.add(name);
    }

    return res.status(200).json({ clientas: [...names].sort() });
  } catch (error) {
    console.error('Error en clientas:', error);
    res.status(500).json({ error: 'Error al obtener clientas' });
  }
};
