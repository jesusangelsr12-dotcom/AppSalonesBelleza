/**
 * GET/POST /api/config
 * Lee o actualiza el catálogo de servicios, productos y trabajadoras.
 * GET  ?sheet_id=xxx → { salon_nombre, logo_url, servicios, productos, trabajadoras }
 * POST { sheet_id, servicios, productos, trabajadoras } → { success }
 *
 * Config columns: A=salon_nombre, B=logo_url, C=pin_hash, D=servicios, E=productos, F=trabajadoras
 * trabajadoras JSON: [{"nombre":"Ana","pct_servicio":10,"pct_producto":5}, ...]
 */

const { readSheet, updateSheet } = require('../lib/sheets');

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); }
  catch { return fallback; }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const sheetId = req.query.sheet_id;
      if (!sheetId) {
        return res.status(400).json({ error: 'Falta sheet_id' });
      }

      const rows = await readSheet(sheetId, 'Config!A:F');
      const data = rows[1];

      if (!data) {
        return res.status(404).json({ error: 'Config no encontrada' });
      }

      return res.status(200).json({
        salon_nombre: data[0],
        logo_url: data[1] || '',
        servicios: safeParseJSON(data[3], []),
        productos: safeParseJSON(data[4], []),
        trabajadoras: safeParseJSON(data[5], []),
      });
    }

    if (req.method === 'POST') {
      const { sheet_id, servicios, productos, trabajadoras } = req.body;

      if (!sheet_id) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      await updateSheet(sheet_id, 'Config!D2:F2', [
        [
          JSON.stringify(servicios || []),
          JSON.stringify(productos || []),
          JSON.stringify(trabajadoras || []),
        ],
      ]);

      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en config:', error);
    res.status(500).json({ error: 'Error al procesar configuración' });
  }
};
