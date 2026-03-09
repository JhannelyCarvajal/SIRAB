const API = 'http://127.0.0.1:8000';

const CARGOS_SISTEMA = ['administrador', 'admin', 'superadmin', 'superadministrador'];

let MI_CENTRO = null;
let usuario   = null;
let animalesCentro   = [];
let personalCentro   = [];
let historialCentro  = [];
let especiesLista    = [];
let rescatesLista    = [];
let rolesLista       = [];

document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  mostrarFecha();
  cargarTodo();

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
  await cargarEspecies();
  await Promise.all([
    cargarNombreCentro(),
    cargarAnimales(),
    cargarPersonal(),
    cargarHistorial(),
    cargarRescates(),
    cargarRoles(),
  ]);
}

async function cargarNombreCentro() {
  try {
    const res  = await fetch(`${API}/centros/${MI_CENTRO}`);
    const data = await res.json();
    document.getElementById('sidebarCentro').textContent = data.nombre;
  } catch(e) {
    document.getElementById('sidebarCentro').textContent = `Centro #${MI_CENTRO}`;
  }
}

async function cargarAnimales() {
  try {
    const res = await fetch(`${API}/animales/`);
    const todos = await res.json();
    animalesCentro = todos.filter(a => a.id_centro === MI_CENTRO);

    const rehab  = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;
    const listos = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('liberaci')).length;
    document.getElementById('statAnimales').textContent      = animalesCentro.length;
    document.getElementById('statAnimalesRehab').textContent = `${rehab} en rehabilitación`;
    document.getElementById('statListos').textContent        = listos;

    document.getElementById('tablaResumenAnimales').innerHTML =
      animalesCentro.slice(0,5).map(a => `
        <tr>
          <td>#${a.id_animal}</td>
          <td style="font-size:0.8rem">${tipoEspecie(a.id_especie)}</td>
          <td style="font-size:0.8rem"><strong>${nombreEspecie(a.id_especie)}</strong></td>
          <td>${badgeEstadoAnimal(a.estado_actual)}</td>
        </tr>
      `).join('') || emptyRow(3, 'Sin animales registrados');

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
      : emptyRow(7, 'No hay animales registrados en este centro');

  } catch(e) {
    document.getElementById('tablaAnimales').innerHTML = emptyRow(7, 'Error al cargar animales');
  }
}

async function verAnimal(id) {
  const animal = animalesCentro.find(a => a.id_animal === id);
  if (!animal) return;

  document.getElementById('modalAnimalTitulo').textContent =
    `${animal.nombre_comun || 'Animal'} #${animal.id_animal}`;
  const esp = getEspecie(animal.id_especie);
  document.getElementById('detEspecie').textContent = esp
    ? `${esp.nombre_comun}${esp.nombre_cientifico ? ' — ' + esp.nombre_cientifico : ''}`
    : `Especie #${animal.id_especie}`;
  const detTipo = document.getElementById('detTipo');
  if (detTipo) detTipo.textContent = esp ? (esp.tipo || '—') : '—';
  document.getElementById('detSexo').textContent       = animal.sexo || '—';
  document.getElementById('detPeso').textContent       = animal.peso ? `${animal.peso} kg` : '—';
  document.getElementById('detEstadoAnimal').innerHTML = badgeEstadoAnimal(animal.estado_actual);
  document.getElementById('detIngreso').textContent    = formatFecha(animal.fecha_ingreso);
  document.getElementById('detNacimiento').textContent = formatFecha(animal.fecha_nacimiento_aprox);
  document.getElementById('detObs').textContent        = animal.observaciones || '—';

  const histAnimal = historialCentro.filter(h => h.id_animal === id);
  document.getElementById('historialAnimal').innerHTML = histAnimal.length
    ? histAnimal.map(h => `
        <div class="hist-item">
          <div class="hist-fecha">${formatFecha(h.fecha_revision)}</div>
          <div class="hist-diag">${h.diagnostico}</div>
          <div class="hist-trat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;opacity:.6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            ${h.tratamiento}
          </div>
          <div class="hist-estado">${badgeEstadoSalud(h.estado_salud)}</div>
        </div>
      `).join('')
    : '<p style="color:rgba(245,240,232,0.3);font-size:0.85rem;text-align:center;padding:2rem">Sin registros médicos</p>';

  cambiarTab('tabDatos', document.querySelector('.tab-btn'));
  abrirModal('modalVerAnimal');
}

async function cargarPersonal() {
  try {
    const res   = await fetch(`${API}/personal/`);
    const todos = await res.json();

    personalCentro = todos.filter(p =>
      p.id_centro === MI_CENTRO &&
      !CARGOS_SISTEMA.includes((p.cargo || '').toLowerCase().trim())
    );

    const activos = personalCentro.filter(p => p.estado !== false).length;
    document.getElementById('statPersonal').textContent       = personalCentro.length;
    document.getElementById('statPersonalActivo').textContent = `${activos} activos`;

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

async function cargarHistorial() {
  try {
    const res  = await fetch(`${API}/historial_medico/`);
    const todo = await res.json();

    const idsAnimalesCentro = animalesCentro.map(a => a.id_animal);
    historialCentro = todo.filter(h => idsAnimalesCentro.includes(h.id_animal));

    document.getElementById('statHistorial').textContent = historialCentro.length;

    document.getElementById('tablaHistorial').innerHTML = historialCentro.length
      ? historialCentro.map(h => `
          <tr>
            <td style="font-size:0.78rem">${formatFecha(h.fecha_revision)}</td>
            <td>Animal #${h.id_animal}</td>
            <td style="font-size:0.78rem">${h.nombre_personal || `Personal #${h.id_personal}`}</td>
            <td style="font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.diagnostico}</td>
            <td>${badgeEstadoSalud(h.estado_salud)}</td>
            <td>
              <button class="btn-accion btn-ver" onclick="verAnimalDesdeHistorial(${h.id_animal})">Ver animal</button>
            </td>
          </tr>
        `).join('')
      : emptyRow(6, 'No hay registros médicos');

  } catch(e) {
    document.getElementById('tablaHistorial').innerHTML = emptyRow(6, 'Error al cargar historial');
  }
}

async function cargarEspecies() {
  try {
    const res = await fetch(`${API}/especies/`);
    especiesLista = await res.json();
    document.getElementById('anEspecie').innerHTML =
      '<option value="">Seleccionar especie...</option>' +
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
    const res = await fetch(`${API}/rescates/`);
    rescatesLista = await res.json();
    document.getElementById('anRescate').innerHTML =
      '<option value="">Seleccionar rescate...</option>' +
      rescatesLista.map(r => `<option value="${r.id_rescate}">#${r.id_rescate} — ${r.tipo_incidente} (${formatFecha(r.fecha_rescate)})</option>`).join('');
  } catch(e) {}
}

async function cargarRoles() {
  try {
    const res = await fetch(`${API}/roles/`);
    rolesLista = await res.json();
    const rolesPersonal = rolesLista.filter(r =>
      ['Veterinario', 'Operador', 'Administrador'].includes(r.nombre)
    );
    document.getElementById('uRol').innerHTML =
      '<option value="">Seleccionar rol...</option>' +
      rolesPersonal.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
    const selRolP = document.getElementById('pRol');
    if (selRolP) {
      selRolP.innerHTML = '<option value="">Seleccionar...</option>' +
        rolesPersonal.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
    }
  } catch(e) {}
}

async function guardarAnimal() {
  const id_especie            = parseInt(document.getElementById('anEspecie').value);
  const id_rescate            = parseInt(document.getElementById('anRescate').value);
  const sexo                  = document.getElementById('anSexo').value;
  const peso                  = parseFloat(document.getElementById('anPeso').value);
  const fecha_ingreso         = document.getElementById('anIngreso').value;
  const fecha_nacimiento_aprox = document.getElementById('anNacimiento').value;
  const estado_actual         = document.getElementById('anEstado').value;
  const observaciones         = document.getElementById('anObs').value;

  if (!id_especie || !sexo || !fecha_ingreso || !estado_actual) {
    toast('Completa los campos obligatorios', 'error'); return;
  }
  try {
    const res = await fetch(`${API}/animales/`, {
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

async function guardarPersonal() {
  const nombre   = document.getElementById('pNombre').value.trim();
  const paterno  = document.getElementById('pPaterno').value.trim();
  const cargo    = document.getElementById('pCargo').value.trim();
  const email    = document.getElementById('pEmail').value.trim();
  const telefono = document.getElementById('pTel').value.trim();
  const password = document.getElementById('pPassword').value;
  const username = document.getElementById('pUsername').value.trim();
  const id_rol   = parseInt(document.getElementById('pRol').value);

  if (!nombre || !cargo || !password || !username || !id_rol) {
    toast('Nombre, cargo, usuario y contraseña son obligatorios', 'error'); return;
  }
  if (CARGOS_SISTEMA.includes(cargo.toLowerCase().trim())) {
    toast('No se puede registrar personal con cargo administrativo del sistema', 'error'); return;
  }

  try {
    const resPersonal = await fetch(`${API}/personal/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, paterno, cargo, email, telefono,
        password, id_centro: MI_CENTRO, estado: true
      })
    });
    if (!resPersonal.ok) {
      const err = await resPersonal.json();
      throw new Error('Personal: ' + (err.detail || 'Error al registrar'));
    }
    const nuevoPersonal = await resPersonal.json();
    const id_personal   = nuevoPersonal.id_personal;

    if (!id_personal) throw new Error('No se recibió el ID del personal creado');

    const resUsuario = await fetch(`${API}/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, id_personal, id_rol, estado: true })
    });
    if (!resUsuario.ok) {
      const err = await resUsuario.json();
      throw new Error('Usuario: ' + (err.detail || 'Error al crear acceso'));
    }

    toast(`Personal "${nombre}" registrado con acceso al sistema ✓`, 'exito');
    cerrarModal('modalPersonal');
    await cargarPersonal();

  } catch(e) {
    toast(e.message, 'error');
  }
}

async function togglePersonal(id, estadoActual) {
  try {
    const p = personalCentro.find(x => x.id_personal === id);
    if (!p) return;
    const res = await fetch(`${API}/personal/${id}`, {
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

async function abrirModalUsuario() {
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
    const res = await fetch(`${API}/usuarios/`, {
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
    const res  = await fetch(`${API}/usuarios/`);
    const todos = await res.json();
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
    const res = await fetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    toast('Usuario eliminado', 'exito');
    await cargarUsuarios();
  } catch(e) {
    toast('Error al eliminar', 'error');
  }
}

function verAnimalDesdeHistorial(id_animal) {
  mostrarSeccion('animales', null);
  setTimeout(() => verAnimal(id_animal), 100);
}

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
function abrirModal(id)       { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id)      { document.getElementById(id).classList.remove('visible'); }

function cambiarTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (btn) btn.classList.add('active');
}

const titulos = {
  resumen:   ['Resumen del centro',  'Vista general de tu centro'],
  animales:  ['Animales',            'Gestión de animales de tu centro'],
  reportes:  ['Reportes del centro', 'Estadísticas y actividad de tu centro'],
  personal:  ['Mi personal',         'Gestión del equipo de trabajo'],
  usuarios:  ['Usuarios / Accesos',  'Credenciales de acceso al sistema'],
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
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = 'login_personal.html';
}

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
    'Crítico':   'badge-trat',
    'Estable':   'badge-estable',
    'En mejora': 'badge-rehab',
    'Recuperado':'badge-listo',
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

async function cargarReportesCentro() {
  try {
    const [espRes, estadoRes, vetRes] = await Promise.all([
      fetch(`${API}/reportes/animales-especie`),
      fetch(`${API}/reportes/animales-estado`),
      fetch(`${API}/reportes/actividad-veterinarios`),
    ]);
    const porEspecie = await espRes.json();
    const porEstado  = await estadoRes.json();
    const porVet     = await vetRes.json();

    const espCentro = porEspecie;
    const estCentro = porEstado;

    const tbEsp = document.getElementById('repTablaEspecie');
    if (tbEsp) {
      const max = Math.max(...espCentro.map(r => r.cantidad), 1);
      tbEsp.innerHTML = espCentro.length
        ? espCentro.map((r, i) => `
            <tr>
              <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i+1}</td>
              <td><strong>${r.especie}</strong></td>
              <td style="font-size:0.75rem;color:rgba(245,240,232,0.45)">${r.tipo || '—'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.6rem">
                  <div style="flex:1;height:4px;background:rgba(122,181,138,0.1);border-radius:2px">
                    <div style="height:100%;width:${(r.cantidad/max)*100}%;background:var(--verde-claro);border-radius:2px"></div>
                  </div>
                  <span style="font-size:0.82rem;min-width:1.2rem;text-align:right">${r.cantidad}</span>
                </div>
              </td>
            </tr>`).join('')
        : emptyRow(4, 'Sin datos');
    }

    const tbEst = document.getElementById('repTablaEstado');
    if (tbEst) {
      const max = Math.max(...estCentro.map(r => r.cantidad), 1);
      tbEst.innerHTML = estCentro.length
        ? estCentro.map(r => `
            <tr>
              <td>${badgeEstadoAnimal(r.estado_actual)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.6rem">
                  <div style="flex:1;height:4px;background:rgba(122,181,138,0.1);border-radius:2px">
                    <div style="height:100%;width:${(r.cantidad/max)*100}%;background:var(--dorado);border-radius:2px"></div>
                  </div>
                  <span style="font-size:0.82rem;min-width:1.2rem;text-align:right">${r.cantidad}</span>
                </div>
              </td>
            </tr>`).join('')
        : emptyRow(2, 'Sin datos');
    }

    const tbVet = document.getElementById('repTablaVeterinarios');
    if (tbVet) {
      const vetsCentro = porVet.filter(v =>
        v.centro && animalesCentro.length > 0
          ? true 
          : true
      );
      const max = Math.max(...vetsCentro.map(v => v.total_registros), 1);
      tbVet.innerHTML = vetsCentro.length
        ? vetsCentro.map((v, i) => `
            <tr>
              <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i+1}</td>
              <td>
                <strong>${v.veterinario.trim()}</strong>
                <div style="font-size:0.72rem;color:rgba(245,240,232,0.35)">${v.centro}</div>
              </td>
              <td style="font-size:0.76rem;color:rgba(245,240,232,0.4)">${formatFecha(v.ultimo_registro)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.6rem">
                  <div style="flex:1;height:4px;background:rgba(122,181,138,0.1);border-radius:2px">
                    <div style="height:100%;width:${(v.total_registros/max)*100}%;background:var(--verde-med);border-radius:2px"></div>
                  </div>
                  <span style="font-size:0.82rem;min-width:1.2rem;text-align:right">${v.total_registros}</span>
                </div>
              </td>
              <td>
                <button class="btn-accion btn-ver" onclick='verReporteVet(${JSON.stringify(v)})'>Ver reporte</button>
              </td>
            </tr>`).join('')
        : emptyRow(4, 'Sin actividad registrada');
    }

  } catch(e) {
    console.error('Error cargando reportes:', e);
  }
}

function badgeEstadoAnimal(estado) {
  if (!estado) return '<span class="badge">—</span>';
  const e = estado.toLowerCase();
  if (e.includes('rehabilitaci')) return `<span class="badge badge-rehab">${estado}</span>`;
  if (e.includes('tratamiento'))  return `<span class="badge badge-trat">${estado}</span>`;
  if (e.includes('liberaci') || e.includes('listo')) return `<span class="badge badge-listo">${estado}</span>`;
  return `<span class="badge badge-estable">${estado}</span>`;
}

async function verReporteVet(vet) {
  document.getElementById('modalVetTitulo').textContent  = vet.veterinario.trim();
  document.getElementById('modalVetCentro').textContent  = vet.centro;
  document.getElementById('modalVetTotal').textContent   = vet.total_registros + ' registros';
  document.getElementById('modalVetUltimo').textContent  = formatFecha(vet.ultimo_registro);
  document.getElementById('modalVetHistorial').innerHTML = '<p style="color:rgba(245,240,232,0.3);font-size:0.85rem">Cargando...</p>';
  abrirModal('modalReporteVet');

  try {
    const [histRes, animalesRes] = await Promise.all([
      fetch(`${API}/historial_medico/`),
      fetch(`${API}/animales/`),
    ]);
    const todoHistorial = await histRes.json();
    const animales      = await animalesRes.json();


    const vetPersonal = personalCentro.find(p =>
      (`${p.nombre} ${p.paterno || ''}`).trim() === vet.veterinario.trim()
    );

    const histVet = todoHistorial
      .filter(h => vetPersonal ? h.id_personal === vetPersonal.id_personal : false)
      .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision));

    if (!histVet.length) {
      document.getElementById('modalVetHistorial').innerHTML =
        '<p style="color:rgba(245,240,232,0.28);font-size:0.85rem;text-align:center;padding:2rem">Sin registros médicos encontrados</p>';
      return;
    }

    document.getElementById('modalVetHistorial').innerHTML = histVet.map(h => {
      const animal  = animales.find(a => a.id_animal === h.id_animal);
      const especie = animal ? especiesLista.find(e => e.id_especie === animal.id_especie) : null;
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
          <div class="hist-diag">${h.diagnostico}</div>
          ${h.tratamiento ? `<div class="hist-trat" style="display:flex;gap:0.4rem;align-items:flex-start;margin-top:0.35rem;font-size:0.8rem;color:rgba(245,240,232,0.5)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;opacity:.6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            ${h.tratamiento}</div>` : ''}
          ${h.proxima_revision ? `<div style="font-size:0.73rem;color:rgba(245,240,232,0.3);margin-top:0.3rem">
            Próxima revisión: ${formatFecha(h.proxima_revision)}</div>` : ''}
        </div>`;
    }).join('');

  } catch(e) {
    document.getElementById('modalVetHistorial').innerHTML =
      '<p style="color:#f0a09a;font-size:0.85rem">Error al cargar el historial</p>';
  }
}

function badgeEstadoSalud(estado) {
  if (!estado) return '';
  const map = { 'Crítico':'badge-trat','Estable':'badge-estable','En mejora':'badge-rehab','Recuperado':'badge-listo' };
  return `<span class="badge ${map[estado] || 'badge-estable'}" style="font-size:0.68rem">${estado}</span>`;
}
