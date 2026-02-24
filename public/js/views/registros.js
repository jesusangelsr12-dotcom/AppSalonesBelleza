/**
 * Pantalla Ver Registros de Hoy
 * Muestra citas y gastos del día con totales (ingresos vs gastos)
 * Permite eliminar citas y gastos individuales
 */

import { getCitas, getGastos, deleteCita, deleteGasto } from '../api.js';
import { formatMXN, todayISO, todayFormatted, showToast, showLoader, hideLoader } from '../utils.js';
import { navigateTo } from '../app.js';

let session = null;

export function render(s) {
  session = s;
  return `
    <div class="screen" id="registros-screen">
      <header class="screen-header">
        <button class="header-back" id="registros-back">\u2190 Atr\u00e1s</button>
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

    <!-- Modal de confirmación para eliminar -->
    <div class="delete-modal hidden" id="delete-modal">
      <div class="delete-modal-backdrop" id="delete-modal-backdrop"></div>
      <div class="delete-modal-content">
        <div class="delete-modal-icon">\u26a0\ufe0f</div>
        <h3 class="delete-modal-title">Eliminar registro</h3>
        <p class="delete-modal-text" id="delete-modal-text">\u00bfEst\u00e1s seguro de eliminar este registro?</p>
        <div class="delete-modal-actions">
          <button class="btn btn-outline delete-modal-btn" id="delete-modal-cancel">Cancelar</button>
          <button class="btn delete-modal-btn delete-modal-btn--confirm" id="delete-modal-confirm">Eliminar</button>
        </div>
      </div>
    </div>
  `;
}

export function init(s) {
  session = s;
  document.getElementById('registros-back').addEventListener('click', () => navigateTo('home'));

  // Cerrar modal con backdrop o botón cancelar
  document.getElementById('delete-modal-backdrop').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal-cancel').addEventListener('click', closeDeleteModal);

  loadRegistros();
}

// Estado del modal
let pendingDelete = null;

function openDeleteModal(type, data, displayName) {
  pendingDelete = { type, data };
  document.getElementById('delete-modal-text').textContent =
    `\u00bfEliminar ${type === 'cita' ? 'la cita de' : 'el gasto'} "${displayName}"?`;
  document.getElementById('delete-modal').classList.remove('hidden');

  // Asignar handler al botón confirmar
  const confirmBtn = document.getElementById('delete-modal-confirm');
  confirmBtn.onclick = handleConfirmDelete;
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  pendingDelete = null;
}

async function handleConfirmDelete() {
  if (!pendingDelete) return;

  const { type, data } = pendingDelete;
  closeDeleteModal();

  try {
    showLoader();
    if (type === 'cita') {
      await deleteCita(session.sheet_id, data.fecha, data.timestamp, data.clienta);
    } else {
      await deleteGasto(session.sheet_id, data.fecha, data.timestamp, data.descripcion);
    }
    hideLoader();
    showToast('Registro eliminado', 'success');
    loadRegistros();
  } catch (error) {
    hideLoader();
    showToast('Error al eliminar', 'error');
  }
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
        <div class="empty-state-emoji">\ud83d\udced</div>
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
        ${citas.map((c, i) => `
          <div class="record-item">
            <div class="record-info">
              <div class="record-title">${c.clienta}</div>
              <div class="record-subtitle">${c.servicio} \u00b7 ${c.metodo_pago} \u00b7 ${c.timestamp}</div>
            </div>
            <div class="record-amount record-amount--income">${formatMXN(c.costo)}</div>
            <button class="record-delete-btn" data-type="cita" data-index="${i}" title="Eliminar">\u00d7</button>
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
        ${gastos.map((g, i) => `
          <div class="record-item">
            <div class="record-info">
              <div class="record-title">${g.descripcion}</div>
              <div class="record-subtitle">${g.metodo_pago} \u00b7 ${g.timestamp}</div>
            </div>
            <div class="record-amount record-amount--expense">-${formatMXN(g.monto)}</div>
            <button class="record-delete-btn" data-type="gasto" data-index="${i}" title="Eliminar">\u00d7</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  content.innerHTML = html;

  // Agregar event listeners a botones de eliminar
  content.querySelectorAll('.record-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const type = btn.dataset.type;
      const index = parseInt(btn.dataset.index, 10);

      if (type === 'cita') {
        const c = citas[index];
        openDeleteModal('cita', c, c.clienta);
      } else {
        const g = gastos[index];
        openDeleteModal('gasto', g, g.descripcion);
      }
    });
  });
}
