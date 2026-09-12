/**
 * GET /api/comisiones
 * Lee las comisiones registradas en un rango de fechas.
 * GET ?sheet_id=xxx&desde=2026-07-01&hasta=2026-07-31 → { comisiones: [...] }
 *
 * Comisiones cols (A:I): fecha, timestamp, clienta, trabajadora, item, tipo, costo, pct, comision
 * desde/hasta son opcionales (formato YYYY-MM-DD). Si se omiten, devuelve todo.
 */

const { readSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { sheet_id, desde, hasta } = req.query;
    if (!sheet_id) {
      return res.status(400).json({ error: 'Falta sheet_id' });
    }

    let rows;
    try {
      rows = await readSheet(sheet_id, 'Comisiones!A:I');
    } catch {
      // Salón sin hoja de Comisiones todavía → lista vacía
      return res.status(200).json({ comisiones: [] });
    }

    // Row 0 = headers
    const comisiones = rows.slice(1)
      .filter((row) => {
        const fecha = row[0];
        if (!fecha) return false;
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
      })
      .map((row) => ({
        fecha: row[0],
        timestamp: row[1],
        clienta: row[2],
        trabajadora: row[3],
        item: row[4],
        tipo: row[5],
        costo: parseFloat(row[6]) || 0,
        pct: parseFloat(row[7]) || 0,
        comision: parseFloat(row[8]) || 0,
      }));

    return res.status(200).json({ comisiones });
  } catch (error) {
    console.error('Error en comisiones:', error);
    res.status(500).json({ error: 'Error al obtener comisiones' });
  }
};
