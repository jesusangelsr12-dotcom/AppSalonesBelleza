/**
 * GET/POST /api/citas
 * Lee citas de un día o registra una nueva cita.
 * GET  ?sheet_id=xxx&fecha=2026-02-24 → { citas: [...] }
 * POST { sheet_id, fecha, timestamp, clienta, servicio, costo, metodo_pago } → { success }
 */

const { readSheet, appendSheet, deleteRow } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { sheet_id, fecha } = req.query;
      if (!sheet_id || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:F');
      // Row 0 = headers: fecha, timestamp, clienta, servicio, costo, metodo_pago
      const citas = rows.slice(1)
        .filter((row) => row[0] === fecha)
        .map((row) => ({
          fecha: row[0],
          timestamp: row[1],
          clienta: row[2],
          servicio: row[3],
          costo: parseFloat(row[4]) || 0,
          metodo_pago: row[5],
        }));

      return res.status(200).json({ citas });
    }

    if (req.method === 'POST') {
      const { sheet_id, fecha, timestamp, clienta, servicio, costo, metodo_pago } = req.body;

      if (!sheet_id || !fecha || !clienta || !servicio || costo === undefined || !metodo_pago) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      await appendSheet(sheet_id, 'Citas!A:F', [
        [fecha, timestamp, clienta, servicio, String(costo), metodo_pago],
      ]);

      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { sheet_id, fecha, timestamp, clienta } = req.body;

      if (!sheet_id || !fecha || !timestamp || !clienta) {
        return res.status(400).json({ error: 'Faltan datos para identificar la cita' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:F');
      // Buscar la fila que coincida (desde index 1 para saltar headers)
      const rowIndex = rows.findIndex(
        (row, i) => i > 0 && row[0] === fecha && row[1] === timestamp && row[2] === clienta
      );

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      await deleteRow(sheet_id, 'Citas', rowIndex);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en citas:', error);
    res.status(500).json({ error: 'Error al procesar citas' });
  }
};
