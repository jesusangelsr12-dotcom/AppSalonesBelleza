/**
 * Manejo de sesión — PIN auth con expiración de 8 horas
 */

const SESSION_KEY = 'jr_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas en ms

/**
 * Guarda la sesión en localStorage.
 * @param {object} salonData - { salon_id, salon_nombre, sheet_id, logo_url, servicios }
 */
export function saveSession(salonData) {
  const session = {
    ...salonData,
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Obtiene la sesión actual o null si expiró / no existe */
export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expires_at) {
      logout();
      return null;
    }
    return session;
  } catch {
    logout();
    return null;
  }
}

/** Verifica si hay sesión válida */
export function isAuthenticated() {
  return getSession() !== null;
}

/** Cierra sesión */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
