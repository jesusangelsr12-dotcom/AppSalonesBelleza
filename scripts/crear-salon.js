#!/usr/bin/env node
/**
 * Crear un nuevo salón
 * ---------------------
 * Genera un Google Sheet con la estructura estándar de la app
 * (hojas: Config, Citas, Comisiones, Gastos), lo registra en la hoja
 * maestra (MASTER_SHEET_ID → pestaña "Salones") y, opcionalmente, copia
 * el catálogo de servicios / productos / trabajadoras de un salón ya
 * existente para que el nuevo "traiga las mismas configuraciones".
 *
 * Uso:
 *   node scripts/crear-salon.js --nombre "Testing"
 *   node scripts/crear-salon.js --nombre "Testing" --pin 123456
 *   node scripts/crear-salon.js --nombre "Testing" --pin 123456 --plantilla salon_001
 *   node scripts/crear-salon.js --nombre "Testing" --compartir tucorreo@gmail.com
 *
 * Flags:
 *   --nombre      Nombre del salón (obligatorio).
 *   --pin         PIN de 6 dígitos para poder iniciar sesión. Si se omite,
 *                 el salón se crea SIN PIN (no se podrá entrar hasta asignarlo).
 *   --plantilla   salon_id o sheet_id de un salón existente del cual copiar
 *                 servicios / productos / trabajadoras. Si se omite, el salón
 *                 se crea con catálogos vacíos.
 *   --compartir   Correo de Google con el que compartir el Sheet (editor),
 *                 para verlo/administrarlo desde tu Drive. Opcional.
 *
 * Requiere las mismas variables de entorno que la app:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, MASTER_SHEET_ID
 * (se leen de las variables de entorno o de un archivo .env en la raíz).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');

// ---- Carga sencilla de .env (sin dependencias) --------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// ---- Parseo de argumentos ------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    }
  }
  return args;
}

/** Hashea un PIN igual que el frontend: SHA-256 en hex minúsculas. */
function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin), 'utf8').digest('hex');
}

// ---- Cliente Google ------------------------------------------------------
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en el entorno / .env');
  }
  return new google.auth.JWT(email, null, key.replace(/\\n/g, '\n'), [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ]);
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  const nombre = args.nombre;
  if (!nombre || nombre === true) {
    console.error('❌ Falta --nombre. Ej: node scripts/crear-salon.js --nombre "Testing" --pin 123456');
    process.exit(1);
  }

  const pin = args.pin && args.pin !== true ? String(args.pin) : null;
  if (pin && !/^\d{6}$/.test(pin)) {
    console.error('❌ El --pin debe ser de 6 dígitos numéricos.');
    process.exit(1);
  }

  const masterId = process.env.MASTER_SHEET_ID;
  if (!masterId) {
    console.error('❌ Falta MASTER_SHEET_ID en el entorno / .env');
    process.exit(1);
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // 1. Leer la hoja maestra: salones existentes → siguiente salon_id y plantilla
  console.log('→ Leyendo hoja maestra…');
  const masterRes = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Salones!A:C',
  });
  const masterRows = masterRes.data.values || [];
  const dataRows = masterRows.slice(1); // saltar encabezados

  // Siguiente salon_id (salon_00N)
  let maxNum = 0;
  for (const row of dataRows) {
    const m = /^salon_(\d+)$/.exec((row[0] || '').trim());
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const salonId = `salon_${String(maxNum + 1).padStart(3, '0')}`;

  // 2. Resolver catálogos desde una plantilla (opcional)
  let servicios = [];
  let productos = [];
  let trabajadoras = [];
  if (args.plantilla && args.plantilla !== true) {
    // La plantilla puede ser un salon_id o un sheet_id directo
    let plantillaSheetId = args.plantilla;
    const bySalonId = dataRows.find((r) => (r[0] || '').trim() === args.plantilla);
    if (bySalonId) plantillaSheetId = bySalonId[2];

    console.log(`→ Copiando catálogo desde plantilla ${args.plantilla} (${plantillaSheetId})…`);
    const cfgRes = await sheets.spreadsheets.values.get({
      spreadsheetId: plantillaSheetId,
      range: 'Config!A:F',
    });
    const cfg = (cfgRes.data.values || [])[1] || [];
    const safe = (s) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
    servicios = safe(cfg[3]);
    productos = safe(cfg[4]);
    trabajadoras = safe(cfg[5]);
    console.log(`   Servicios: ${servicios.length} · Productos: ${productos.length} · Trabajadoras: ${trabajadoras.length}`);
  }

  // 3. Crear el spreadsheet con las 4 hojas
  console.log(`→ Creando Google Sheet "${nombre}"…`);
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: nombre },
      sheets: [
        { properties: { title: 'Config' } },
        { properties: { title: 'Citas' } },
        { properties: { title: 'Comisiones' } },
        { properties: { title: 'Gastos' } },
      ],
    },
  });
  const newSheetId = createRes.data.spreadsheetId;
  console.log(`   Creado: ${newSheetId}`);

  // 4. Escribir encabezados + fila de Config
  const pinHash = pin ? hashPin(pin) : '';
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: newSheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: 'Config!A1:F2',
          values: [
            ['salon_nombre', 'logo_url', 'pin_hash', 'servicios', 'productos', 'trabajadoras'],
            [nombre, '', pinHash, JSON.stringify(servicios), JSON.stringify(productos), JSON.stringify(trabajadoras)],
          ],
        },
        {
          range: 'Citas!A1:F1',
          values: [['fecha', 'timestamp', 'clienta', 'items', 'total', 'metodo_pago']],
        },
        {
          range: 'Comisiones!A1:I1',
          values: [['fecha', 'timestamp', 'clienta', 'trabajadora', 'item', 'tipo', 'costo', 'pct', 'comision']],
        },
        {
          range: 'Gastos!A1:E1',
          values: [['fecha', 'timestamp', 'descripcion', 'monto', 'metodo_pago']],
        },
      ],
    },
  });
  console.log('   Encabezados y Config escritos.');

  // 5. Compartir con un correo (opcional) para verlo desde tu Drive
  if (args.compartir && args.compartir !== true) {
    console.log(`→ Compartiendo con ${args.compartir}…`);
    try {
      await drive.permissions.create({
        fileId: newSheetId,
        sendNotificationEmail: false,
        requestBody: { type: 'user', role: 'writer', emailAddress: args.compartir },
      });
      console.log('   Compartido como editor.');
    } catch (e) {
      console.warn(`   ⚠ No se pudo compartir automáticamente: ${e.message}`);
    }
  }

  // 6. Registrar en la hoja maestra
  console.log('→ Registrando en la hoja maestra…');
  await sheets.spreadsheets.values.append({
    spreadsheetId: masterId,
    range: 'Salones!A:C',
    valueInputOption: 'RAW',
    requestBody: { values: [[salonId, nombre, newSheetId]] },
  });

  // 7. Resumen
  console.log('\n✅ Salón creado correctamente');
  console.log('────────────────────────────');
  console.log(`  salon_id : ${salonId}`);
  console.log(`  nombre   : ${nombre}`);
  console.log(`  sheet_id : ${newSheetId}`);
  console.log(`  URL      : https://docs.google.com/spreadsheets/d/${newSheetId}/edit`);
  if (pin) {
    console.log(`  PIN      : ${pin}  (ya puedes iniciar sesión en la app)`);
  } else {
    console.log('  PIN      : (sin asignar) — escribe el hash SHA-256 de tu PIN en Config!C2,');
    console.log('             o vuelve a correr el script con --pin 123456');
  }
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
