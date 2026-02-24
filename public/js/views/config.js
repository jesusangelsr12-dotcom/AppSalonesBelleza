/**
 * Pantalla Configuración
 * Editar catálogo de servicios y productos del salón
 */

import { updateConfig } from '../api.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { getSession, saveSession } from '../auth.js';
import { navigateTo } from '../app.js';

let session = null;
let servicios = [];
let productos = [];

export function render(s) {
  session = s;
  return `
    <div class="screen" id="config-screen">
      <header class="screen-header">
        <button class="header-back" id="config-back">\u2190 Atr\u00e1s</button>
        <h2 class="screen-title">Configuraci\u00f3n</h2>
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
  productos = [...(session?.productos || [])];

  document.getElementById('config-back').addEventListener('click', () => navigateTo('home'));
  renderConfig();
}

function renderConfig() {
  const content = document.getElementById('config-content');

  content.innerHTML = `
    <div class="step-content">
      <!-- Secci\u00f3n Servicios -->
      <label class="input-label">Servicios del sal\u00f3n</label>

      <div id="servicios-list" class="gap-12">
        ${servicios.length === 0 ? `
          <p class="text-center" style="color: var(--color-gray-400); padding: 16px 0; font-size: 0.9rem">
            No hay servicios. Agrega uno abajo.
          </p>
        ` : servicios.map((s, i) => `
          <div class="config-service-item">
            <span class="config-service-name">${s}</span>
            <button class="config-service-delete" data-type="servicio" data-index="${i}">\u2715</button>
          </div>
        `).join('')}
      </div>

      <div class="config-add-row mt-16">
        <input type="text" class="input config-add-input" id="input-new-service"
          placeholder="Nuevo servicio" autocomplete="off">
        <button class="btn btn-gold config-add-btn" id="btn-add-service">Agregar</button>
      </div>

      <!-- Secci\u00f3n Productos -->
      <label class="input-label mt-32">Productos a la venta</label>

      <div id="productos-list" class="gap-12">
        ${productos.length === 0 ? `
          <p class="text-center" style="color: var(--color-gray-400); padding: 16px 0; font-size: 0.9rem">
            No hay productos. Agrega uno abajo.
          </p>
        ` : productos.map((p, i) => `
          <div class="config-service-item">
            <span class="config-service-name">${p}</span>
            <button class="config-service-delete" data-type="producto" data-index="${i}">\u2715</button>
          </div>
        `).join('')}
      </div>

      <div class="config-add-row mt-16">
        <input type="text" class="input config-add-input" id="input-new-product"
          placeholder="Nuevo producto" autocomplete="off">
        <button class="btn btn-gold config-add-btn" id="btn-add-product">Agregar</button>
      </div>

      <button class="btn btn-primary mt-24" id="btn-save-config">Guardar Cambios</button>
    </div>
  `;

  // Eliminar servicio o producto
  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn || !btn.classList.contains('config-service-delete')) return;
    const type = btn.dataset.type;
    const index = parseInt(btn.dataset.index, 10);
    if (type === 'servicio') {
      servicios.splice(index, 1);
    } else {
      productos.splice(index, 1);
    }
    renderConfig();
  });

  // Agregar servicio
  const inputService = document.getElementById('input-new-service');
  const btnAddService = document.getElementById('btn-add-service');

  const addService = () => {
    const val = inputService.value.trim();
    if (!val) return;
    if (servicios.includes(val)) {
      showToast('Ese servicio ya existe', 'error');
      return;
    }
    servicios.push(val);
    renderConfig();
  };

  btnAddService.addEventListener('click', addService);
  inputService.addEventListener('keydown', (e) => { if (e.key === 'Enter') addService(); });

  // Agregar producto
  const inputProduct = document.getElementById('input-new-product');
  const btnAddProduct = document.getElementById('btn-add-product');

  const addProduct = () => {
    const val = inputProduct.value.trim();
    if (!val) return;
    if (productos.includes(val)) {
      showToast('Ese producto ya existe', 'error');
      return;
    }
    productos.push(val);
    renderConfig();
  };

  btnAddProduct.addEventListener('click', addProduct);
  inputProduct.addEventListener('keydown', (e) => { if (e.key === 'Enter') addProduct(); });

  // Guardar
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);
}

async function saveConfig() {
  try {
    showLoader();
    await updateConfig(session.sheet_id, servicios, productos);

    // Actualizar la sesi\u00f3n local
    const currentSession = getSession();
    if (currentSession) {
      currentSession.servicios = servicios;
      currentSession.productos = productos;
      saveSession(currentSession);
    }

    hideLoader();
    showToast('Configuraci\u00f3n guardada', 'success');
    navigateTo('home');
  } catch (error) {
    hideLoader();
    showToast('Error al guardar configuraci\u00f3n', 'error');
  }
}
