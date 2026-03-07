/**
 * Pantalla Home
 * Header con saludo + nombre del sal\u00f3n + acciones principales
 */

import { logout } from '../auth.js';
import { navigateTo } from '../app.js';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos d\u00edas';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function render(session) {
  const nombre = session?.salon_nombre || 'Mi Sal\u00f3n';

  return `
    <div class="screen">
      <header class="home-header">
        <p class="home-greeting">${getGreeting()}</p>
        <h1 class="home-salon-name">${nombre}</h1>
      </header>

      <div class="home-actions">
        <button class="home-action-card" id="btn-cita">
          <div class="home-action-icon home-action-icon--primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="home-action-text">
            <span class="home-action-label">Registrar Cita</span>
            <span class="home-action-desc">Servicios y productos</span>
          </div>
        </button>

        <button class="home-action-card" id="btn-gasto">
          <div class="home-action-icon home-action-icon--warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="home-action-text">
            <span class="home-action-label">Registrar Gasto</span>
            <span class="home-action-desc">Gastos operativos</span>
          </div>
        </button>

        <button class="home-action-card" id="btn-registros">
          <div class="home-action-icon home-action-icon--success">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="home-action-text">
            <span class="home-action-label">Ver Registros de Hoy</span>
            <span class="home-action-desc">Ingresos y gastos del d\u00eda</span>
          </div>
        </button>
      </div>

      <div class="home-footer">
        <button class="home-action-card home-action-card--sm" id="btn-config">
          <div class="home-action-icon home-action-icon--muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <span class="home-action-label">Configuraci\u00f3n</span>
        </button>

        <button class="btn-logout" id="btn-logout">
          Cerrar sesi\u00f3n
        </button>
      </div>
    </div>
  `;
}

export function init() {
  document.getElementById('btn-cita').addEventListener('click', () => navigateTo('cita'));
  document.getElementById('btn-gasto').addEventListener('click', () => navigateTo('gasto'));
  document.getElementById('btn-registros').addEventListener('click', () => navigateTo('registros'));
  document.getElementById('btn-config').addEventListener('click', () => navigateTo('config'));

  document.getElementById('btn-logout').addEventListener('click', () => {
    logout();
    navigateTo('login');
  });
}
