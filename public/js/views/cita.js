/**
 * Flujo Registrar Cita (6 pasos)
 * 1. Nombre de clienta
 * 2. Seleccionar servicios (multi-selección)
 * 3. Seleccionar productos (multi-selección, puede omitir)
 * 4. Poner precio a cada item seleccionado (uno por uno)
 * 5. Método de pago
 * 6. Confirmación con desglose y total
 */

import { createCita } from '../api.js';
import { formatMXN, todayISO, nowTimestamp, showToast, showLoader, hideLoader } from '../utils.js';
import { navigateTo } from '../app.js';

let session = null;
let step = 1;

// Estado de la cita
let cita = {
  clienta: '',
  selectedServicios: [],   // nombres seleccionados
  selectedProductos: [],    // nombres seleccionados
  items: [],                // [{tipo, nombre, costo}] ya con precios
  metodo_pago: '',
};

// Para el paso 4: pricing item por item
let pricingItems = [];    // lista de {tipo, nombre} a ponerle precio
let pricingIndex = 0;     // cuál estamos editando
let currentCosto = '';    // string del teclado numérico

const TOTAL_STEPS = 6;

export function render(s) {
  session = s;
  return `
    <div class="screen" id="cita-screen">
      <header class="screen-header">
        <button class="header-back" id="cita-back">\u2190 Atr\u00e1s</button>
        <h2 class="screen-title">Registrar Cita</h2>
      </header>

      <div class="step-indicator" id="step-indicator">
        ${Array.from({ length: TOTAL_STEPS }, () => '<div class="step-dot"></div>').join('')}
      </div>

      <div id="cita-step-content"></div>
    </div>
  `;
}

export function init(s) {
  session = s;
  step = 1;
  cita = {
    clienta: '',
    selectedServicios: [],
    selectedProductos: [],
    items: [],
    metodo_pago: '',
  };
  pricingItems = [];
  pricingIndex = 0;
  currentCosto = '';

  document.getElementById('cita-back').addEventListener('click', handleBack);
  renderStep();
}

function handleBack() {
  if (step === 4 && pricingIndex > 0) {
    // Retroceder al item anterior en pricing
    pricingIndex--;
    currentCosto = String(pricingItems[pricingIndex].costo || '');
    renderStep();
  } else if (step > 1) {
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
    case 6: renderStep6(container); break;
  }
}

// Paso 1: Nombre de clienta
function renderStep1(el) {
  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Nombre de la clienta</label>
      <input type="text" class="input" id="input-clienta" placeholder="Ej: Mar\u00eda L\u00f3pez"
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

// Paso 2: Servicios (multi-selección)
function renderStep2(el) {
  const servicios = session?.servicios || [];

  if (servicios.length === 0) {
    el.innerHTML = `
      <div class="step-content">
        <div class="empty-state">
          <div class="empty-state-emoji">\u2699\ufe0f</div>
          <p class="empty-state-text">No hay servicios configurados</p>
          <button class="btn btn-outline mt-16" id="btn-go-config">Ir a Configuraci\u00f3n</button>
        </div>
      </div>
    `;
    document.getElementById('btn-go-config').addEventListener('click', () => navigateTo('config'));
    return;
  }

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Selecciona los servicios</label>
      <p class="multi-select-hint">Puedes elegir m\u00e1s de uno</p>
      <div class="services-grid" id="services-grid">
        ${servicios.map((s) => `
          <button class="service-card ${cita.selectedServicios.includes(s) ? 'selected' : ''}" data-servicio="${s}">
            <span class="service-card-name">${s}</span>
            ${cita.selectedServicios.includes(s) ? '<span class="service-card-check">\u2713</span>' : ''}
          </button>
        `).join('')}
      </div>
      <button class="btn btn-primary mt-24" id="btn-step2"
        ${cita.selectedServicios.length === 0 ? 'disabled style="opacity:0.5"' : ''}>
        Siguiente (${cita.selectedServicios.length} seleccionado${cita.selectedServicios.length !== 1 ? 's' : ''})
      </button>
    </div>
  `;

  document.getElementById('services-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-servicio]');
    if (!card) return;
    const name = card.dataset.servicio;
    const idx = cita.selectedServicios.indexOf(name);
    if (idx >= 0) {
      cita.selectedServicios.splice(idx, 1);
    } else {
      cita.selectedServicios.push(name);
    }
    renderStep2(el);
  });

  document.getElementById('btn-step2').addEventListener('click', () => {
    if (cita.selectedServicios.length === 0) {
      showToast('Selecciona al menos un servicio', 'error');
      return;
    }
    step = 3;
    renderStep();
  });
}

// Paso 3: Productos (multi-selección, puede omitir)
function renderStep3(el) {
  const productosDisp = session?.productos || [];

  if (productosDisp.length === 0) {
    // No hay productos configurados, saltar
    cita.selectedProductos = [];
    preparePricing();
    step = 4;
    renderStep();
    return;
  }

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Productos vendidos</label>
      <p class="multi-select-hint">Selecciona si la clienta compr\u00f3 productos</p>
      <div class="services-grid" id="products-grid">
        ${productosDisp.map((p) => `
          <button class="service-card ${cita.selectedProductos.includes(p) ? 'selected' : ''}" data-producto="${p}">
            <span class="service-card-name">${p}</span>
            ${cita.selectedProductos.includes(p) ? '<span class="service-card-check">\u2713</span>' : ''}
          </button>
        `).join('')}
      </div>
      <div class="step-actions mt-24">
        <button class="btn btn-outline" id="btn-skip-products">Sin productos</button>
        <button class="btn btn-primary" id="btn-step3"
          ${cita.selectedProductos.length === 0 ? 'disabled style="opacity:0.5"' : ''}>
          Siguiente (${cita.selectedProductos.length})
        </button>
      </div>
    </div>
  `;

  document.getElementById('products-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-producto]');
    if (!card) return;
    const name = card.dataset.producto;
    const idx = cita.selectedProductos.indexOf(name);
    if (idx >= 0) {
      cita.selectedProductos.splice(idx, 1);
    } else {
      cita.selectedProductos.push(name);
    }
    renderStep3(el);
  });

  document.getElementById('btn-skip-products').addEventListener('click', () => {
    cita.selectedProductos = [];
    preparePricing();
    step = 4;
    renderStep();
  });

  document.getElementById('btn-step3').addEventListener('click', () => {
    if (cita.selectedProductos.length === 0) {
      showToast('Selecciona al menos un producto o toca "Sin productos"', 'error');
      return;
    }
    preparePricing();
    step = 4;
    renderStep();
  });
}

// Preparar lista de items para pricing
function preparePricing() {
  pricingItems = [
    ...cita.selectedServicios.map((name) => ({ tipo: 'servicio', nombre: name, costo: '' })),
    ...cita.selectedProductos.map((name) => ({ tipo: 'producto', nombre: name, costo: '' })),
  ];
  pricingIndex = 0;
  currentCosto = '';
}

// Paso 4: Precio de cada item (uno por uno)
function renderStep4(el) {
  const item = pricingItems[pricingIndex];
  const totalItems = pricingItems.length;
  const isServicio = item.tipo === 'servicio';
  const tipoLabel = isServicio ? 'Servicio' : 'Producto';

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">
        Costo de ${tipoLabel.toLowerCase()} (${pricingIndex + 1} de ${totalItems})
      </label>
      <div class="pricing-item-name">${item.nombre}</div>
      <div class="pricing-item-badge pricing-item-badge--${item.tipo}">${tipoLabel}</div>
      <div class="amount-display">
        <span class="amount-display-currency">$</span>
        <span class="amount-display-value" id="costo-display">${currentCosto || '0'}</span>
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
        <button class="keypad-key keypad-key--delete" data-key="delete">\u232b</button>
        <button class="keypad-key" data-key="0">0</button>
        <button class="keypad-key keypad-key--confirm" data-key="ok">\u2713</button>
      </div>
    </div>
  `;

  document.getElementById('costo-keypad').addEventListener('click', (e) => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    const k = key.dataset.key;

    if (k === 'delete') {
      currentCosto = currentCosto.slice(0, -1);
    } else if (k === 'ok') {
      if (!currentCosto || currentCosto === '0') {
        showToast('Ingresa el costo', 'error');
        return;
      }
      // Guardar precio del item actual
      pricingItems[pricingIndex].costo = currentCosto;

      if (pricingIndex < pricingItems.length - 1) {
        // Ir al siguiente item
        pricingIndex++;
        currentCosto = pricingItems[pricingIndex].costo || '';
        renderStep();
      } else {
        // Todos los items tienen precio, avanzar
        cita.items = pricingItems.map((it) => ({
          tipo: it.tipo,
          nombre: it.nombre,
          costo: parseFloat(it.costo),
        }));
        step = 5;
        renderStep();
      }
      return;
    } else {
      if (currentCosto === '0') currentCosto = '';
      if (currentCosto.length < 7) currentCosto += k;
    }

    document.getElementById('costo-display').textContent = currentCosto || '0';
  });
}

// Paso 5: Método de pago
function renderStep5(el) {
  const metodos = [
    { id: 'Efectivo', emoji: '\ud83d\udcb5', label: 'Efectivo' },
    { id: 'Tarjeta', emoji: '\ud83d\udcb3', label: 'Tarjeta' },
    { id: 'Transferencia', emoji: '\ud83d\udcf1', label: 'Transferencia' },
  ];

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">M\u00e9todo de pago</label>
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
    step = 6;
    renderStep();
  });
}

// Paso 6: Confirmación con desglose
function renderStep6(el) {
  const total = cita.items.reduce((sum, it) => sum + it.costo, 0);
  const serviciosItems = cita.items.filter((it) => it.tipo === 'servicio');
  const productosItems = cita.items.filter((it) => it.tipo === 'producto');

  el.innerHTML = `
    <div class="step-content">
      <label class="input-label">Confirma los datos</label>
      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">Clienta</span>
          <span class="summary-value">${cita.clienta}</span>
        </div>

        ${serviciosItems.length > 0 ? `
          <div class="summary-section-title">Servicios</div>
          ${serviciosItems.map((it) => `
            <div class="summary-row summary-row--item">
              <span class="summary-label">${it.nombre}</span>
              <span class="summary-value">${formatMXN(it.costo)}</span>
            </div>
          `).join('')}
        ` : ''}

        ${productosItems.length > 0 ? `
          <div class="summary-section-title">Productos</div>
          ${productosItems.map((it) => `
            <div class="summary-row summary-row--item">
              <span class="summary-label">${it.nombre}</span>
              <span class="summary-value">${formatMXN(it.costo)}</span>
            </div>
          `).join('')}
        ` : ''}

        <div class="summary-row summary-row--total">
          <span class="summary-label">Total</span>
          <span class="summary-value summary-value--total">${formatMXN(total)}</span>
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
    const total = cita.items.reduce((sum, it) => sum + it.costo, 0);

    await createCita(session.sheet_id, {
      fecha: todayISO(),
      timestamp: nowTimestamp(),
      clienta: cita.clienta,
      items: cita.items,
      total,
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
