/**
 * Pantalla Configuración
 * Editar catálogo de servicios del salón
 */

import { updateConfig } from '../api.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { getSession, saveSession } from '../auth.js';
import { navigateTo } from '../app.js';

let session = null;
let servicios = [];

export function render(s) {
  session = s;
  return `
    <div class="screen" id="config-screen">
      <header class="screen-header">
        <button class="header-back" id="config-back">← Atrás</button>
        <h2 class="screen-title">Configuración</h2>
      </header>

      <div id="config-content">
        <div class="text-center" style="color: var(--color-gray-400); padding: 40px 0">
          Cargando...
        </div>
      </div>
    </div>
  `;
}

export function init(s) {
  session = s;
  servicios = [...(session?.servicios || [])];

  document.getElementById('config-back').addEventListener('click', () => navigateTo('home'));
  renderConfig();
}

function renderConfig() {
  const content = document.getElementById('config-content');

  content.innerHTML = `
    <div class="step-content">
      <label class="input-label">Servicios del salón</label>

      <div id="servicios-list" class="gap-12">
        ${servicios.length === 0 ? `
          <p class="text-center" style="color: var(--color-gray-400); padding: 16px 0; font-size: 0.9rem">
            No hay servicios. Agrega uno abajo.
          </p>
        ` : servicios.map((s, i) => `
          <div class="config-service-item">
            <span class="config-service-name">${s}</span>
            <button class="config-service-delete" data-index="${i}">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="config-add-row mt-16">
        <input type="text" class="input config-add-input" id="input-new-service"
          placeholder="Nuevo servicio" autocomplete="off">
        <button class="btn btn-gold config-add-btn" id="btn-add-service">Agregar</button>
      </div>

      <button class="btn btn-primary mt-24" id="btn-save-config">Guardar Cambios</button>
    </div>
  `;

  // Eliminar servicio
  document.getElementById('servicios-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-index]');
    if (!btn) return;
    servicios.splice(parseInt(btn.dataset.index), 1);
    renderConfig();
  });

  // Agregar servicio
  const input = document.getElementById('input-new-service');
  const btnAdd = document.getElementById('btn-add-service');

  const addService = () => {
    const val = input.value.trim();
    if (!val) return;
    if (servicios.includes(val)) {
      showToast('Ese servicio ya existe', 'error');
      return;
    }
    servicios.push(val);
    renderConfig();
  };

  btnAdd.addEventListener('click', addService);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addService(); });

  // Guardar
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);
}

async function saveConfig() {
  try {
    showLoader();
    await updateConfig(session.sheet_id, servicios);

    // Actualizar la sesión local con los servicios nuevos
    const currentSession = getSession();
    if (currentSession) {
      currentSession.servicios = servicios;
      saveSession(currentSession);
    }

    hideLoader();
    showToast('Configuración guardada', 'success');
    navigateTo('home');
  } catch (error) {
    hideLoader();
    showToast('Error al guardar configuración', 'error');
  }
}
