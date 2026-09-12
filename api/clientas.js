/**
 * GET/POST /api/clientas
 *
 * GET  ?sheet_id=xxx              → { clientas: ["Ana", ...], notas_fijas: { "ana": "..." } }
 * GET  ?sheet_id=xxx&historial=1  → { clientas: [{ nombre, key, nota_fija, total_visitas,
 *                                                 total_gastado, ultima_visita, visitas: [...] }] }
 * POST { sheet_id, clienta, nota_fija } → { success }
 *
 * El modo historial devuelve todo de una sola llamada para que el buscador
 * filtre en el navegador sin round-trips por tecla.
 *
 * Citas cols:    A=fecha, B=timestamp, C=clienta, D=items(JSON), E=total, F=metodo_pago, G=nota
 * Clientas cols: A=clienta, B=nota_fija, C=actualizado
 */

const { readSheet, appendSheet, updateSheet, ensureSheet } = require('../lib/sheets');

const CLIENTAS_HEADERS = ['clienta', 'nota_fija', 'actualizado'];

/**
 * Clave para agrupar e identificar a una clienta.
 * El nombre es texto libre, así que "María", "maria" y "MARIA " deben ser la misma.
 * OJO: esta función está duplicada en public/js/utils.js (api es CommonJS y el
 * front es ESM, no comparten módulos). Si cambia una, cambiar la otra.
 */
function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Lee la hoja Clientas; devuelve [] si el salón todavía no la tiene. */
async function readClientas(sheetId) {
  try {
    return await readSheet(sheetId, 'Clientas!A:C');
  } catch {
    return [];
  }
}

/** Parseo tolerante de la columna de items (soporta el formato viejo). */
function parseItems(row) {
  try {
    return { items: JSON.parse(row[3]), total: parseFloat(row[4]) || 0 };
  } catch {
    return {
      items: [{ tipo: 'servicio', nombre: row[3], costo: parseFloat(row[4]) || 0 }],
      total: parseFloat(row[4]) || 0,
    };
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { sheet_id, historial } = req.query;
      if (!sheet_id) {
        return res.status(400).json({ error: 'Falta sheet_id' });
      }

      // --- Modo historial: todo agrupado por clienta ---
      if (historial) {
        const [citasRows, clientasRows] = await Promise.all([
          readSheet(sheet_id, 'Citas!A:G'),
          readClientas(sheet_id),
        ]);

        // Notas fijas por clave normalizada
        const notas = {};
        for (let i = 1; i < clientasRows.length; i++) {
          const row = clientasRows[i];
          const nombre = (row[0] || '').trim();
          if (!nombre) continue;
          notas[normalizeNombre(nombre)] = { nombre, nota: row[1] || '' };
        }

        const grupos = {};
        for (let i = 1; i < citasRows.length; i++) {
          const row = citasRows[i];
          const nombreRaw = row[2];
          if (!nombreRaw || !(nombreRaw || '').trim()) continue;

          const key = normalizeNombre(nombreRaw);
          const { items, total } = parseItems(row);

          if (!grupos[key]) {
            grupos[key] = {
              nombre: nombreRaw.trim(),
              key,
              nota_fija: '',
              total_visitas: 0,
              total_gastado: 0,
              ultima_visita: '',
              visitas: [],
            };
          }

          const g = grupos[key];
          g.total_visitas += 1;
          g.total_gastado += total;
          g.visitas.push({
            fecha: row[0],
            timestamp: row[1],
            // Nombre EXACTO de la hoja: es lo que el PATCH necesita para
            // localizar la fila. No normalizar ni recortar.
            clienta_raw: nombreRaw,
            items,
            total,
            metodo_pago: row[5],
            nota: row[6] || '',
          });
        }

        const clientas = Object.values(grupos).map((g) => {
          // Más reciente primero
          g.visitas.sort((a, b) =>
            (b.fecha || '').localeCompare(a.fecha || '') ||
            (b.timestamp || '').localeCompare(a.timestamp || '')
          );
          g.ultima_visita = g.visitas.length > 0 ? g.visitas[0].fecha : '';
          // La grafía preferida es la que la usuaria escribió en la hoja
          // Clientas; si no hay, la de la visita más reciente.
          const fija = notas[g.key];
          if (fija) {
            g.nota_fija = fija.nota;
            g.nombre = fija.nombre;
          } else if (g.visitas.length > 0) {
            g.nombre = (g.visitas[0].clienta_raw || '').trim();
          }
          return g;
        });

        // Clientas con nota fija pero sin ninguna cita todavía
        for (const [key, fija] of Object.entries(notas)) {
          if (grupos[key]) continue;
          clientas.push({
            nombre: fija.nombre,
            key,
            nota_fija: fija.nota,
            total_visitas: 0,
            total_gastado: 0,
            ultima_visita: '',
            visitas: [],
          });
        }

        clientas.sort((a, b) => (b.ultima_visita || '').localeCompare(a.ultima_visita || ''));
        return res.status(200).json({ clientas });
      }

      // --- Modo lista: nombres únicos (lo usa el autocomplete de la cita) ---
      const [citasRows, clientasRows] = await Promise.all([
        readSheet(sheet_id, 'Citas!C:C'),
        readClientas(sheet_id),
      ]);

      const names = new Set();
      for (let i = 1; i < citasRows.length; i++) {
        const name = (citasRows[i][0] || '').trim();
        if (name) names.add(name);
      }

      // Notas fijas para poder avisar de alergias sin una llamada extra
      const notas_fijas = {};
      for (let i = 1; i < clientasRows.length; i++) {
        const row = clientasRows[i];
        const nombre = (row[0] || '').trim();
        if (!nombre) continue;
        names.add(nombre);
        if (row[1]) notas_fijas[normalizeNombre(nombre)] = row[1];
      }

      return res.status(200).json({ clientas: [...names].sort(), notas_fijas });
    }

    if (req.method === 'POST') {
      const { sheet_id, clienta, nota_fija } = req.body;

      if (!sheet_id || !clienta || !String(clienta).trim()) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }
      // Vaciar la nota es válido
      if (typeof nota_fija !== 'string') {
        return res.status(400).json({ error: 'Nota inválida' });
      }

      await ensureSheet(sheet_id, 'Clientas', CLIENTAS_HEADERS);

      const nombre = String(clienta).trim();
      const rows = await readSheet(sheet_id, 'Clientas!A:C');
      const rowIndex = rows.findIndex(
        (row, i) => i > 0 && normalizeNombre(row[0]) === normalizeNombre(nombre)
      );
      const hoy = new Date().toISOString().slice(0, 10);

      if (rowIndex === -1) {
        await appendSheet(sheet_id, 'Clientas!A:C', [[nombre, nota_fija, hoy]]);
      } else {
        // rowIndex es 0-based con el encabezado en la posición 0;
        // la notación A1 es 1-based → fila real = rowIndex + 1
        const fila = rowIndex + 1;
        await updateSheet(sheet_id, `Clientas!A${fila}:C${fila}`, [[nombre, nota_fija, hoy]]);
      }

      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en clientas:', error);
    res.status(500).json({ error: 'Error al procesar clientas' });
  }
};
