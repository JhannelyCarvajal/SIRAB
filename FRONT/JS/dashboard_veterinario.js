const API = 'http://127.0.0.1:8000';

let MI_CENTRO   = null;
let MI_ID       = null;
let usuario     = null;

let animalesCentro = [];
let misAnimales    = [];
let historialMio   = [];
let rescatesCentro = [];
let especiesLista  = [];
let miPerfil       = null;

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
  MI_ID     = usuario?.id_personal || null;

  if (!usuario || rol !== 'Veterinario') {
    window.location.href = 'login_personal.html';
    return;
  }
  document.getElementById('sidebarNombre').textContent =
    usuario.nombre_personal || usuario.nombre || usuario.username || '—';
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
    cargarAnimalesYHistorial(),
    cargarRescates(),
    cargarPerfil(),
  ]);
}

async function cargarNombreCentro() {
  try {
    const res  = await fetch(`${API}/centros/${MI_CENTRO}`);
    const data = await res.json();
    document.getElementById('sidebarCentro').textContent = data.nombre;
    const el = document.getElementById('perfilCentro');
    if (el) el.textContent = data.nombre;
  } catch(e) {
    document.getElementById('sidebarCentro').textContent = `Centro #${MI_CENTRO}`;
  }
}
async function cargarAnimalesYHistorial() {
  try {
    const [animalesRes, historialRes] = await Promise.all([
      fetch(`${API}/animales/`),
      fetch(`${API}/historial_medico/`),
    ]);
    const todosAnimales = await animalesRes.json();
    const todoHistorial = await historialRes.json();

    animalesCentro = todosAnimales.filter(a => a.id_centro === MI_CENTRO);
    historialMio   = todoHistorial.filter(h => h.id_personal === MI_ID);

    const idsAnimalesMios = [...new Set(historialMio.map(h => h.id_animal))];
    misAnimales = animalesCentro.filter(a => idsAnimalesMios.includes(a.id_animal));

    renderStats();
    renderAnimales();
    renderHistorial();
  } catch(e) {
    console.error('Error cargando animales/historial:', e);
  }
}

function renderStats() {
  const rehab    = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;
  const criticos = historialMio.filter(h => h.estado_salud === 'Crítico').length;

  document.getElementById('statMisAnimales').textContent = misAnimales.length;
  document.getElementById('statTotalCentro').textContent = animalesCentro.length;
  document.getElementById('statHistorial').textContent   = historialMio.length;
  document.getElementById('statRehab').textContent       = `${rehab} en rehabilitación`;
  document.getElementById('statCriticos').textContent    = criticos;

  const tbResumen = document.getElementById('tablaResumenMisAnimales');
  if (tbResumen) {
    tbResumen.innerHTML = misAnimales.slice(0, 5).map(a => `
      <tr>
        <td style="font-size:0.75rem;color:rgba(245,240,232,0.4)">${tipoEspecie(a.id_especie)}</td>
        <td><strong>${nombreEspecie(a.id_especie)}</strong></td>
        <td>${badgeEstadoAnimal(a.estado_actual)}</td>
      </tr>`).join('') || emptyRow(3, 'Aún no tienes animales con historial tuyo');
  }

  const tbHist = document.getElementById('tablaResumenHistorial');
  if (tbHist) {
    tbHist.innerHTML = [...historialMio]
      .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision))
      .slice(0, 5)
      .map(h => {
        const animal = animalesCentro.find(a => a.id_animal === h.id_animal);
        return `<tr>
          <td style="font-size:0.78rem">${formatFecha(h.fecha_revision)}</td>
          <td>${animal ? nombreEspecie(animal.id_especie) : 'Animal #' + h.id_animal}</td>
          <td>${badgeEstadoSalud(h.estado_salud)}</td>
        </tr>`;
      }).join('') || emptyRow(3, 'Sin registros médicos');
  }
}

function renderAnimales() {
  const tbody = document.getElementById('tablaAnimales');
  if (!tbody) return;

  if (!animalesCentro.length) {
    tbody.innerHTML = emptyRow(7, 'No hay animales registrados en este centro');
    return;
  }
  tbody.innerHTML = animalesCentro.map(a => {
    const esMio   = misAnimales.some(m => m.id_animal === a.id_animal);
    const ultimoH = historialMio
      .filter(h => h.id_animal === a.id_animal)
      .sort((x, y) => new Date(y.fecha_revision) - new Date(x.fecha_revision))[0];
    return `
      <tr>
        <td style="color:rgba(245,240,232,0.3);font-size:0.78rem">#${a.id_animal}</td>
        <td style="font-size:0.78rem;color:rgba(245,240,232,0.45)">${tipoEspecie(a.id_especie)}</td>
        <td>
          <strong>${nombreEspecie(a.id_especie)}</strong>
          ${esMio ? '<span class="badge-mio">mío</span>' : ''}
        </td>
        <td>${a.sexo || '—'}</td>
        <td>${badgeEstadoAnimal(a.estado_actual)}</td>
        <td style="font-size:0.76rem;color:rgba(245,240,232,0.4)">
          ${ultimoH ? formatFecha(ultimoH.fecha_revision) : '—'}
        </td>
        <td>
          <button class="btn-accion btn-ver"    onclick="verAnimal(${a.id_animal})">Ver</button>
          <button class="btn-accion btn-editar" onclick="abrirModalEstado(${a.id_animal})">Estado</button>
        </td>
      </tr>`;
  }).join('');
}

function verAnimal(id) {
  const animal = animalesCentro.find(a => a.id_animal === id);
  if (!animal) return;

  const esp = getEspecie(animal.id_especie);
  document.getElementById('modalAnimalTitulo').textContent =
    `${esp ? esp.nombre_comun : 'Animal'} #${animal.id_animal}`;
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

  const histAnimal = historialMio
    .filter(h => h.id_animal === id)
    .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision));

  document.getElementById('historialAnimal').innerHTML = histAnimal.length
    ? histAnimal.map(h => `
        <div class="hist-item">
          <div class="hist-fecha">${formatFecha(h.fecha_revision)}</div>
          <div class="hist-diag">${h.diagnostico}</div>
          ${h.tratamiento ? `<div class="hist-trat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            ${h.tratamiento}</div>` : ''}
          <div class="hist-estado">${badgeEstadoSalud(h.estado_salud)}</div>
        </div>`).join('')
    : '<p style="color:rgba(245,240,232,0.28);font-size:0.85rem;text-align:center;padding:2.5rem">Sin registros médicos tuyos para este animal</p>';

  document.querySelectorAll('#modalVerAnimal .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('#modalVerAnimal .tab-content').forEach((t, i) => t.classList.toggle('active', i === 0));
  abrirModal('modalVerAnimal');
}

function abrirModalEstado(id) {
  const animal = animalesCentro.find(a => a.id_animal === id);
  if (!animal) return;
  const esp = getEspecie(animal.id_especie);
  document.getElementById('estadoAnimalNombre').textContent =
    `${esp ? esp.nombre_comun : 'Animal'} #${animal.id_animal}`;
  document.getElementById('nuevoEstado').value = animal.estado_actual || '';
  document.getElementById('nuevoPeso').value   = animal.peso || '';
  document.getElementById('estadoObs').value   = animal.observaciones || '';
  document.getElementById('btnGuardarEstado').onclick = () => guardarEstadoAnimal(id);
  abrirModal('modalEstado');
}

async function guardarEstadoAnimal(id) {
  const animal        = animalesCentro.find(a => a.id_animal === id);
  const estado_actual = document.getElementById('nuevoEstado').value;
  const peso          = parseFloat(document.getElementById('nuevoPeso').value) || null;
  const observaciones = document.getElementById('estadoObs').value.trim();

  if (!estado_actual) { toast('Selecciona un estado', 'error'); return; }
  try {
    const res = await fetch(`${API}/animales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_especie: animal.id_especie, id_centro: animal.id_centro,
        id_rescate: animal.id_rescate || null, sexo: animal.sexo,
        peso, fecha_ingreso: animal.fecha_ingreso,
        fecha_nacimiento_aprox: animal.fecha_nacimiento_aprox || null,
        estado_actual, observaciones,
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Estado actualizado correctamente', 'exito');
    cerrarModal('modalEstado');
    await cargarAnimalesYHistorial();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function renderHistorial() {
  const tbody = document.getElementById('tablaHistorial');
  if (!tbody) return;
  if (!historialMio.length) {
    tbody.innerHTML = emptyRow(6, 'No has registrado entradas en el historial médico');
    return;
  }
  tbody.innerHTML = [...historialMio]
    .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision))
    .map(h => {
      const animal = animalesCentro.find(a => a.id_animal === h.id_animal);
      return `
        <tr>
          <td style="font-size:0.78rem">${formatFecha(h.fecha_revision)}</td>
          <td>
            <strong>${animal ? nombreEspecie(animal.id_especie) : 'Animal #' + h.id_animal}</strong>
            ${animal ? `<div style="font-size:0.72rem;color:rgba(245,240,232,0.35)">${tipoEspecie(animal.id_especie)}</div>` : ''}
          </td>
          <td style="font-size:0.78rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${h.diagnostico}
          </td>
          <td>${badgeEstadoSalud(h.estado_salud)}</td>
          <td style="font-size:0.76rem;color:rgba(245,240,232,0.4)">
            ${h.proxima_revision ? formatFecha(h.proxima_revision) : '—'}
          </td>
          <td>
            <button class="btn-accion btn-ver" onclick="verAnimal(${h.id_animal})">Ver animal</button>
          </td>
        </tr>`;
    }).join('');
}

function abrirModalHistorial(preseleccionId = null) {
  const selA = document.getElementById('hAnimal');
  selA.innerHTML = '<option value="">Seleccionar animal...</option>' +
    animalesCentro.map(a => {
      const esp   = getEspecie(a.id_especie);
      const label = esp
        ? `${esp.nombre_comun} (${esp.tipo || ''}) — ${a.sexo || '?'}`
        : `Animal #${a.id_animal} — ${a.sexo || '?'}`;
      return `<option value="${a.id_animal}">${label}</option>`;
    }).join('');

  if (preseleccionId) selA.value = preseleccionId;
  document.getElementById('hFecha').value       = new Date().toISOString().split('T')[0];
  document.getElementById('hDiagnostico').value = '';
  document.getElementById('hTratamiento').value = '';
  document.getElementById('hProxima').value     = '';
  document.getElementById('hEstadoSalud').value = 'Estable';
  abrirModal('modalHistorial');
}

async function guardarHistorial() {
  const id_animal    = parseInt(document.getElementById('hAnimal').value);
  const fecha        = document.getElementById('hFecha').value;
  const diagnostico  = document.getElementById('hDiagnostico').value.trim();
  const tratamiento  = document.getElementById('hTratamiento').value.trim();
  const estado_salud = document.getElementById('hEstadoSalud').value;
  const proxima      = document.getElementById('hProxima').value;

  if (!id_animal || !fecha || !diagnostico) {
    toast('Animal, fecha y diagnóstico son obligatorios', 'error'); return;
  }
  try {
    const res = await fetch(`${API}/historial_medico/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_animal, id_personal: MI_ID, fecha_revision: fecha,
        diagnostico, tratamiento, estado_salud,
        proxima_revision: proxima || null,
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Registro médico guardado', 'exito');
    cerrarModal('modalHistorial');
    await cargarAnimalesYHistorial();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function cargarRescates() {
  try {
    const res = await fetch(`${API}/rescates/`);
    rescatesCentro = await res.json();
    document.getElementById('tablaRescates').innerHTML = rescatesCentro.length
      ? rescatesCentro.map(r => `
          <tr>
            <td style="color:rgba(245,240,232,0.3)">#${r.id_rescate}</td>
            <td style="font-size:0.78rem">${formatFecha(r.fecha_rescate)}</td>
            <td>${r.tipo_incidente || '—'}</td>
            <td style="font-size:0.78rem">${r.ubicacion || '—'}</td>
            <td>${r.especie_reportada || '—'}</td>
            <td>${badgeEstadoRescate(r.estado)}</td>
          </tr>`).join('')
      : emptyRow(6, 'No hay rescates registrados');
  } catch(e) {
    document.getElementById('tablaRescates').innerHTML = emptyRow(6, 'Error al cargar rescates');
  }
}

async function cargarPerfil() {
  if (!MI_ID) return;
  try {
    const res = await fetch(`${API}/personal/${MI_ID}`);
    if (!res.ok) throw new Error('No encontrado');
    miPerfil = await res.json();
    renderPerfil();
  } catch(e) {
    console.error('Error cargando perfil:', e);
  }
}

function renderPerfil() {
  if (!miPerfil) return;
  const nombre = [miPerfil.nombre, miPerfil.paterno, miPerfil.materno]
    .filter(Boolean).join(' ') || '—';

  document.getElementById('perfilNombreCompleto').textContent = nombre;
  document.getElementById('perfilCargo').textContent    = miPerfil.cargo || '—';
  document.getElementById('perfilEmail').textContent    = miPerfil.email || '—';
  document.getElementById('perfilTelefono').textContent = miPerfil.telefono || '—';
  document.getElementById('perfilEstado').innerHTML =
    miPerfil.estado !== false
      ? '<span class="badge badge-activo">Activo</span>'
      : '<span class="badge badge-inactivo">Inactivo</span>';
}

function activarEdicionPerfil() {
  if (!miPerfil) return;
  document.getElementById('vistaPerfil').style.display = 'none';
  document.getElementById('editPerfil').style.display  = 'block';
  document.getElementById('editNombre').value   = miPerfil.nombre   || '';
  document.getElementById('editPaterno').value  = miPerfil.paterno  || '';
  document.getElementById('editMaterno').value  = miPerfil.materno  || '';
  document.getElementById('editEmail').value    = miPerfil.email    || '';
  document.getElementById('editTelefono').value = miPerfil.telefono || '';
  document.getElementById('editPassword').value = '';
}

function cancelarEdicionPerfil() {
  document.getElementById('vistaPerfil').style.display = 'block';
  document.getElementById('editPerfil').style.display  = 'none';
}

async function guardarPerfil() {
  const nombre   = document.getElementById('editNombre').value.trim();
  const paterno  = document.getElementById('editPaterno').value.trim();
  const materno  = document.getElementById('editMaterno').value.trim();
  const email    = document.getElementById('editEmail').value.trim();
  const telefono = document.getElementById('editTelefono').value.trim();
  const password = document.getElementById('editPassword').value;

  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const body = { ...miPerfil, nombre, paterno, materno, email, telefono };
  if (password) body.password = password;

  try {
    const res = await fetch(`${API}/personal/${MI_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error al guardar');
    miPerfil = { ...miPerfil, nombre, paterno, materno, email, telefono };
    renderPerfil();
    cancelarEdicionPerfil();
    toast('Perfil actualizado correctamente', 'exito');
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function cargarEspecies() {
  try {
    const res = await fetch(`${API}/especies/`);
    especiesLista = await res.json();
  } catch(e) {}
}
function getEspecie(id_especie) {
  return especiesLista.find(e => e.id_especie === id_especie) || null;
}
function nombreEspecie(id_especie) {
  const e = getEspecie(id_especie);
  return e ? e.nombre_comun : (id_especie ? `Especie #${id_especie}` : '—');
}
function tipoEspecie(id_especie) {
  const e = getEspecie(id_especie);
  return e ? (e.tipo || '—') : '—';
}

function abrirModal(id)  { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

function cambiarTab(tabId, btn) {
  const modal = document.getElementById(tabId)?.closest('.modal');
  if (modal) {
    modal.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  }
  document.getElementById(tabId).classList.add('active');
  if (btn) btn.classList.add('active');
}

const titulos = {
  resumen:   ['Mi resumen',          'Vista general de tu actividad'],
  animales:  ['Animales del centro', 'Todos los animales bajo tu cuidado'],
  historial: ['Mi historial médico', 'Registros clínicos que has creado'],
  rescates:  ['Rescates del centro', 'Operativos de rescate registrados'],
  perfil:    ['Mi perfil',           'Tus datos personales'],
};

function mostrarSeccion(id, navEl) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`sec-${id}`).classList.add('active');
  if (navEl) navEl.classList.add('active');
  const [titulo, sub] = titulos[id] || ['', ''];
  document.getElementById('topbarTitulo').textContent = titulo;
  document.getElementById('topbarSub').textContent    = sub;
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
  const map = { 'Crítico':'badge-trat','Estable':'badge-estable','En mejora':'badge-rehab','Recuperado':'badge-listo' };
  return `<span class="badge ${map[estado] || 'badge-estable'}">${estado}</span>`;
}
function badgeEstadoRescate(estado) {
  if (!estado) return '—';
  const map = { 'pendiente':'badge-trat','en proceso':'badge-rehab','completado':'badge-listo','cancelado':'badge-inactivo' };
  return `<span class="badge ${map[estado?.toLowerCase()] || 'badge-estable'}">${estado}</span>`;
}
function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}
function emptyRow(cols, msg) {
  const icon = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>';
  return `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div></td></tr>`;
}
