/**
 * Pantalla Home
 * Header con saludo + nombre del salón + resumen del día + acciones principales
 */

import { logout } from '../auth.js';
import { navigateTo } from '../app.js';
import { getCitas, getGastos } from '../api.js';
import { todayISO, formatMXN } from '../utils.js';

let session = null;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function render(s) {
  session = s;
  const nombre = session?.salon_nombre || 'Mi Salón';

  return `
    <div class="screen">
      <header class="home-header">
        <p class="home-greeting">${getGreeting()}</p>
        <h1 class="home-salon-name">${nombre}</h1>
      </header>

      <div class="home-summary" id="home-summary">
        <span class="home-summary-loading">Cargando resumen...</span>
      </div>

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
            <span class="home-action-label">Ver Registros</span>
            <span class="home-action-desc">Ingresos y gastos</span>
          </div>
        </button>

        <button class="home-action-card" id="btn-comisiones">
          <div class="home-action-icon home-action-icon--gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
          <div class="home-action-text">
            <span class="home-action-label">Comisiones</span>
            <span class="home-action-desc">Reporte por trabajadora</span>
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
          <span class="home-action-label">Configuración</span>
        </button>

        <button class="btn-logout" id="btn-logout">
          Cerrar sesión
        </button>
      </div>
    </div>
  `;
}

export function init(s) {
  session = s;

  document.getElementById('btn-cita').addEventListener('click', () => navigateTo('cita'));
  document.getElementById('btn-gasto').addEventListener('click', () => navigateTo('gasto'));
  document.getElementById('btn-registros').addEventListener('click', () => navigateTo('registros'));
  document.getElementById('btn-comisiones').addEventListener('click', () => navigateTo('comisiones'));
  document.getElementById('btn-config').addEventListener('click', () => navigateTo('config'));

  document.getElementById('btn-logout').addEventListener('click', () => {
    logout();
    navigateTo('login');
  });

  // Cargar resumen del día (non-blocking)
  loadDailySummary();
}

async function loadDailySummary() {
  const summaryEl = document.getElementById('home-summary');
  if (!session?.sheet_id) {
    summaryEl.style.display = 'none';
    return;
  }

  try {
    const fecha = todayISO();
    const [citasRes, gastosRes] = await Promise.all([
      getCitas(session.sheet_id, fecha),
      getGastos(session.sheet_id, fecha),
    ]);

    const citas = citasRes.citas || [];
    const gastos = gastosRes.gastos || [];
    const totalIngresos = citas.reduce((sum, c) => sum + c.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    summaryEl.innerHTML = `
      <div class="home-summary-item">
        <span class="home-summary-value home-summary-value--income">${formatMXN(totalIngresos)}</span>
        <span class="home-summary-label">ingresos</span>
      </div>
      <div class="home-summary-divider"></div>
      <div class="home-summary-item">
        <span class="home-summary-value">${citas.length}</span>
        <span class="home-summary-label">citas</span>
      </div>
      <div class="home-summary-divider"></div>
      <div class="home-summary-item">
        <span class="home-summary-value home-summary-value--expense">${formatMXN(totalGastos)}</span>
        <span class="home-summary-label">gastos</span>
      </div>
    `;
  } catch {
    summaryEl.style.display = 'none';
  }
}
