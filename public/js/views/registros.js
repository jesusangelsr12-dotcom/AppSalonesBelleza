/**
 * Pantalla Ver Registros de Hoy
 * Muestra citas y gastos del día con totales (ingresos vs gastos)
 */

import { getCitas, getGastos } from '../api.js';
import { formatMXN, todayISO, todayFormatted, showToast, showLoader, hideLoader } from '../utils.js';
import { navigateTo } from '../app.js';

let session = null;

export function render(s) {
  session = s;
  return `
    <div class="screen" id="registros-screen">
      <header class="screen-header">
        <button class="header-back" id="registros-back">← Atrás</button>
        <h2 class="screen-title">Registros de Hoy</h2>
      </header>

      <p style="color: var(--color-gray-500); font-size: 0.85rem; margin-bottom: 16px">
        ${todayFormatted()}
      </p>

      <div class="totals-bar" id="totals-bar">
        <div class="total-card">
          <div class="total-card-label">Ingresos</div>
          <div class="total-card-value total-card-value--income" id="total-ingresos">$0.00</div>
        </div>
        <div class="total-card">
          <div class="total-card-label">Gastos</div>
          <div class="total-card-value total-card-value--expense" id="total-gastos">$0.00</div>
        </div>
      </div>

      <div id="registros-content">
        <div class="text-center" style="color: var(--color-gray-400); padding: 40px 0">
          Cargando registros...
        </div>
      </div>
    </div>
  `;
}

export function init(s) {
  session = s;
  document.getElementById('registros-back').addEventListener('click', () => navigateTo('home'));
  loadRegistros();
}

async function loadRegistros() {
  try {
    showLoader();
    const fecha = todayISO();
    const [citasRes, gastosRes] = await Promise.all([
      getCitas(session.sheet_id, fecha),
      getGastos(session.sheet_id, fecha),
    ]);
    hideLoader();

    const citas = citasRes.citas || [];
    const gastos = gastosRes.gastos || [];

    // Calcular totales
    const totalIngresos = citas.reduce((sum, c) => sum + c.costo, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    document.getElementById('total-ingresos').textContent = formatMXN(totalIngresos);
    document.getElementById('total-gastos').textContent = formatMXN(totalGastos);

    renderRegistros(citas, gastos);
  } catch (error) {
    hideLoader();
    document.getElementById('registros-content').innerHTML = `
      <div class="text-center" style="padding: 40px 0">
        <p style="color: var(--color-error); margin-bottom: 12px">Error al cargar registros</p>
        <button class="btn btn-outline" id="retry-registros" style="max-width: 200px; margin: 0 auto">
          Reintentar
        </button>
      </div>
    `;
    document.getElementById('retry-registros').addEventListener('click', loadRegistros);
  }
}

function renderRegistros(citas, gastos) {
  const content = document.getElementById('registros-content');

  if (citas.length === 0 && gastos.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-emoji">📭</div>
        <p class="empty-state-text">No hay registros para hoy</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Sección Citas
  if (citas.length > 0) {
    html += `
      <div class="records-section">
        <div class="records-section-title">Citas (${citas.length})</div>
        ${citas.map((c) => `
          <div class="record-item">
            <div class="record-info">
              <div class="record-title">${c.clienta}</div>
              <div class="record-subtitle">${c.servicio} · ${c.metodo_pago} · ${c.timestamp}</div>
            </div>
            <div class="record-amount record-amount--income">${formatMXN(c.costo)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Sección Gastos
  if (gastos.length > 0) {
    html += `
      <div class="records-section">
        <div class="records-section-title">Gastos (${gastos.length})</div>
        ${gastos.map((g) => `
          <div class="record-item">
            <div class="record-info">
              <div class="record-title">${g.descripcion}</div>
              <div class="record-subtitle">${g.metodo_pago} · ${g.timestamp}</div>
            </div>
            <div class="record-amount record-amount--expense">-${formatMXN(g.monto)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  content.innerHTML = html;
}
