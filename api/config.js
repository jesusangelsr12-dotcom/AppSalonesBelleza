/**
 * GET/POST /api/config
 * Lee o actualiza el catálogo de servicios de un salón.
 * GET  ?sheet_id=xxx → { salon_nombre, logo_url, servicios }
 * POST { sheet_id, servicios } → { success }
 */

const { readSheet, updateSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const sheetId = req.query.sheet_id;
      if (!sheetId) {
        return res.status(400).json({ error: 'Falta sheet_id' });
      }

      const rows = await readSheet(sheetId, 'Config!A:D');
      const data = rows[1]; // Row 0 = headers

      if (!data) {
        return res.status(404).json({ error: 'Config no encontrada' });
      }

      let servicios = [];
      try {
        servicios = JSON.parse(data[3] || '[]');
      } catch {
        servicios = [];
      }

      return res.status(200).json({
        salon_nombre: data[0],
        logo_url: data[1] || '',
        servicios,
      });
    }

    if (req.method === 'POST') {
      const { sheet_id, servicios } = req.body;

      if (!sheet_id || !servicios) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Actualizar solo la columna D (servicios) fila 2
      await updateSheet(sheet_id, 'Config!D2', [[JSON.stringify(servicios)]]);

      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en config:', error);
    res.status(500).json({ error: 'Error al procesar configuración' });
  }
};
