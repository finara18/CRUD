/* ═══════════════════════════════════════════════════
   CRUD_DB · app.js
   Lógica completa: CRUD, búsqueda, paginación, orden
═══════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════════════ */
const CONFIG = {
  apiBase:      'api.php',   // PHP backend
  perPage:      8,           // Registros por página
  toastTimeout: 3200,        // ms para ocultar toast
};

/* ══════════════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════════════ */
const State = {
  usuarios:      [],   // Todos los registros cargados
  filtered:      [],   // Después de búsqueda
  currentPage:   1,
  sortCol:       'id',
  sortAsc:       true,
  editingId:     null, // null = modo CREATE, número = modo UPDATE
  pendingDelete: null, // id a eliminar
};

/* ══════════════════════════════════════════════════
   REFERENCIAS DOM
══════════════════════════════════════════════════ */
const DOM = {
  // Form
  form:          document.getElementById('crud-form'),
  fieldId:       document.getElementById('field-id'),
  fieldNombre:   document.getElementById('field-nombre'),
  fieldEmail:    document.getElementById('field-email'),
  fieldRol:      document.getElementById('field-rol'),
  fieldActivo:   document.getElementById('field-activo'),
  toggleText:    document.getElementById('toggle-text-display'),
  btnSubmit:     document.getElementById('btn-submit'),
  btnSubmitText: document.getElementById('btn-submit-text'),
  btnCancel:     document.getElementById('btn-cancel'),
  formTitle:     document.getElementById('form-title'),
  formModeTag:   document.getElementById('form-mode-tag'),
  errNombre:     document.getElementById('err-nombre'),
  errEmail:      document.getElementById('err-email'),
  errRol:        document.getElementById('err-rol'),
  btnIcon:       document.querySelector('.btn-icon'),
  toast:         document.getElementById('toast'),

  // Tabla
  loader:        document.getElementById('loader'),
  emptyState:    document.getElementById('empty-state'),
  tableWrap:     document.getElementById('table-wrap'),
  tableBody:     document.getElementById('table-body'),
  searchInput:   document.getElementById('search-input'),
  countBadge:    document.getElementById('count-badge'),
  pagination:    document.getElementById('pagination'),
  pagePrev:      document.getElementById('page-prev'),
  pageNext:      document.getElementById('page-next'),
  pageInfo:      document.getElementById('page-info'),

  // Modal
  modalOverlay:     document.getElementById('modal-overlay'),
  modalUserName:    document.getElementById('modal-user-name'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  btnCancelDelete:  document.getElementById('btn-cancel-delete'),
};

/* ══════════════════════════════════════════════════
   API · Capa de comunicación con PHP
══════════════════════════════════════════════════ */
const API = {

  /**
   * Petición genérica
   * @param {string} action  - Acción en el backend
   * @param {string} method  - GET | POST | PUT | DELETE
   * @param {object} [body]  - Datos a enviar (POST/PUT)
   * @returns {Promise<object>}
   */
  async request(action, method = 'GET', body = null) {
    const url = `${CONFIG.apiBase}?action=${action}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);

    // Intentar parsear JSON aunque sea error HTTP
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Respuesta no válida del servidor (HTTP ${res.status})`);
    }

    if (!res.ok) {
      throw new Error(data.message || `Error del servidor: ${res.status}`);
    }

    return data;
  },

  getAll:   ()       => API.request('read',   'GET'),
  create:   (body)   => API.request('create', 'POST',   body),
  update:   (body)   => API.request('update', 'PUT',    body),
  remove:   (id)     => API.request('delete', 'DELETE', { id }),
};

/* ══════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════ */

/** Escapar HTML para evitar XSS */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Validar formato de email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Mostrar / ocultar elementos */
function show(el) { el.style.display = ''; }
function hide(el) { el.style.display = 'none'; }

/** Debounce para el buscador */
function debounce(fn, ms = 280) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/* ══════════════════════════════════════════════════
   TOAST (notificación)
══════════════════════════════════════════════════ */
let toastTimer = null;

function showToast(msg, type = 'success') {
  const t = DOM.toast;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, CONFIG.toastTimeout);
}

/* ══════════════════════════════════════════════════
   FORM · Gestión del formulario
══════════════════════════════════════════════════ */

/** Limpiar errores de validación */
function clearErrors() {
  [DOM.fieldNombre, DOM.fieldEmail, DOM.fieldRol].forEach(f => f.classList.remove('error'));
  DOM.errNombre.textContent = '';
  DOM.errEmail.textContent  = '';
  DOM.errRol.textContent    = '';
}

/** Validar campos del formulario. Retorna true si es válido. */
function validateForm() {
  clearErrors();
  let valid = true;

  if (!DOM.fieldNombre.value.trim()) {
    DOM.fieldNombre.classList.add('error');
    DOM.errNombre.textContent = 'El nombre es obligatorio.';
    valid = false;
  }

  if (!DOM.fieldEmail.value.trim()) {
    DOM.fieldEmail.classList.add('error');
    DOM.errEmail.textContent = 'El correo es obligatorio.';
    valid = false;
  } else if (!isValidEmail(DOM.fieldEmail.value)) {
    DOM.fieldEmail.classList.add('error');
    DOM.errEmail.textContent = 'Ingresa un correo válido.';
    valid = false;
  }

  if (!DOM.fieldRol.value) {
    DOM.fieldRol.classList.add('error');
    DOM.errRol.textContent = 'Selecciona un rol.';
    valid = false;
  }

  return valid;
}

/** Poner el formulario en modo CREATE */
function setCreateMode() {
  State.editingId = null;
  DOM.form.reset();
  clearErrors();
  DOM.fieldId.value        = '';
  DOM.formTitle.textContent  = 'Nuevo Usuario';
  DOM.formModeTag.textContent = 'CREATE';
  DOM.formModeTag.classList.remove('mode-update');
  DOM.btnSubmitText.textContent = 'Crear usuario';
  DOM.btnIcon.textContent       = '＋';
  hide(DOM.btnCancel);
  updateToggleText();
}

/** Poner el formulario en modo UPDATE con los datos del usuario */
function setUpdateMode(usuario) {
  State.editingId = usuario.id;
  DOM.fieldId.value      = usuario.id;
  DOM.fieldNombre.value  = usuario.nombre;
  DOM.fieldEmail.value   = usuario.email;
  DOM.fieldRol.value     = usuario.rol;
  DOM.fieldActivo.checked = Number(usuario.activo) === 1;
  clearErrors();
  DOM.formTitle.textContent    = 'Editar Usuario';
  DOM.formModeTag.textContent  = 'UPDATE';
  DOM.formModeTag.classList.add('mode-update');
  DOM.btnSubmitText.textContent = 'Guardar cambios';
  DOM.btnIcon.textContent       = '✎';
  show(DOM.btnCancel);
  updateToggleText();

  // Scroll al form en móvil
  DOM.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Actualizar texto del toggle activo/inactivo */
function updateToggleText() {
  DOM.toggleText.textContent = DOM.fieldActivo.checked ? 'Activo' : 'Inactivo';
}

/* ══════════════════════════════════════════════════
   TABLA · Render y filtros
══════════════════════════════════════════════════ */

/** Aplicar búsqueda y ordenamiento sobre State.usuarios */
function applyFilters() {
  const q = DOM.searchInput.value.trim().toLowerCase();

  // Filtrar
  State.filtered = q
    ? State.usuarios.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)  ||
        u.rol.toLowerCase().includes(q)
      )
    : [...State.usuarios];

  // Ordenar
  const col = State.sortCol;
  State.filtered.sort((a, b) => {
    let va = a[col] ?? '', vb = b[col] ?? '';
    // Comparación numérica para id, lexicográfica para el resto
    if (col === 'id' || col === 'activo') {
      va = Number(va); vb = Number(vb);
    } else {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    }
    if (va < vb) return State.sortAsc ? -1 :  1;
    if (va > vb) return State.sortAsc ?  1 : -1;
    return 0;
  });

  State.currentPage = 1;
  renderTable();
}

/** Renderizar la tabla con los datos paginados */
function renderTable() {
  const total = State.filtered.length;
  DOM.countBadge.textContent = `${total} registro${total !== 1 ? 's' : ''}`;

  // Estados vacío / tabla
  if (total === 0) {
    hide(DOM.tableWrap);
    hide(DOM.pagination);
    show(DOM.emptyState);
    return;
  }

  hide(DOM.emptyState);
  show(DOM.tableWrap);

  // Paginación
  const totalPages = Math.ceil(total / CONFIG.perPage);
  if (State.currentPage > totalPages) State.currentPage = totalPages;
  const start = (State.currentPage - 1) * CONFIG.perPage;
  const page  = State.filtered.slice(start, start + CONFIG.perPage);

  DOM.pageInfo.textContent    = `Pág. ${State.currentPage} / ${totalPages}`;
  DOM.pagePrev.disabled       = State.currentPage === 1;
  DOM.pageNext.disabled       = State.currentPage === totalPages;
  totalPages > 1 ? show(DOM.pagination) : hide(DOM.pagination);

  // Cabeceras ordenables
  document.querySelectorAll('.data-table th[data-col]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === State.sortCol);
    th.classList.toggle('asc',    th.dataset.col === State.sortCol && State.sortAsc);
  });

  // Filas
  DOM.tableBody.innerHTML = page.map(u => rowHTML(u)).join('');
}

/** Generar HTML de una fila */
function rowHTML(u) {
  const activo = Number(u.activo) === 1;
  const rolClass = { admin: 'rol-admin', editor: 'rol-editor', viewer: 'rol-viewer' }[u.rol] ?? '';
  const rolLabel = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador' }[u.rol] ?? esc(u.rol);

  return `
    <tr data-id="${u.id}">
      <td class="cell-id">#${esc(u.id)}</td>
      <td>${esc(u.nombre)}</td>
      <td>${esc(u.email)}</td>
      <td><span class="rol-badge ${rolClass}">${rolLabel}</span></td>
      <td>
        <span class="estado-badge ${activo ? 'estado-activo' : 'estado-inactivo'}">
          ${activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="cell-actions">
        <button class="btn-icon-only edit"   data-action="edit"   data-id="${u.id}" title="Editar">✎</button>
        <button class="btn-icon-only delete" data-action="delete" data-id="${u.id}" title="Eliminar">✕</button>
      </td>
    </tr>`;
}

/** Resaltar una fila tras crear o actualizar */
function highlightRow(id) {
  const row = DOM.tableBody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  row.classList.add('row-highlight');
  setTimeout(() => row.classList.remove('row-highlight'), 1600);
}

/* ══════════════════════════════════════════════════
   CARGA INICIAL
══════════════════════════════════════════════════ */
async function loadUsuarios() {
  show(DOM.loader);
  hide(DOM.tableWrap);
  hide(DOM.emptyState);
  hide(DOM.pagination);

  try {
    const data = await API.getAll();
    State.usuarios = data.usuarios ?? [];
    applyFilters();
  } catch (err) {
    showToast(`Error al cargar datos: ${err.message}`, 'error');
    State.usuarios = [];
    applyFilters();
  } finally {
    hide(DOM.loader);
  }
}

/* ══════════════════════════════════════════════════
   OPERACIONES CRUD
══════════════════════════════════════════════════ */

/** CREATE — Enviar nuevo usuario */
async function createUsuario(payload) {
  const data = await API.create(payload);
  const nuevo = { id: data.id, ...payload };
  State.usuarios.unshift(nuevo);
  applyFilters();
  highlightRow(nuevo.id);
  setCreateMode();
  showToast(`✓ Usuario "${payload.nombre}" creado correctamente.`);
}

/** UPDATE — Guardar cambios */
async function updateUsuario(payload) {
  await API.update(payload);
  const idx = State.usuarios.findIndex(u => String(u.id) === String(payload.id));
  if (idx !== -1) State.usuarios[idx] = { ...State.usuarios[idx], ...payload };
  applyFilters();
  highlightRow(payload.id);
  setCreateMode();
  showToast(`✓ Usuario "${payload.nombre}" actualizado.`);
}

/** DELETE — Eliminar usuario */
async function deleteUsuario(id) {
  await API.remove(id);
  State.usuarios = State.usuarios.filter(u => String(u.id) !== String(id));
  applyFilters();
  showToast('✓ Usuario eliminado.', 'success');
}

/* ══════════════════════════════════════════════════
   MODAL DE CONFIRMACIÓN
══════════════════════════════════════════════════ */
function openDeleteModal(id) {
  const usuario = State.usuarios.find(u => String(u.id) === String(id));
  if (!usuario) return;
  State.pendingDelete = id;
  DOM.modalUserName.textContent = usuario.nombre;
  show(DOM.modalOverlay);
}

function closeDeleteModal() {
  State.pendingDelete = null;
  hide(DOM.modalOverlay);
}

/* ══════════════════════════════════════════════════
   EVENTOS
══════════════════════════════════════════════════ */

/* ── Submit del formulario ── */
DOM.form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    nombre: DOM.fieldNombre.value.trim(),
    email:  DOM.fieldEmail.value.trim(),
    rol:    DOM.fieldRol.value,
    activo: DOM.fieldActivo.checked ? 1 : 0,
  };

  DOM.btnSubmit.disabled = true;
  DOM.btnSubmit.style.opacity = '0.6';

  try {
    if (State.editingId !== null) {
      payload.id = State.editingId;
      await updateUsuario(payload);
    } else {
      await createUsuario(payload);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    DOM.btnSubmit.disabled = false;
    DOM.btnSubmit.style.opacity = '';
  }
});

/* ── Cancelar edición ── */
DOM.btnCancel.addEventListener('click', setCreateMode);

/* ── Toggle texto activo/inactivo ── */
DOM.fieldActivo.addEventListener('change', updateToggleText);

/* ── Buscador con debounce ── */
DOM.searchInput.addEventListener('input', debounce(applyFilters));

/* ── Paginación ── */
DOM.pagePrev.addEventListener('click', () => {
  if (State.currentPage > 1) { State.currentPage--; renderTable(); }
});
DOM.pageNext.addEventListener('click', () => {
  const totalPages = Math.ceil(State.filtered.length / CONFIG.perPage);
  if (State.currentPage < totalPages) { State.currentPage++; renderTable(); }
});

/* ── Cabeceras ordenables ── */
document.querySelectorAll('.data-table th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (State.sortCol === col) {
      State.sortAsc = !State.sortAsc;
    } else {
      State.sortCol = col;
      State.sortAsc = true;
    }
    applyFilters();
  });
});

/* ── Delegación de eventos en la tabla (editar / eliminar) ── */
DOM.tableBody.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'edit') {
    const usuario = State.usuarios.find(u => String(u.id) === String(id));
    if (usuario) setUpdateMode(usuario);
  }

  if (action === 'delete') {
    openDeleteModal(id);
  }
});

/* ── Modal: confirmar eliminación ── */
DOM.btnConfirmDelete.addEventListener('click', async () => {
  const id = State.pendingDelete;
  closeDeleteModal();
  if (!id) return;

  try {
    await deleteUsuario(id);
    // Si estábamos editando ese mismo usuario, resetear form
    if (String(State.editingId) === String(id)) setCreateMode();
  } catch (err) {
    showToast(`Error al eliminar: ${err.message}`, 'error');
  }
});

/* ── Modal: cancelar eliminación ── */
DOM.btnCancelDelete.addEventListener('click', closeDeleteModal);

/* ── Cerrar modal al hacer clic fuera ── */
DOM.modalOverlay.addEventListener('click', e => {
  if (e.target === DOM.modalOverlay) closeDeleteModal();
});

/* ── Cerrar modal con Escape ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && DOM.modalOverlay.style.display !== 'none') {
    closeDeleteModal();
  }
});

/* ══════════════════════════════════════════════════
   INICIO
══════════════════════════════════════════════════ */
loadUsuarios();
