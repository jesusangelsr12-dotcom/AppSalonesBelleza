/**
 * Pantalla de Login
 * Fase 1: Selección de salón (tarjetas)
 * Fase 2: Ingreso de PIN (4 dots + teclado numérico)
 */

import { getSalones, login as apiLogin } from '../api.js';
import { hashPin, showToast, showLoader, hideLoader } from '../utils.js';
import { saveSession } from '../auth.js';
import { navigateTo } from '../app.js';

let salones = [];
let selectedSalon = null;
let pin = '';

export function render() {
  return `
    <div class="screen screen-centered" id="login-screen">
      <!-- Fase 1: Selección de salón -->
      <div id="login-phase-1">
        <div class="text-center mb-24">
          <div class="login-logo">JR</div>
          <h1 class="mt-16">JR Consulting</h1>
          <p class="mt-8" style="color: var(--color-gray-500)">Administración de Salones</p>
        </div>

        <p class="text-center mb-16" style="font-weight: 600">Selecciona tu salón</p>

        <div id="salones-list" class="gap-12">
          <div class="text-center" style="color: var(--color-gray-400); padding: 20px">
            Cargando salones...
          </div>
        </div>
      </div>

      <!-- Fase 2: PIN -->
      <div id="login-phase-2" class="hidden" style="width: 100%">
        <button class="header-back" id="pin-back" style="align-self: flex-start; margin-bottom: 8px">
          ← Atrás
        </button>

        <div class="text-center mb-24">
          <div class="login-logo login-logo--sm">JR</div>
          <h2 class="mt-16" id="salon-name-display"></h2>
          <p class="mt-8" style="color: var(--color-gray-500)">Ingresa tu PIN de 4 dígitos</p>
        </div>

        <div class="pin-dots" id="pin-dots">
          <div class="pin-dot" data-index="0"></div>
          <div class="pin-dot" data-index="1"></div>
          <div class="pin-dot" data-index="2"></div>
          <div class="pin-dot" data-index="3"></div>
        </div>

        <div id="pin-error" class="text-center hidden" style="color: var(--color-error); font-size: 0.85rem; margin-bottom: 16px">
          PIN incorrecto. Intenta de nuevo.
        </div>

        <div class="keypad" id="pin-keypad">
          <button class="keypad-key" data-key="1">1</button>
          <button class="keypad-key" data-key="2">2</button>
          <button class="keypad-key" data-key="3">3</button>
          <button class="keypad-key" data-key="4">4</button>
          <button class="keypad-key" data-key="5">5</button>
          <button class="keypad-key" data-key="6">6</button>
          <button class="keypad-key" data-key="7">7</button>
          <button class="keypad-key" data-key="8">8</button>
          <button class="keypad-key" data-key="9">9</button>
          <button class="keypad-key keypad-key--empty" disabled></button>
          <button class="keypad-key" data-key="0">0</button>
          <button class="keypad-key keypad-key--delete" data-key="delete">⌫</button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  pin = '';
  selectedSalon = null;
  loadSalones();

  // Botón de regreso desde PIN a selección de salón
  document.getElementById('pin-back').addEventListener('click', showPhase1);

  // Teclado numérico
  document.getElementById('pin-keypad').addEventListener('click', (e) => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    handleKeyPress(key.dataset.key);
  });
}

async function loadSalones() {
  try {
    const data = await getSalones();
    salones = data.salones || [];
    renderSalones();
  } catch (error) {
    document.getElementById('salones-list').innerHTML = `
      <div class="text-center" style="padding: 20px">
        <p style="color: var(--color-error); margin-bottom: 12px">No se pudieron cargar los salones</p>
        <button class="btn btn-outline" id="retry-salones" style="max-width: 200px; margin: 0 auto">
          Reintentar
        </button>
      </div>
    `;
    document.getElementById('retry-salones').addEventListener('click', loadSalones);
  }
}

function renderSalones() {
  const list = document.getElementById('salones-list');

  if (salones.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-emoji">🏪</div>
        <p class="empty-state-text">No hay salones registrados</p>
      </div>
    `;
    return;
  }

  list.innerHTML = salones.map((salon) => `
    <button class="card card-selectable salon-card" data-id="${salon.salon_id}" data-name="${salon.salon_nombre}" data-sheet="${salon.sheet_id}">
      <div style="display: flex; align-items: center; gap: 14px">
        <div class="salon-card-icon">✂️</div>
        <div>
          <div style="font-weight: 600; font-size: 1.05rem">${salon.salon_nombre}</div>
          <div style="font-size: 0.8rem; color: var(--color-gray-500); margin-top: 2px">Toca para ingresar</div>
        </div>
      </div>
    </button>
  `).join('');

  // Event listeners para cada salon card
  list.querySelectorAll('.salon-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedSalon = {
        salon_id: card.dataset.id,
        salon_nombre: card.dataset.name,
        sheet_id: card.dataset.sheet,
      };
      showPhase2();
    });
  });
}

function showPhase1() {
  pin = '';
  selectedSalon = null;
  updatePinDots();
  document.getElementById('pin-error').classList.add('hidden');
  document.getElementById('login-phase-1').classList.remove('hidden');
  document.getElementById('login-phase-2').classList.add('hidden');
}

function showPhase2() {
  pin = '';
  updatePinDots();
  document.getElementById('pin-error').classList.add('hidden');
  document.getElementById('salon-name-display').textContent = selectedSalon.salon_nombre;
  document.getElementById('login-phase-1').classList.add('hidden');
  document.getElementById('login-phase-2').classList.remove('hidden');
}

function handleKeyPress(key) {
  document.getElementById('pin-error').classList.add('hidden');

  if (key === 'delete') {
    pin = pin.slice(0, -1);
    updatePinDots();
    return;
  }

  if (pin.length >= 4) return;

  pin += key;
  updatePinDots();

  // Auto-submit al completar 4 dígitos
  if (pin.length === 4) {
    validatePin();
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('filled', 'error');
    if (i < pin.length) {
      dot.classList.add('filled');
    }
  });
}

function showPinError() {
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  dots.forEach((dot) => dot.classList.add('error'));
  document.getElementById('pin-error').classList.remove('hidden');

  setTimeout(() => {
    pin = '';
    updatePinDots();
  }, 600);
}

async function validatePin() {
  // Deshabilitar teclado mientras valida
  const keypad = document.getElementById('pin-keypad');
  keypad.style.pointerEvents = 'none';

  try {
    showLoader();
    const pinHash = await hashPin(pin);
    const result = await apiLogin(selectedSalon.salon_id, pinHash);

    // Guardar sesión y navegar a home
    saveSession({
      salon_id: result.salon_id,
      salon_nombre: result.salon_nombre,
      sheet_id: result.sheet_id,
      logo_url: result.logo_url,
      servicios: result.servicios,
    });

    hideLoader();
    navigateTo('home');
  } catch (error) {
    hideLoader();
    if (error.message.includes('incorrecto')) {
      showPinError();
    } else {
      showToast('Error de conexión. Intenta de nuevo.', 'error');
      pin = '';
      updatePinDots();
    }
  } finally {
    keypad.style.pointerEvents = '';
  }
}
