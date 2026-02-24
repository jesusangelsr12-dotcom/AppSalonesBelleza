/**
 * Flujo Registrar Cita (5 pasos)
 * 1. Nombre de clienta
 * 2. Servicio
 * 3. Costo
 * 4. Método de pago
 * 5. Confirmación
 */

import { createCita } from '../api.js';
import { formatMXN, todayISO, nowTimestamp, showToast, showLoader, hideLoader } from '../utils.js';
import { navigateTo } from '../app.js';

let session = null;
let step = 1;
let cita = { clienta: '', servicio: '', costo: '', metodo_pago: '' };

export function render(s) {
  session = s;
  return `
    <div class="screen" id="cita-screen">
      <header class="screen-header">
        <button class="header-back" id="cita-back">← Atrás</button>
        <h2 class="screen-title">Registrar Cita</h2>
      </header>

      <div class="step-indicator" id="step-indicator">
        <div class="step-dot active"></div>
        <div class="step-dot"></div>
        <div class="step-dot"></div>
        <div class="step-dot"></div>
        <div class="step-dot"></div>
      </div>

      <div id="cita-step-content"></div>
    </div>
  `;
}

export function init(s) {
  session = s;
  step = 1;
  cita = { clienta: '', servicio: '', costo: '', metodo_pago: '' };

  document.getElementById('cita-back').addEventListener('click', handleBack);
  renderStep();
}

function handleBack() {
  if (step > 1) {
    step--;
    renderStep();
  } else {
    navigateTo('home');
  }
}

function updateStepIndicator() {
  const dots = document.querySelectorAll('#step-indicator .step-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i < step);
  });
}

function renderStep() {
  updateStepIndicator();
  const container = document.getElementById('cita-step-content');

  switch (step) {
    case 1: renderStep1(container); break;
    case 2: renderStep2(container); break;
    case 3: renderStep3(container); break;
    case 4: renderStep4(container); break;
    case 5: renderStep5(container); break;
  }
}

// Paso 1: Nombre de clienta
function renderStep1(el) {
  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Nombre de la clienta</label>
      <input type="text" class="input" id="input-clienta" placeholder="Ej: María López"
        value="${cita.clienta}" autocomplete="off">
      <button class="btn btn-primary mt-24" id="btn-step1">Siguiente</button>
    </div>
  `;

  const input = document.getElementById('input-clienta');
  const btn = document.getElementById('btn-step1');

  const advance = () => {
    const val = input.value.trim();
    if (!val) { showToast('Ingresa el nombre de la clienta', 'error'); return; }
    cita.clienta = val;
    step = 2;
    renderStep();
  };

  btn.addEventListener('click', advance);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') advance(); });
  input.focus();
}

// Paso 2: Servicio
function renderStep2(el) {
  const servicios = session?.servicios || [];

  if (servicios.length === 0) {
    el.innerHTML = `
      <div class="step-content">
        <div class="empty-state">
          <div class="empty-state-emoji">⚙️</div>
          <p class="empty-state-text">No hay servicios configurados</p>
          <button class="btn btn-outline mt-16" id="btn-go-config">Ir a Configuración</button>
        </div>
      </div>
    `;
    document.getElementById('btn-go-config').addEventListener('click', () => navigateTo('config'));
    return;
  }

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Selecciona el servicio</label>
      <div class="services-grid" id="services-grid">
        ${servicios.map((s) => `
          <button class="service-card ${cita.servicio === s ? 'selected' : ''}" data-servicio="${s}">
            <span class="service-card-name">${s}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('services-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-servicio]');
    if (!card) return;
    cita.servicio = card.dataset.servicio;
    step = 3;
    renderStep();
  });
}

// Paso 3: Costo
function renderStep3(el) {
  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Costo del servicio</label>
      <div class="amount-display">
        <span class="amount-display-currency">$</span>
        <span class="amount-display-value" id="costo-display">${cita.costo || '0'}</span>
      </div>
      <div class="keypad" id="costo-keypad">
        <button class="keypad-key" data-key="1">1</button>
        <button class="keypad-key" data-key="2">2</button>
        <button class="keypad-key" data-key="3">3</button>
        <button class="keypad-key" data-key="4">4</button>
        <button class="keypad-key" data-key="5">5</button>
        <button class="keypad-key" data-key="6">6</button>
        <button class="keypad-key" data-key="7">7</button>
        <button class="keypad-key" data-key="8">8</button>
        <button class="keypad-key" data-key="9">9</button>
        <button class="keypad-key keypad-key--delete" data-key="delete">⌫</button>
        <button class="keypad-key" data-key="0">0</button>
        <button class="keypad-key keypad-key--confirm" data-key="ok">✓</button>
      </div>
    </div>
  `;

  document.getElementById('costo-keypad').addEventListener('click', (e) => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    const k = key.dataset.key;

    if (k === 'delete') {
      cita.costo = cita.costo.slice(0, -1);
    } else if (k === 'ok') {
      if (!cita.costo || cita.costo === '0') {
        showToast('Ingresa el costo', 'error');
        return;
      }
      step = 4;
      renderStep();
      return;
    } else {
      if (cita.costo === '0') cita.costo = '';
      if (cita.costo.length < 7) cita.costo += k;
    }

    document.getElementById('costo-display').textContent = cita.costo || '0';
  });
}

// Paso 4: Método de pago
function renderStep4(el) {
  const metodos = [
    { id: 'Efectivo', emoji: '💵', label: 'Efectivo' },
    { id: 'Tarjeta', emoji: '💳', label: 'Tarjeta' },
    { id: 'Transferencia', emoji: '📱', label: 'Transferencia' },
  ];

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Método de pago</label>
      <div class="payment-grid">
        ${metodos.map((m) => `
          <button class="payment-card ${cita.metodo_pago === m.id ? 'selected' : ''}" data-metodo="${m.id}">
            <span class="payment-card-emoji">${m.emoji}</span>
            <span class="payment-card-label">${m.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  el.querySelector('.payment-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-metodo]');
    if (!card) return;
    cita.metodo_pago = card.dataset.metodo;
    step = 5;
    renderStep();
  });
}

// Paso 5: Confirmación
function renderStep5(el) {
  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Confirma los datos</label>
      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">Clienta</span>
          <span class="summary-value">${cita.clienta}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Servicio</span>
          <span class="summary-value">${cita.servicio}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Costo</span>
          <span class="summary-value">${formatMXN(parseFloat(cita.costo))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Pago</span>
          <span class="summary-value">${cita.metodo_pago}</span>
        </div>
      </div>
      <button class="btn btn-primary mt-24" id="btn-confirmar">Confirmar y Registrar</button>
    </div>
  `;

  document.getElementById('btn-confirmar').addEventListener('click', submitCita);
}

async function submitCita() {
  try {
    showLoader();
    await createCita(session.sheet_id, {
      fecha: todayISO(),
      timestamp: nowTimestamp(),
      clienta: cita.clienta,
      servicio: cita.servicio,
      costo: parseFloat(cita.costo),
      metodo_pago: cita.metodo_pago,
    });
    hideLoader();
    showToast('Cita registrada correctamente', 'success');
    navigateTo('home');
  } catch (error) {
    hideLoader();
    showToast('Error al registrar la cita', 'error');
  }
}
