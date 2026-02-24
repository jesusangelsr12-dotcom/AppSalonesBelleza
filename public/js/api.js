/**
 * Cliente HTTP para las serverless functions
 */

const BASE_URL = '/api';

/**
 * Llamada genérica a la API.
 * @param {string} endpoint - Ruta sin /api/ (ej: "salones", "login")
 * @param {object} options - { method, body }
 * @returns {Promise<object>} JSON de respuesta
 */
async function fetchAPI(endpoint, options = {}) {
  const { method = 'GET', body } = options;

  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

/** Obtener lista de salones desde la hoja maestra */
export function getSalones() {
  return fetchAPI('salones');
}

/** Validar PIN de un salón */
export function login(salonId, pinHash) {
  return fetchAPI('login', {
    method: 'POST',
    body: { salon_id: salonId, pin_hash: pinHash },
  });
}

/** Obtener configuración del salón (servicios, etc.) */
export function getConfig(sheetId) {
  return fetchAPI(`config?sheet_id=${encodeURIComponent(sheetId)}`);
}

/** Actualizar configuración del salón */
export function updateConfig(sheetId, servicios) {
  return fetchAPI('config', {
    method: 'POST',
    body: { sheet_id: sheetId, servicios },
  });
}

/** Obtener citas de hoy */
export function getCitas(sheetId, fecha) {
  return fetchAPI(`citas?sheet_id=${encodeURIComponent(sheetId)}&fecha=${fecha}`);
}

/** Registrar nueva cita */
export function createCita(sheetId, cita) {
  return fetchAPI('citas', {
    method: 'POST',
    body: { sheet_id: sheetId, ...cita },
  });
}

/** Obtener gastos de hoy */
export function getGastos(sheetId, fecha) {
  return fetchAPI(`gastos?sheet_id=${encodeURIComponent(sheetId)}&fecha=${fecha}`);
}

/** Registrar nuevo gasto */
export function createGasto(sheetId, gasto) {
  return fetchAPI('gastos', {
    method: 'POST',
    body: { sheet_id: sheetId, ...gasto },
  });
}
