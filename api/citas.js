/**
 * GET/POST/DELETE /api/citas
 * Lee citas de un día, registra o elimina una cita.
 * GET  ?sheet_id=xxx&fecha=2026-02-24 → { citas: [...] }
 * POST { sheet_id, fecha, timestamp, clienta, items, total, metodo_pago } → { success }
 * DELETE { sheet_id, fecha, timestamp, clienta } → { success }
 *
 * items es un JSON array: [{"tipo":"servicio","nombre":"Corte","costo":200}, ...]
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
      // Row 0 = headers: fecha, timestamp, clienta, items/servicio, total/costo, metodo_pago
      const citas = rows.slice(1)
        .filter((row) => row[0] === fecha)
        .map((row) => {
          // Soportar formato nuevo (items JSON) y viejo (servicio string)
          let items = [];
          let total = 0;
          try {
            items = JSON.parse(row[3]);
            total = parseFloat(row[4]) || 0;
          } catch {
            // Formato viejo: servicio es string, costo es número
            items = [{ tipo: 'servicio', nombre: row[3], costo: parseFloat(row[4]) || 0 }];
            total = parseFloat(row[4]) || 0;
          }

          return {
            fecha: row[0],
            timestamp: row[1],
            clienta: row[2],
            items,
            total,
            metodo_pago: row[5],
          };
        });

      return res.status(200).json({ citas });
    }

    if (req.method === 'POST') {
      const { sheet_id, fecha, timestamp, clienta, items, total, metodo_pago } = req.body;

      if (!sheet_id || !fecha || !clienta || !items || total === undefined || !metodo_pago) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      await appendSheet(sheet_id, 'Citas!A:F', [
        [fecha, timestamp, clienta, JSON.stringify(items), String(total), metodo_pago],
      ]);

      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { sheet_id, fecha, timestamp, clienta } = req.body;

      if (!sheet_id || !fecha || !timestamp || !clienta) {
        return res.status(400).json({ error: 'Faltan datos para identificar la cita' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:F');
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
