// ── Config ────────────────────────────────────────────────
const API = 'http://127.0.0.1:8000';

// ── Estado global ─────────────────────────────────────────
let MI_CENTRO = null;
let usuario   = null;
let animalesCentro   = [];
let personalCentro   = [];
let historialCentro  = [];
let especiesLista    = [];
let rescatesLista    = [];
let rolesLista       = [];

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  mostrarFecha();
  cargarTodo();

  // Cerrar modales al hacer click fuera
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  });
});

function verificarSesion() {
  usuario   = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  const rol = sessionStorage.getItem('rol');
  MI_CENTRO = parseInt(sessionStorage.getItem('id_centro'));

  if (!usuario || rol !== 'Administrador') {
    window.location.href = 'login_personal.html';
    return;
  }
  document.getElementById('sidebarNombre').textContent =
    usuario.nombre_personal || usuario.username;
}

function mostrarFecha() {
  document.getElementById('topbarFecha').textContent =
    new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

async function cargarTodo() {
  // Especies primero para que los lookups funcionen en animales
  await cargarEspecies();
  // Animales antes que historial (historial filtra por animalesCentro)
  await cargarAnimales();
  await Promise.all([
    cargarNombreCentro(),
    cargarPersonal(),
    cargarHistorial(),
    cargarRescates(),
    cargarRoles(),
  ]);
  // Si el usuario ya estaba en la pestaña de reportes al cargar, renderizarlos ahora
  if (document.getElementById('sec-reportes')?.classList.contains('active')) {
    cargarReportesCentro();
  }
}

// ── NOMBRE DEL CENTRO ─────────────────────────────────────
async function cargarNombreCentro() {
  try {
    const res  = await apiFetch(`/centros/${MI_CENTRO}`);
    const data = await res.json();
    document.getElementById('sidebarCentro').textContent = data.nombre;
  } catch(e) {
    document.getElementById('sidebarCentro').textContent = `Centro #${MI_CENTRO}`;
  }
}

// ── ANIMALES ──────────────────────────────────────────────
async function cargarAnimales() {
  try {
    const res = await apiFetch(`/animales/`);
    const todos = await res.json();
    animalesCentro = todos.filter(a => a.id_centro === MI_CENTRO);

    // Stats
    const rehab  = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;
    const listos = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('liberaci')).length;
    document.getElementById('statAnimales').textContent      = animalesCentro.length;
    document.getElementById('statAnimalesRehab').textContent = `${rehab} en rehabilitación`;
    document.getElementById('statListos').textContent        = listos;

    // Tabla resumen (top 5)
    document.getElementById('tablaResumenAnimales').innerHTML =
      animalesCentro.slice(0,5).map(a => `
        <tr>
          <td>#${a.id_animal}</td>
          <td style="font-size:0.8rem">${tipoEspecie(a.id_especie)}</td>
          <td style="font-size:0.8rem"><strong>${nombreEspecie(a.id_especie)}</strong></td>
          <td>${badgeEstadoAnimal(a.estado_actual)}</td>
        </tr>
      `).join('') || emptyRow(4, 'Sin animales registrados');

    // Tabla completa
    document.getElementById('tablaAnimales').innerHTML = animalesCentro.length
      ? animalesCentro.map(a => `
          <tr>
            <td style="color:rgba(245,240,232,0.35)">#${a.id_animal}</td>
            <td style="font-size:0.8rem">${tipoEspecie(a.id_especie)}</td>
            <td><strong>${nombreEspecie(a.id_especie)}</strong></td>
            <td>${a.sexo || '—'}</td>
            <td>${a.peso ? a.peso + ' kg' : '—'}</td>
            <td style="font-size:0.78rem">${formatFecha(a.fecha_ingreso)}</td>
            <td>${badgeEstadoAnimal(a.estado_actual)}</td>
            <td>
              <button class="btn-accion btn-ver" onclick="verAnimal(${a.id_animal})">Ver</button>
            </td>
          </tr>
        `).join('')
      : emptyRow(8, 'No hay animales registrados en este centro');

  } catch(e) {
    document.getElementById('tablaAnimales').innerHTML = emptyRow(7, 'Error al cargar animales');
  }
}

// ── VER DETALLE ANIMAL ────────────────────────────────────
async function verAnimal(id) {
  const animal = animalesCentro.find(a => a.id_animal === id);
  if (!animal) return;

  const esp = getEspecie(animal.id_especie);
  const espNombre = esp ? esp.nombre_comun : `Especie #${animal.id_especie}`;
  const espTipo   = esp ? (esp.tipo || '—') : '—';

  document.getElementById('modalAnimalTitulo').textContent =
    `${espNombre} #${animal.id_animal}`;
  document.getElementById('detEspecie').textContent    = esp
    ? `${esp.nombre_comun}${esp.nombre_cientifico ? ' — ' + esp.nombre_cientifico : ''}`
    : `Especie #${animal.id_especie}`;
  const detTipo = document.getElementById('detTipo');
  if (detTipo) detTipo.textContent = espTipo;
  document.getElementById('detSexo').textContent       = animal.sexo || '—';
  document.getElementById('detPeso').textContent       = animal.peso ? `${animal.peso} kg` : '—';
  document.getElementById('detEstadoAnimal').innerHTML = badgeEstadoAnimal(animal.estado_actual);
  document.getElementById('detIngreso').textContent    = formatFecha(animal.fecha_ingreso);
  document.getElementById('detNacimiento').textContent = formatFecha(animal.fecha_nacimiento_aprox);
  document.getElementById('detObs').textContent        = animal.observaciones || '—';

  // Cargar historial del animal
  const histAnimal = historialCentro.filter(h => h.id_animal === id);
  document.getElementById('historialAnimal').innerHTML = histAnimal.length
    ? histAnimal.map(h => `
        <div class="hist-item">
          <div class="hist-fecha">${formatFecha(h.fecha_revision)}</div>
          <div class="hist-diag">${h.diagnostico}</div>
          <div class="hist-trat">🩺 ${h.tratamiento}</div>
          <div class="hist-estado">${badgeEstadoSalud(h.estado_salud)}</div>
        </div>
      `).join('')
    : '<p style="color:rgba(245,240,232,0.3);font-size:0.85rem;text-align:center;padding:2rem">Sin registros médicos</p>';

  // Resetear tab
  cambiarTab('tabDatos', document.querySelector('.tab-btn'));
  abrirModal('modalVerAnimal');
}

// ── PERSONAL ──────────────────────────────────────────────
async function cargarPersonal() {
  try {
    const res  = await apiFetch(`/personal/`);
    const todos = await res.json();
    personalCentro = todos.filter(p => p.id_centro === MI_CENTRO);

    const activos = personalCentro.filter(p => p.estado !== false).length;
    document.getElementById('statPersonal').textContent      = personalCentro.length;
    document.getElementById('statPersonalActivo').textContent = `${activos} activos`;

    // Tabla resumen
    document.getElementById('tablaResumenPersonal').innerHTML =
      personalCentro.slice(0,5).map(p => `
        <tr>
          <td>${p.nombre} ${p.paterno || ''}</td>
          <td style="font-size:0.78rem">${p.cargo || '—'}</td>
          <td>${p.estado !== false
            ? '<span style="color:#7dd4a0;font-size:0.75rem">● Activo</span>'
            : '<span style="color:#f0a09a;font-size:0.75rem">● Inactivo</span>'}</td>
        </tr>
      `).join('') || emptyRow(3, 'Sin personal registrado');

    // Tabla completa
    document.getElementById('tablaPersonal').innerHTML = personalCentro.length
      ? personalCentro.map(p => `
          <tr>
            <td style="color:rgba(245,240,232,0.35)">${p.id_personal}</td>
            <td><strong>${p.nombre} ${p.paterno || ''}</strong></td>
            <td>${p.cargo || '—'}</td>
            <td style="font-size:0.78rem">${p.email || '—'}</td>
            <td>${p.estado !== false
              ? '<span class="badge badge-activo">Activo</span>'
              : '<span class="badge badge-inactivo">Inactivo</span>'}</td>
            <td>
              <button class="btn-accion btn-toggle" onclick="togglePersonal(${p.id_personal}, ${p.estado})">
                ${p.estado !== false ? 'Desactivar' : 'Activar'}
              </button>
            </td>
          </tr>
        `).join('')
      : emptyRow(6, 'No hay personal registrado');

  } catch(e) {
    document.getElementById('tablaPersonal').innerHTML = emptyRow(6, 'Error al cargar personal');
  }
}

// ── HISTORIAL ─────────────────────────────────────────────
async function cargarHistorial() {
  try {
    // No existe GET /historial-medico/ general — cargar por cada animal del centro
    const arrays = await Promise.all(
      animalesCentro.map(a =>
        apiFetch(`/historial-medico/animal/${a.id_animal}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    );
    historialCentro = arrays.flat();

    document.getElementById('statHistorial').textContent = historialCentro.length;

    document.getElementById('tablaHistorial').innerHTML = historialCentro.length
      ? historialCentro
          .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision))
          .map(h => {
            const animal = animalesCentro.find(a => a.id_animal === h.id_animal);
            const espNombre = animal ? nombreEspecie(animal.id_especie) : `Animal #${h.id_animal}`;
            return `
              <tr>
                <td style="font-size:0.78rem">${formatFecha(h.fecha_revision)}</td>
                <td>${espNombre} <span style="color:rgba(245,240,232,0.35);font-size:0.75rem">#${h.id_animal}</span></td>
                <td style="font-size:0.78rem">${h.nombre_personal || `Personal #${h.id_personal}`}</td>
                <td style="font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.diagnostico || '—'}</td>
                <td>${badgeEstadoSalud(h.estado_salud)}</td>
                <td>
                  <button class="btn-accion btn-ver" onclick="verAnimalDesdeHistorial(${h.id_animal})">Ver animal</button>
                </td>
              </tr>`;
          }).join('')
      : emptyRow(6, 'No hay registros médicos');

  } catch(e) {
    document.getElementById('tablaHistorial').innerHTML = emptyRow(6, 'Error al cargar historial');
  }
}

// ── LISTAS AUXILIARES ─────────────────────────────────────
async function cargarEspecies() {
  try {
    const res = await apiFetch(`/especies/`);
    especiesLista = await res.json();
    const sel = document.getElementById('anEspecie');
    sel.innerHTML = '<option value="">Seleccionar especie...</option>' +
      especiesLista.map(e => `<option value="${e.id_especie}">${e.nombre_comun} (${e.tipo || ''})</option>`).join('');
  } catch(e) {}
}

function getEspecie(id_especie) {
  return especiesLista.find(e => e.id_especie === id_especie) || null;
}

function nombreEspecie(id_especie) {
  const e = getEspecie(id_especie);
  return e ? e.nombre_comun : `Especie #${id_especie}`;
}

function tipoEspecie(id_especie) {
  const e = getEspecie(id_especie);
  return e ? (e.tipo || '—') : '—';
}

async function cargarRescates() {
  try {
    const res = await apiFetch(`/rescates/`);
    rescatesLista = await res.json();
    const sel = document.getElementById('anRescate');
    sel.innerHTML = '<option value="">Seleccionar rescate...</option>' +
      rescatesLista.map(r => `<option value="${r.id_rescate}">#${r.id_rescate} — ${r.tipo_incidente} (${formatFecha(r.fecha_rescate)})</option>`).join('');
  } catch(e) {}
}

async function cargarRoles() {
  try {
    const res = await apiFetch(`/roles/`);
    rolesLista = await res.json();
    // Roles operativos: Veterinario, Operador, Administrador (admin de centro)
    const rolesPersonal = rolesLista.filter(r =>
      ['Veterinario','Operador','Administrador'].includes(r.nombre)
    );
    const opts = '<option value="">Seleccionar...</option>' +
      rolesPersonal.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
    // Llenar ambos selects: modal usuario y modal personal
    document.getElementById('uRol').innerHTML = opts;
    const selPRol = document.getElementById('pRol');
    if (selPRol) selPRol.innerHTML = opts;
  } catch(e) {}
}

// ── GUARDAR ANIMAL ────────────────────────────────────────
async function guardarAnimal() {
  const id_especie = parseInt(document.getElementById('anEspecie').value);
  const id_rescate = parseInt(document.getElementById('anRescate').value);
  const sexo       = document.getElementById('anSexo').value;
  const peso       = parseFloat(document.getElementById('anPeso').value);
  const fecha_ingreso = document.getElementById('anIngreso').value;
  const fecha_nacimiento_aprox = document.getElementById('anNacimiento').value;
  const estado_actual = document.getElementById('anEstado').value;
  const observaciones = document.getElementById('anObs').value;

  if (!id_especie || !sexo || !fecha_ingreso || !estado_actual) {
    toast('Completa los campos obligatorios', 'error'); return;
  }
  try {
    const res = await apiFetch(`/animales/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_especie, id_centro: MI_CENTRO, id_rescate: id_rescate || null,
        sexo, peso: peso || null, fecha_ingreso,
        fecha_nacimiento_aprox: fecha_nacimiento_aprox || null,
        estado_actual, observaciones
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Animal registrado correctamente', 'exito');
    cerrarModal('modalAnimal');
    await cargarAnimales();
  } catch(e) {
    toast(e.message, 'error');
  }
}

// ── GUARDAR PERSONAL ──────────────────────────────────────

// ── AUTOCOMPLETAR CARGO SEGÚN ROL ────────────────────────
function autocompletarCargo() {
  const sel   = document.getElementById('pRol');
  const cargo = document.getElementById('pCargo');
  if (!sel || !cargo) return;
  const rolNombre = sel.options[sel.selectedIndex]?.text || '';
  // Solo autocompletar si el campo está vacío o tenía un valor automático anterior
  const autoValores = ['Veterinario', 'Operador', 'Administrador', ''];
  if (autoValores.includes(cargo.value.trim())) {
    cargo.value = rolNombre && rolNombre !== 'Seleccionar...' ? rolNombre : '';
  }
}
async function guardarPersonal() {
  const nombre   = document.getElementById('pNombre').value.trim();
  const paterno  = document.getElementById('pPaterno').value.trim();
  const cargo    = document.getElementById('pCargo').value.trim();
  const id_rol   = parseInt(document.getElementById('pRol').value);
  const email    = document.getElementById('pEmail').value.trim();
  const telefono = document.getElementById('pTel').value.trim();
  const username = document.getElementById('pUsername').value.trim();
  const password = document.getElementById('pPassword').value;

  if (!nombre || !cargo || !id_rol || !username || !password) {
    toast('Nombre, cargo, rol, usuario y contraseña son obligatorios', 'error'); return;
  }

  try {
    // 1. Crear personal
    const resP = await apiFetch(`/personal/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, paterno, cargo, email, telefono,
        password, id_centro: MI_CENTRO, estado: true
      })
    });
    if (!resP.ok) {
      const err = await resP.json();
      throw new Error('Personal: ' + (err.detail || 'Error al registrar'));
    }
    const nuevoPersonal = await resP.json();
    const id_personal   = nuevoPersonal.id_personal;
    if (!id_personal) throw new Error('No se recibió el ID del personal');

    // 2. Crear usuario vinculado automáticamente
    const resU = await apiFetch(`/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, id_personal, id_rol, estado: true })
    });
    if (!resU.ok) {
      const err = await resU.json();
      throw new Error('Usuario: ' + (err.detail || 'Error al crear acceso'));
    }

    toast(`Personal "${nombre}" registrado con acceso al sistema ✓`, 'exito');
    cerrarModal('modalPersonal');
    await cargarPersonal();
    await cargarUsuarios();
  } catch(e) {
    toast(e.message, 'error');
  }
}

// ── TOGGLE PERSONAL ───────────────────────────────────────
async function togglePersonal(id, estadoActual) {
  try {
    const p = personalCentro.find(x => x.id_personal === id);
    if (!p) return;
    const res = await apiFetch(`/personal/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, estado: !estadoActual })
    });
    if (!res.ok) throw new Error();
    toast(`Personal ${!estadoActual ? 'activado' : 'desactivado'}`, 'exito');
    await cargarPersonal();
  } catch(e) {
    toast('Error al actualizar estado', 'error');
  }
}

// ── GUARDAR USUARIO ───────────────────────────────────────
async function abrirModalUsuario() {
  // Llenar select de personal del centro
  const sel = document.getElementById('uPersonal');
  sel.innerHTML = '<option value="">Seleccionar personal...</option>' +
    personalCentro.map(p =>
      `<option value="${p.id_personal}">${p.nombre} ${p.paterno || ''} — ${p.cargo}</option>`
    ).join('');
  abrirModal('modalUsuario');
}

async function guardarUsuario() {
  const username    = document.getElementById('uUsername').value.trim();
  const password    = document.getElementById('uPassword').value;
  const id_personal = parseInt(document.getElementById('uPersonal').value);
  const id_rol      = parseInt(document.getElementById('uRol').value);

  if (!username || !password || !id_personal || !id_rol) {
    toast('Completa todos los campos', 'error'); return;
  }
  try {
    const res = await apiFetch(`/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, id_personal, estado: true, id_rol })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Usuario creado correctamente', 'exito');
    cerrarModal('modalUsuario');
    await cargarUsuarios();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function cargarUsuarios() {
  try {
    const res = await apiFetch(`/usuarios/`);
    const todos = await res.json();
    // Filtrar usuarios cuyo personal pertenece a este centro
    const idsPersonalCentro = personalCentro.map(p => p.id_personal);
    const usuariosCentro = todos.filter(u => idsPersonalCentro.includes(u.id_personal));

    document.getElementById('tablaUsuarios').innerHTML = usuariosCentro.length
      ? usuariosCentro.map(u => `
          <tr>
            <td style="color:rgba(245,240,232,0.35)">${u.id_usuario}</td>
            <td><strong>${u.username}</strong></td>
            <td style="font-size:0.8rem">${u.nombre_personal}</td>
            <td>${u.rol}</td>
            <td>${u.estado
              ? '<span class="badge badge-activo">Activo</span>'
              : '<span class="badge badge-inactivo">Inactivo</span>'}</td>
            <td>
              <button class="btn-accion btn-eliminar" onclick="eliminarUsuario(${u.id_usuario},'${u.username}')">Eliminar</button>
            </td>
          </tr>
        `).join('')
      : emptyRow(6, 'No hay usuarios creados para este centro');
  } catch(e) {
    document.getElementById('tablaUsuarios').innerHTML = emptyRow(6, 'Error al cargar usuarios');
  }
}

async function eliminarUsuario(id, username) {
  if (!confirm(`¿Eliminar acceso de "${username}"?`)) return;
  try {
    const res = await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    toast('Usuario eliminado', 'exito');
    await cargarUsuarios();
  } catch(e) {
    toast('Error al eliminar', 'error');
  }
}

// ── GUARDAR HISTORIAL ─────────────────────────────────────
function abrirModalHistorial() {
  // Llenar select de animales
  const selA = document.getElementById('hAnimal');
  selA.innerHTML = '<option value="">Seleccionar animal...</option>' +
    animalesCentro.map(a =>
      `<option value="${a.id_animal}">#${a.id_animal} — ${a.nombre_comun || 'Animal'} (${a.sexo || ''})</option>`
    ).join('');
  // Llenar select de veterinarios
  const selV = document.getElementById('hVeterinario');
  const vets = personalCentro.filter(p => p.rol === 'Veterinario' || p.cargo?.toLowerCase().includes('veterinar'));
  selV.innerHTML = '<option value="">Seleccionar veterinario...</option>' +
    vets.map(p => `<option value="${p.id_personal}">${p.nombre} ${p.paterno || ''}</option>`).join('');
  // Fecha de hoy por defecto
  document.getElementById('hFecha').value = new Date().toISOString().split('T')[0];
  abrirModal('modalHistorial');
}

async function guardarHistorial() {
  const id_animal    = parseInt(document.getElementById('hAnimal').value);
  const id_personal  = parseInt(document.getElementById('hVeterinario').value);
  const fecha        = document.getElementById('hFecha').value;
  const diagnostico  = document.getElementById('hDiagnostico').value.trim();
  const tratamiento  = document.getElementById('hTratamiento').value.trim();
  const estado_salud = document.getElementById('hEstadoSalud').value;
  const proxima      = document.getElementById('hProxima').value;

  if (!id_animal || !id_personal || !fecha || !diagnostico) {
    toast('Animal, veterinario, fecha y diagnóstico son obligatorios', 'error'); return;
  }
  try {
    const res = await apiFetch(`/historial-medico/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_animal, id_personal, fecha_revision: fecha,
        diagnostico, tratamiento, estado_salud,
        proxima_revision: proxima || null
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Registro médico guardado', 'exito');
    cerrarModal('modalHistorial');
    await cargarHistorial();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function verAnimalDesdeHistorial(id_animal) {
  mostrarSeccion('animales', null);
  setTimeout(() => verAnimal(id_animal), 100);
}

// ── MODALES ───────────────────────────────────────────────
function abrirModalAnimal()   { abrirModal('modalAnimal'); }
function abrirModalPersonal() {
  ['pNombre','pPaterno','pCargo','pEmail','pTel','pPassword','pUsername'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const selRolP = document.getElementById('pRol');
  if (selRolP) selRolP.selectedIndex = 0;
  abrirModal('modalPersonal');
}

function abrirModal(id)  { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

// ── TABS ──────────────────────────────────────────────────
function cambiarTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── NAVEGACIÓN ────────────────────────────────────────────
const titulos = {
  resumen:   ['Resumen del centro',    'Vista general de tu centro'],
  animales:  ['Animales',              'Gestión de animales de tu centro'],
  historial: ['Historial médico',      'Registros clínicos de los animales'],
  personal:  ['Mi personal',           'Gestión del equipo de trabajo'],
  usuarios:  ['Usuarios / Accesos',    'Credenciales de acceso al sistema'],
  reportes:  ['Reportes del centro',   'Estadísticas y actividad de tu centro'],
};

function mostrarSeccion(id, navEl) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`sec-${id}`).classList.add('active');
  if (navEl) navEl.classList.add('active');
  const [titulo, sub] = titulos[id] || ['', ''];
  document.getElementById('topbarTitulo').textContent = titulo;
  document.getElementById('topbarSub').textContent    = sub;
  if (id === 'usuarios') cargarUsuarios();
  if (id === 'reportes') cargarReportesCentro();
}

// ── LOGOUT ────────────────────────────────────────────────
function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = 'login_personal.html';
}

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, tipo = 'info') {
  const cont = document.getElementById('toastContainer');
  const el   = document.createElement('div');
  const svgs = {
    exito: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<span style="display:flex;align-items:center;flex-shrink:0">${svgs[tipo] || svgs.info}</span> ${msg}`;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── HELPERS ───────────────────────────────────────────────
function badgeEstadoAnimal(estado) {
  if (!estado) return '<span class="badge badge-estable">—</span>';
  const e = estado.toLowerCase();
  if (e.includes('rehabilitaci')) return `<span class="badge badge-rehab">${estado}</span>`;
  if (e.includes('tratamiento'))  return `<span class="badge badge-trat">${estado}</span>`;
  if (e.includes('liberaci'))     return `<span class="badge badge-listo">${estado}</span>`;
  return `<span class="badge badge-estable">${estado}</span>`;
}

function badgeEstadoSalud(estado) {
  if (!estado) return '—';
  const map = {
    'Crítico':    'badge-trat',
    'Estable':    'badge-estable',
    'En mejora':  'badge-rehab',
    'Recuperado': 'badge-listo',
  };
  return `<span class="badge ${map[estado] || 'badge-estable'}">${estado}</span>`;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function emptyRow(cols, msg) {
  const icon = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>';
  return `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div></td></tr>`;
}

// ── apiFetch con Bearer token ─────────────────────────────
function apiFetch(url, opts = {}) {
  const token = sessionStorage.getItem('token');
  return fetch(`${API}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    }
  });
}

// ── REPORTES DEL CENTRO ───────────────────────────────────
async function cargarReportesCentro() {
  const tbEsp  = document.getElementById('repTablaEspecie');
  const tbEst  = document.getElementById('repTablaEstado');
  const tbTipo = document.getElementById('repTablaTipo');
  const tbResc = document.getElementById('repTablaRescatesTipo');
  const tbVet  = document.getElementById('repTablaVeterinarios');

  const cargando = (cols, texto='Cargando...') =>
    `<tr><td colspan="${cols}" style="color:rgba(245,240,232,0.3);padding:1.2rem;text-align:center">${texto}</td></tr>`;

  if (tbEsp)  tbEsp.innerHTML  = cargando(4);
  if (tbEst)  tbEst.innerHTML  = cargando(2);
  if (tbTipo) tbTipo.innerHTML = cargando(2);
  if (tbResc) tbResc.innerHTML = cargando(2);
  if (tbVet)  tbVet.innerHTML  = cargando(5);

  try {
    const [vetRes, rescTipoRes] = await Promise.all([
      apiFetch(`/reportes/actividad-veterinarios?id_centro=${MI_CENTRO}`),
      apiFetch(`/reportes/rescates-tipo`),
    ]);
    const porVet      = await vetRes.json();
    const porRescTipo = await rescTipoRes.json();

    // ── 1. Especie — calculado desde animalesCentro ya cargado ──
    if (tbEsp) {
      const conteo = {};
      animalesCentro.forEach(a => {
        const esp    = getEspecie(a.id_especie);
        const nombre = esp ? esp.nombre_comun : `Especie #${a.id_especie}`;
        const tipo   = esp ? (esp.tipo || '—') : '—';
        if (!conteo[nombre]) conteo[nombre] = { nombre, tipo, cantidad: 0 };
        conteo[nombre].cantidad++;
      });
      const filas = Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad);
      const max   = Math.max(...filas.map(r => r.cantidad), 1);
      tbEsp.innerHTML = filas.length
        ? filas.map((r, i) => `
            <tr>
              <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i + 1}</td>
              <td><strong>${r.nombre}</strong></td>
              <td style="font-size:0.75rem;color:rgba(245,240,232,0.45)">${r.tipo}</td>
              <td>${barraDistribucion(r.cantidad, max, 'var(--verde-claro)')}</td>
            </tr>`).join('')
        : cargando(4, 'Sin animales registrados');
    }

    // ── 2. Estado — calculado desde animalesCentro ──
    if (tbEst) {
      const conteo = {};
      animalesCentro.forEach(a => {
        const est = a.estado_actual || 'Sin estado';
        conteo[est] = (conteo[est] || 0) + 1;
      });
      const filas = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
      const max   = Math.max(...filas.map(([, c]) => c), 1);
      tbEst.innerHTML = filas.length
        ? filas.map(([estado, cantidad]) => `
            <tr>
              <td>${badgeEstadoAnimal(estado)}</td>
              <td>${barraDistribucion(cantidad, max, 'var(--dorado)')}</td>
            </tr>`).join('')
        : cargando(2, 'Sin datos de estado');
    }

    // ── 3. Tipo de especie — calculado desde animalesCentro ──
    if (tbTipo) {
      const conteo = {};
      animalesCentro.forEach(a => {
        const esp  = getEspecie(a.id_especie);
        const tipo = esp ? (esp.tipo || 'Sin clasificar') : 'Sin clasificar';
        conteo[tipo] = (conteo[tipo] || 0) + 1;
      });
      const filas = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
      const max   = Math.max(...filas.map(([, c]) => c), 1);
      tbTipo.innerHTML = filas.length
        ? filas.map(([tipo, cantidad]) => `
            <tr>
              <td><strong>${tipo}</strong></td>
              <td>${barraDistribucion(cantidad, max, '#7db8d4')}</td>
            </tr>`).join('')
        : cargando(2, 'Sin datos de tipo');
    }

    // ── 4. Rescates por tipo de incidente — del backend (global) ──
    if (tbResc) {
      const max = Math.max(...porRescTipo.map(r => r.cantidad), 1);
      tbResc.innerHTML = porRescTipo.length
        ? porRescTipo.map(r => `
            <tr>
              <td><strong>${r.tipo_incidente}</strong></td>
              <td>${barraDistribucion(r.cantidad, max, 'var(--verde-med)')}</td>
            </tr>`).join('')
        : cargando(2, 'Sin rescates registrados');
    }

    // ── 5. Actividad veterinarios — del backend filtrado por centro ──
    if (tbVet) {
      const max = Math.max(...porVet.map(v => v.total_registros), 1);
      tbVet.innerHTML = porVet.length
        ? porVet.map((v, i) => `
            <tr>
              <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i + 1}</td>
              <td>
                <strong>${v.veterinario.trim()}</strong>
                <div style="font-size:0.72rem;color:rgba(245,240,232,0.35)">${v.centro}</div>
              </td>
              <td style="font-size:0.76rem;color:rgba(245,240,232,0.4)">${formatFecha(v.ultimo_registro)}</td>
              <td>${barraDistribucion(v.total_registros, max, 'var(--verde-med)')}</td>
              <td>
                <button class="btn-accion btn-ver" onclick="verReporteVetNombre('${v.veterinario.trim().replace(/'/g,"\'")}')">Ver reporte</button>
              </td>
            </tr>`).join('')
        : cargando(5, 'Sin actividad registrada');
    }

  } catch(e) {
    console.error('Error reportes:', e);
    const err = cargando(4, 'Error al cargar');
    if (tbEsp)  tbEsp.innerHTML  = err;
    if (tbEst)  tbEst.innerHTML  = cargando(2, 'Error al cargar');
    if (tbTipo) tbTipo.innerHTML = cargando(2, 'Error al cargar');
    if (tbResc) tbResc.innerHTML = cargando(2, 'Error al cargar');
    if (tbVet)  tbVet.innerHTML  = cargando(5, 'Error al cargar');
  }
}

// helper barra de distribución
function barraDistribucion(valor, max, color) {
  return `
    <div style="display:flex;align-items:center;gap:0.6rem">
      <div style="flex:1;height:4px;background:rgba(122,181,138,0.1);border-radius:2px">
        <div style="height:100%;width:${(valor/max)*100}%;background:${color};border-radius:2px;transition:width 0.4s"></div>
      </div>
      <span style="font-size:0.82rem;min-width:1.4rem;text-align:right">${valor}</span>
    </div>`;
}

// ── VER REPORTE DE VETERINARIO ────────────────────────────
function verReporteVetNombre(nombreVet) {
  // Buscar id_personal por nombre en personalCentro
  const vet = personalCentro.find(p =>
    `${p.nombre} ${p.paterno || ''}`.trim() === nombreVet.trim()
  );
  verReporteVet(vet ? vet.id_personal : null, nombreVet);
}

function verReporteVet(id_personal, nombreFallback) {
  const registros = historialCentro
    .filter(h => id_personal ? h.id_personal === id_personal : false)
    .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision));

  const vet = id_personal ? personalCentro.find(p => p.id_personal === id_personal) : null;
  const nombreVet = vet
    ? `${vet.nombre} ${vet.paterno || ''}`.trim()
    : (nombreFallback || registros[0]?.nombre_personal || `Personal #${id_personal}`);

  document.getElementById('modalVetTitulo').textContent  = nombreVet;
  document.getElementById('modalVetCentro').textContent  =
    document.getElementById('sidebarCentro').textContent || `Centro #${MI_CENTRO}`;
  document.getElementById('modalVetTotal').textContent   = `${registros.length} registros`;
  document.getElementById('modalVetUltimo').textContent  =
    registros.length ? formatFecha(registros[0].fecha_revision) : '—';

  if (!registros.length) {
    document.getElementById('modalVetHistorial').innerHTML =
      '<p style="color:rgba(245,240,232,0.28);font-size:0.85rem;text-align:center;padding:2rem">Sin registros médicos</p>';
  } else {
    document.getElementById('modalVetHistorial').innerHTML = registros.map(h => {
      const animal  = animalesCentro.find(a => a.id_animal === h.id_animal);
      const especie = animal ? getEspecie(animal.id_especie) : null;
      const nombreAnimal = especie ? especie.nombre_comun : `Animal #${h.id_animal}`;
      return `
        <div class="hist-item">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.4rem">
            <div class="hist-fecha">${formatFecha(h.fecha_revision)}</div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span style="font-size:0.75rem;color:rgba(245,240,232,0.4)">${nombreAnimal}</span>
              ${badgeEstadoSalud(h.estado_salud)}
            </div>
          </div>
          <div class="hist-diag">${h.diagnostico || '—'}</div>
          ${h.tratamiento ? `
            <div class="hist-trat" style="display:flex;gap:0.4rem;align-items:flex-start;margin-top:0.35rem;font-size:0.8rem;color:rgba(245,240,232,0.5)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;opacity:.6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              ${h.tratamiento}
            </div>` : ''}
          ${h.proxima_revision ? `
            <div style="font-size:0.73rem;color:rgba(245,240,232,0.3);margin-top:0.3rem">
              Próxima revisión: ${formatFecha(h.proxima_revision)}
            </div>` : ''}
        </div>`;
    }).join('');
  }

  abrirModal('modalReporteVet');
}
