/**
 * Pantalla Ver Registros
 * Muestra citas y gastos de cualquier día con totales (ingresos vs gastos)
 * Permite eliminar citas y gastos individuales
 */

import { getCitas, getGastos, deleteCita, deleteGasto, updateCitaNota } from '../api.js';
import { formatMXN, todayISO, showToast, showLoader, hideLoader, escapeHTML } from '../utils.js';
import { navigateTo } from '../app.js';

let session = null;
let selectedDate = '';
let citasActuales = [];

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function render(s) {
  session = s;
  selectedDate = todayISO();
  return `
    <div class="screen" id="registros-screen">
      <header class="screen-header">
        <button class="header-back" id="registros-back">\u2190 Atr\u00e1s</button>
        <h2 class="screen-title">Registros</h2>
      </header>

      <div class="date-picker-row">
        <input type="date" class="date-picker-input" id="date-picker"
          value="${selectedDate}" max="${todayISO()}">
      </div>

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

    <!-- Modal de confirmaci\u00f3n para eliminar -->
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
  selectedDate = todayISO();

  document.getElementById('registros-back').addEventListener('click', () => navigateTo('home'));

  // Date picker
  const datePicker = document.getElementById('date-picker');
  datePicker.addEventListener('change', () => {
    selectedDate = datePicker.value;
    loadRegistros();
  });

  // Cerrar modal con backdrop o bot\u00f3n cancelar
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
    const [citasRes, gastosRes] = await Promise.all([
      getCitas(session.sheet_id, selectedDate),
      getGastos(session.sheet_id, selectedDate),
    ]);
    hideLoader();

    const citas = citasRes.citas || [];
    const gastos = gastosRes.gastos || [];

    const totalIngresos = citas.reduce((sum, c) => sum + c.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    document.getElementById('total-ingresos').textContent = formatMXN(totalIngresos);
    document.getElementById('total-gastos').textContent = formatMXN(totalGastos);

    citasActuales = citas;
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

/** Genera el subt\u00edtulo de una cita con desglose de items */
function buildCitaSubtitle(c) {
  const items = c.items || [];
  if (items.length === 0) return `${c.metodo_pago} \u00b7 ${c.timestamp}`;

  const names = items.map((it) => it.nombre);
  return `${names.join(', ')} \u00b7 ${c.metodo_pago} \u00b7 ${c.timestamp}`;
}

/** Genera el desglose de items como HTML */
function buildItemsBreakdown(items) {
  if (!items || items.length <= 1) return '';

  return `
    <div class="record-items-breakdown">
      ${items.map((it) => `
        <div class="record-items-row">
          <span class="record-items-badge record-items-badge--${it.tipo}">
            ${it.tipo === 'servicio' ? 'S' : 'P'}
          </span>
          <span class="record-items-name">
            ${it.nombre}
            ${it.trabajadora ? `<span class="record-items-worker">${it.trabajadora} ${it.pct}%</span>` : ''}
          </span>
          <span class="record-items-cost">${formatMXN(it.costo)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/** Fila de fórmula / nota dentro de la tarjeta de una cita, editable. */
function buildNotaRow(c, index) {
  return `
    <div class="record-nota-row" data-nota-row="${index}">
      ${c.nota
        ? `<span class="visita-nota">${escapeHTML(c.nota)}</span>`
        : '<span class="visita-nota visita-nota--vacia">Sin fórmula anotada</span>'}
      <button class="btn-icon-sm" data-edit-nota="${index}" title="Editar nota">✎</button>
    </div>
  `;
}

/** Reemplaza la fila de la nota por un editor en línea. */
function abrirEditorNota(index) {
  const c = citasActuales[index];
  const row = document.querySelector(`[data-nota-row="${index}"]`);
  if (!c || !row) return;

  row.innerHTML = `
    <textarea class="input textarea nota-editor" rows="3" maxlength="500"
      placeholder="Ej: Tinte 7.1 + 20 vol, 35 min">${escapeHTML(c.nota || '')}</textarea>
    <div class="step-actions mt-8">
      <button class="btn btn-outline btn-sm" data-cancel>Cancelar</button>
      <button class="btn btn-primary btn-sm" data-save>Guardar</button>
    </div>
  `;

  const textarea = row.querySelector('.nota-editor');
  textarea.focus();

  row.querySelector('[data-cancel]').addEventListener('click', () => loadRegistros());

  row.querySelector('[data-save]').addEventListener('click', async () => {
    const nota = textarea.value.trim();
    try {
      showLoader();
      await updateCitaNota(session.sheet_id, {
        fecha: c.fecha,
        timestamp: c.timestamp,
        clienta: c.clienta,
        nota,
      });
      hideLoader();
      c.nota = nota;
      showToast('Nota guardada', 'success');
      loadRegistros();
    } catch (error) {
      hideLoader();
      showToast('No se pudo guardar la nota', 'error');
    }
  });
}

function renderRegistros(citas, gastos) {
  const content = document.getElementById('registros-content');
  const isToday = selectedDate === todayISO();
  const emptyLabel = isToday ? 'No hay registros para hoy' : `No hay registros para el ${formatDateDisplay(selectedDate)}`;

  if (citas.length === 0 && gastos.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-emoji">\ud83d\udced</div>
        <p class="empty-state-text">${emptyLabel}</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Secci\u00f3n Citas
  if (citas.length > 0) {
    html += `
      <div class="records-section">
        <div class="records-section-title">Citas (${citas.length})</div>
        ${citas.map((c, i) => `
          <div class="record-item record-item--expandable">
            <div class="record-main-row">
              <div class="record-info">
                <div class="record-title">${escapeHTML(c.clienta)}</div>
                <div class="record-subtitle">${buildCitaSubtitle(c)}</div>
              </div>
              <div class="record-amount record-amount--income">${formatMXN(c.total)}</div>
              <button class="record-delete-btn" data-type="cita" data-index="${i}" title="Eliminar">\u00d7</button>
            </div>
            ${buildItemsBreakdown(c.items)}
            ${buildNotaRow(c, i)}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Secci\u00f3n Gastos
  if (gastos.length > 0) {
    html += `
      <div class="records-section">
        <div class="records-section-title">Gastos (${gastos.length})</div>
        ${gastos.map((g, i) => `
          <div class="record-item">
            <div class="record-main-row">
              <div class="record-info">
                <div class="record-title">${escapeHTML(g.descripcion)}</div>
                <div class="record-subtitle">${g.metodo_pago} \u00b7 ${g.timestamp}</div>
              </div>
              <div class="record-amount record-amount--expense">-${formatMXN(g.monto)}</div>
              <button class="record-delete-btn" data-type="gasto" data-index="${i}" title="Eliminar">\u00d7</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  content.innerHTML = html;

  // Agregar event listeners a botones de eliminar
  content.querySelectorAll('.record-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
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

  // Editar la fórmula / nota de una cita
  content.querySelectorAll('[data-edit-nota]').forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirEditorNota(parseInt(btn.dataset.editNota, 10));
    });
  });
}
