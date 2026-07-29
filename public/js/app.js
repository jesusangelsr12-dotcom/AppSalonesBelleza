/**
 * App Entry Point
 * Router SPA hash-based + registro del Service Worker
 */

import { isAuthenticated, getSession } from './auth.js';
import * as loginView from './views/login.js';
import * as homeView from './views/home.js';
import * as citaView from './views/cita.js';
import * as gastoView from './views/gasto.js';
import * as registrosView from './views/registros.js';
import * as comisionesView from './views/comisiones.js';
import * as historialView from './views/historial.js';
import * as configView from './views/config.js';

const routes = {
  login: loginView,
  home: homeView,
  cita: citaView,
  gasto: gastoView,
  registros: registrosView,
  comisiones: comisionesView,
  historial: historialView,
  config: configView,
};

/** Navega a una ruta */
export function navigateTo(route) {
  window.location.hash = `#${route}`;
}

/** Obtiene la ruta actual del hash */
function getCurrentRoute() {
  return window.location.hash.replace('#', '') || 'login';
}

/** Renderiza la vista correspondiente a la ruta actual */
function renderCurrentRoute() {
  const route = getCurrentRoute();
  const view = routes[route];

  // Si no está autenticado y no está en login, redirigir
  if (route !== 'login' && !isAuthenticated()) {
    navigateTo('login');
    return;
  }

  // Si está autenticado y está en login, ir a home
  if (route === 'login' && isAuthenticated()) {
    navigateTo('home');
    return;
  }

  const app = document.getElementById('app');
  if (view) {
    app.innerHTML = view.render(getSession());
    view.init(getSession());
  }
}

/** Registra el Service Worker */
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  }
}

// --- Inicialización ---
function init() {
  registerSW();

  // Escuchar cambios de ruta
  window.addEventListener('hashchange', renderCurrentRoute);

  // Render inicial
  renderCurrentRoute();
}

document.addEventListener('DOMContentLoaded', init);
