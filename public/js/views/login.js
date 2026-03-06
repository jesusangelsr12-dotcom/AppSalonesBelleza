/**
 * Pantalla de Login
 * Una sola pantalla: logo JR + PIN de 6 dígitos + teclado numérico
 * El backend determina automáticamente a qué salón pertenece el PIN.
 */

import { login as apiLogin } from '../api.js';
import { hashPin, showToast, showLoader, hideLoader } from '../utils.js';
import { saveSession } from '../auth.js';
import { navigateTo } from '../app.js';

let pin = '';

export function render() {
  return `
    <div class="screen screen-centered" id="login-screen">
      <div class="login-container">
        <div class="text-center mb-24">
          <div class="login-logo">✂️</div>
          <h1 class="mt-16">Iniciar sesión a mi Salón</h1>
        </div>

        <p class="text-center mb-16" style="color: var(--color-gray-500); font-size: 0.9rem">
          Ingresa tu PIN de 6 dígitos
        </p>

        <div class="pin-dots" id="pin-dots">
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
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

  // Teclado numérico (event delegation)
  document.getElementById('pin-keypad').addEventListener('click', (e) => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    handleKeyPress(key.dataset.key);
  });
}

function handleKeyPress(key) {
  document.getElementById('pin-error').classList.add('hidden');

  if (key === 'delete') {
    pin = pin.slice(0, -1);
    updatePinDots();
    return;
  }

  if (pin.length >= 6) return;

  pin += key;
  updatePinDots();

  // Auto-submit al completar 6 dígitos
  if (pin.length === 6) {
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
  const keypad = document.getElementById('pin-keypad');
  keypad.style.pointerEvents = 'none';

  try {
    showLoader();
    const pinHash = await hashPin(pin);
    const result = await apiLogin(pinHash);

    // Guardar sesión y navegar a home
    saveSession({
      salon_id: result.salon_id,
      salon_nombre: result.salon_nombre,
      sheet_id: result.sheet_id,
      logo_url: result.logo_url,
      servicios: result.servicios,
      productos: result.productos,
      trabajadoras: result.trabajadoras,
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
