/**
 * GET/POST /api/gastos
 * Lee gastos de un día o registra un nuevo gasto.
 * GET  ?sheet_id=xxx&fecha=2026-02-24 → { gastos: [...] }
 * POST { sheet_id, fecha, timestamp, descripcion, monto, metodo_pago } → { success }
 */

const { readSheet, appendSheet, deleteRow } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { sheet_id, fecha } = req.query;
      if (!sheet_id || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros' });
      }

      const rows = await readSheet(sheet_id, 'Gastos!A:E');
      // Row 0 = headers: fecha, timestamp, descripcion, monto, metodo_pago
      const gastos = rows.slice(1)
        .filter((row) => row[0] === fecha)
        .map((row) => ({
          fecha: row[0],
          timestamp: row[1],
          descripcion: row[2],
          monto: parseFloat(row[3]) || 0,
          metodo_pago: row[4],
        }));

      return res.status(200).json({ gastos });
    }

    if (req.method === 'POST') {
      const { sheet_id, fecha, timestamp, descripcion, monto, metodo_pago } = req.body;

      if (!sheet_id || !fecha || !descripcion || monto === undefined || !metodo_pago) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      await appendSheet(sheet_id, 'Gastos!A:E', [
        [fecha, timestamp, descripcion, String(monto), metodo_pago],
      ]);

      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { sheet_id, fecha, timestamp, descripcion } = req.body;

      if (!sheet_id || !fecha || !timestamp || !descripcion) {
        return res.status(400).json({ error: 'Faltan datos para identificar el gasto' });
      }

      const rows = await readSheet(sheet_id, 'Gastos!A:E');
      const rowIndex = rows.findIndex(
        (row, i) => i > 0 && row[0] === fecha && row[1] === timestamp && row[2] === descripcion
      );

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      await deleteRow(sheet_id, 'Gastos', rowIndex);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en gastos:', error);
    res.status(500).json({ error: 'Error al procesar gastos' });
  }
};
