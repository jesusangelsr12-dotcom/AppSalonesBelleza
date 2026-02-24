/**
 * Pantalla Home
 * Header con nombre del salón + 3 botones de acción + cerrar sesión
 */

import { logout } from '../auth.js';
import { navigateTo } from '../app.js';

export function render(session) {
  const nombre = session?.salon_nombre || 'Mi Salón';

  return `
    <div class="screen">
      <header class="home-header">
        <div>
          <h1 class="home-salon-name">${nombre}</h1>
          <p class="home-subtitle">¿Qué deseas hacer?</p>
        </div>
      </header>

      <div class="home-actions">
        <button class="home-action-card" id="btn-cita">
          <span class="home-action-emoji">💇</span>
          <span class="home-action-label">Registrar Cita</span>
        </button>

        <button class="home-action-card" id="btn-gasto">
          <span class="home-action-emoji">💸</span>
          <span class="home-action-label">Registrar Gasto</span>
        </button>

        <button class="home-action-card" id="btn-registros">
          <span class="home-action-emoji">📋</span>
          <span class="home-action-label">Ver Registros de Hoy</span>
        </button>
      </div>

      <div class="home-footer">
        <button class="home-action-card home-action-card--sm" id="btn-config">
          <span class="home-action-emoji">⚙️</span>
          <span class="home-action-label">Agregar Servicios</span>
        </button>

        <button class="btn-logout" id="btn-logout">
          Cerrar sesión
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
