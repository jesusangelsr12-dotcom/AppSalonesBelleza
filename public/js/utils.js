/**
 * Utilidades compartidas
 */

/**
 * Escapa texto para poder inyectarlo en HTML sin romper el markup.
 * Importante para las notas y los nombres, que son texto libre: un `<`, una
 * comilla o un `</textarea>` dentro del texto rompería la página.
 */
export function escapeHTML(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Clave para identificar a una clienta (el nombre es texto libre).
 * "María", "maria" y "MARIA " son la misma persona.
 * OJO: duplicada en api/clientas.js (el back es CommonJS y el front ESM).
 * Si cambia una, cambiar la otra.
 */
export function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Hashea un PIN de 4 dígitos usando SHA-256 (Web Crypto API) */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Formatea un número como moneda MXN: $1,500.00 */
export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD */
export function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Devuelve la fecha de hoy formateada para mostrar: "24 de febrero de 2026" */
export function todayFormatted() {
  return new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Devuelve timestamp actual: "14:30:05" */
export function nowTimestamp() {
  return new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Muestra un toast de notificación */
export function showToast(message, type = 'default', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  if (type !== 'default') {
    toast.classList.add(`toast-${type}`);
  }
  setTimeout(() => toast.classList.add('hidden'), duration);
}

/** Muestra/oculta el loader global */
export function showLoader() {
  document.getElementById('loader').classList.remove('hidden');
}

export function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}
