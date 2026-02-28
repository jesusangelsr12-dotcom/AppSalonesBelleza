/**
 * POST /api/login
 * Valida un PIN de 6 dígitos buscando en todos los salones registrados.
 * Body: { pin_hash }
 * Respuesta: { success, salon_id, salon_nombre, sheet_id, logo_url, servicios, productos }
 */

const { readSheet } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { pin_hash } = req.body;

    if (!pin_hash) {
      return res.status(400).json({ error: 'PIN requerido' });
    }

    // Leer todos los salones de la hoja maestra
    // Columnas: salon_id, salon_nombre, sheet_id
    const masterRows = await readSheet(process.env.MASTER_SHEET_ID, 'Salones!A:C');
    const salones = masterRows.slice(1); // Saltar headers

    // Buscar en cada salón cuál tiene el PIN que coincide
    for (const row of salones) {
      const salonId = row[0];
      const salonNombre = row[1];
      const sheetId = row[2];

      if (!sheetId) continue;

      try {
        // Leer Config del Sheet del salón
        // Columnas: salon_nombre, logo_url, pin_hash, servicios, productos, trabajadoras
        const configRows = await readSheet(sheetId, 'Config!A:F');
        const configData = configRows[1]; // Row 0 = headers, Row 1 = data

        if (!configData) continue;

        const storedHash = configData[2];

        if (pin_hash === storedHash) {
          // PIN encontrado — login exitoso
          const safeJSON = (str) => {
            try { return JSON.parse(str || '[]'); } catch { return []; }
          };

          return res.status(200).json({
            success: true,
            salon_id: salonId,
            salon_nombre: configData[0] || salonNombre,
            sheet_id: sheetId,
            logo_url: configData[1] || '',
            servicios: safeJSON(configData[3]),
            productos: safeJSON(configData[4]),
            trabajadoras: safeJSON(configData[5]),
          });
        }
      } catch {
        // Si falla leer un salón individual, continuar con el siguiente
        continue;
      }
    }

    // Ningún salón coincidió
    res.status(401).json({ error: 'PIN incorrecto' });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al validar PIN' });
  }
};
