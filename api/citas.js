/**
 * GET/POST/PATCH/DELETE /api/citas
 * Lee citas de un día, registra, edita la nota o elimina una cita.
 * GET    ?sheet_id=xxx&fecha=2026-02-24 → { citas: [...] }
 * POST   { sheet_id, fecha, timestamp, clienta, items, total, metodo_pago, nota?, comisiones? } → { success }
 * PATCH  { sheet_id, fecha, timestamp, clienta, nota } → { success }
 * DELETE { sheet_id, fecha, timestamp, clienta } → { success }
 *
 * Citas cols: A=fecha, B=timestamp, C=clienta, D=items(JSON), E=total, F=metodo_pago, G=nota
 * items es un JSON array: [{"tipo":"servicio","nombre":"Corte","costo":200}, ...]
 *
 * Nota: Sheets recorta las celdas vacías del final, así que las filas viejas
 * (escritas cuando solo existían 6 columnas) llegan sin row[6]. Se lee siempre
 * con fallback; nunca usar row.length para detectar el formato.
 */

const { readSheet, appendSheet, updateSheet, deleteRow } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { sheet_id, fecha } = req.query;
      if (!sheet_id || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:G');
      // Row 0 = headers: fecha, timestamp, clienta, items/servicio, total/costo, metodo_pago, nota
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
            nota: row[6] || '',
          };
        });

      return res.status(200).json({ citas });
    }

    if (req.method === 'POST') {
      const { sheet_id, fecha, timestamp, clienta, items, total, metodo_pago, nota, comisiones } = req.body;

      // `nota` es opcional a propósito: los clientes viejos que quedaron
      // cacheados no la mandan y deben seguir funcionando.
      if (!sheet_id || !fecha || !clienta || !items || total === undefined || !metodo_pago) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      await appendSheet(sheet_id, 'Citas!A:G', [
        [fecha, timestamp, clienta, JSON.stringify(items), String(total), metodo_pago, nota || ''],
      ]);

      // Escribir comisiones en hoja separada si existen
      // Comisiones cols: fecha, timestamp, clienta, trabajadora, item, tipo, costo, pct, comision
      if (comisiones && comisiones.length > 0) {
        const comisionRows = comisiones.map((c) => [
          fecha,
          timestamp,
          clienta,
          c.trabajadora,
          c.item,
          c.tipo,
          String(c.costo),
          String(c.pct),
          String(c.comision),
        ]);
        await appendSheet(sheet_id, 'Comisiones!A:I', comisionRows);
      }

      return res.status(201).json({ success: true });
    }

    if (req.method === 'PATCH') {
      const { sheet_id, fecha, timestamp, clienta, nota } = req.body;

      if (!sheet_id || !fecha || !timestamp || !clienta) {
        return res.status(400).json({ error: 'Faltan datos para identificar la cita' });
      }
      // Una nota vacía es válida: sirve para borrarla
      if (typeof nota !== 'string') {
        return res.status(400).json({ error: 'Nota inválida' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:G');
      const rowIndex = rows.findIndex(
        (row, i) => i > 0 && row[0] === fecha && row[1] === timestamp && row[2] === clienta
      );

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      // rowIndex es 0-based e incluye la fila de encabezados en la posición 0,
      // mientras que la notación A1 es 1-based → la fila real es rowIndex + 1.
      // (deleteRow abajo NO lleva el +1 porque deleteDimension sí es 0-based.)
      await updateSheet(sheet_id, `Citas!G${rowIndex + 1}`, [[nota]]);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { sheet_id, fecha, timestamp, clienta } = req.body;

      if (!sheet_id || !fecha || !timestamp || !clienta) {
        return res.status(400).json({ error: 'Faltan datos para identificar la cita' });
      }

      const rows = await readSheet(sheet_id, 'Citas!A:G');
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
