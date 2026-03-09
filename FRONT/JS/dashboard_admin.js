const API = 'http://127.0.0.1:8000';

let centroActual = null;
let todosLosCentros = [];

document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  mostrarFecha();
  cargarTodo();
});

function verificarSesion() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  const rol     = sessionStorage.getItem('rol');

  if (!usuario || rol !== 'Admin') {
    window.location.href = 'login_personal.html';
    return;
  }
  document.getElementById('sidebarNombre').textContent =
    usuario.nombre_personal || usuario.username;
}

function mostrarFecha() {
  const ahora = new Date();
  document.getElementById('topbarFecha').textContent =
    ahora.toLocaleDateString('es-BO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

async function cargarTodo() {
  await Promise.all([
    cargarEstadisticas(),
    cargarCentros(),
    cargarUsuarios(),
    cargarRoles(),
  ]);
}

async function cargarEstadisticas() {
  try {
    const [centrosRes, personalRes, animalesRes] = await Promise.all([
      fetch(`${API}/centros/`),
      fetch(`${API}/personal/`),
      fetch(`${API}/animales/`),
    ]);
    const centros  = await centrosRes.json();
    const personal = await personalRes.json();
    const animales = await animalesRes.json();

    const aprobados  = centros.filter(c => c.estado === 'aprobado').length;
    const pendientes = centros.filter(c => c.estado === 'pendiente').length;
    const rehab      = animales.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;
    const activos    = personal.filter(p => p.estado !== false).length;

    document.getElementById('statCentros').textContent          = centros.length;
    document.getElementById('statCentrosAprobados').textContent = `${aprobados} aprobados`;
    document.getElementById('statAnimales').textContent         = animales.length;
    document.getElementById('statAnimalesActivos').textContent  = `${rehab} en rehabilitación`;
    document.getElementById('statPersonal').textContent         = personal.length;
    document.getElementById('statPersonalActivo').textContent   = `${activos} activos`;
    document.getElementById('statPendientes').textContent       = pendientes;
    document.getElementById('badgePendientes').textContent      = pendientes;

    const ultimos = [...centros].reverse().slice(0, 5);
    document.getElementById('tablaResumen').innerHTML = ultimos.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.departamento}</td>
        <td>${badgeEstado(c.estado)}</td>
      </tr>
    `).join('') || emptyRow(3, 'Sin centros registrados');

    const porDepto = {};
    centros.forEach(c => {
      if (c.nombre === 'SIRAB Central') return;
      porDepto[c.departamento] = (porDepto[c.departamento] || 0) + 1;
    });
    const max = Math.max(...Object.values(porDepto), 1);
    document.getElementById('distDepto').innerHTML = Object.entries(porDepto)
      .sort((a,b) => b[1]-a[1])
      .map(([depto, cant]) => `
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;">
            <span style="font-size:0.82rem;color:var(--crema)">${depto}</span>
            <span style="font-size:0.78rem;color:var(--verde-claro)">${cant} centro${cant>1?'s':''}</span>
          </div>
          <div style="height:4px;background:rgba(122,181,138,0.1);border-radius:2px;">
            <div style="height:100%;width:${(cant/max)*100}%;background:var(--verde-claro);border-radius:2px;transition:width 0.8s ease;"></div>
          </div>
        </div>
      `).join('') || '<p style="color:rgba(245,240,232,0.3);font-size:0.85rem;">Sin datos</p>';

  } catch(e) {
    console.error('Error estadísticas:', e);
  }
}

async function cargarCentros() {
  try {
    const res = await fetch(`${API}/centros/`);
    todosLosCentros = await res.json();

    const visibles = todosLosCentros.filter(c => c.estado !== 'rechazado');
    document.getElementById('totalCentros').textContent = `${visibles.length} centros`;

    renderTablaCentros(visibles);
    renderTablaPendientes(visibles.filter(c => c.estado === 'pendiente'));

  } catch(e) {
    document.getElementById('tablaCentros').innerHTML  = emptyRow(6, 'Error al cargar centros');
    document.getElementById('tablaPendientes').innerHTML = emptyRow(5, 'Error al cargar');
  }
}

function renderTablaCentros(centros) {
  document.getElementById('tablaCentros').innerHTML = centros.length
    ? centros.map(c => `
        <tr>
          <td><strong>${c.nombre}</strong></td>
          <td>${c.departamento}</td>
          <td style="font-size:0.78rem">${c.email || '—'}</td>
          <td style="font-size:0.78rem">${c.telefono || '—'}</td>
          <td>${badgeEstado(c.estado)}</td>
          <td>
            <button class="btn-accion btn-ver" onclick="verCentro(${c.id_centro})">Ver</button>
            ${c.estado !== 'aprobado'  ? `<button class="btn-accion btn-aprobar"  onclick="cambiarEstado(${c.id_centro},'aprobado')">Aprobar</button>`  : ''}
            ${c.estado !== 'rechazado' ? `<button class="btn-accion btn-rechazar" onclick="cambiarEstado(${c.id_centro},'rechazado')">Rechazar</button>` : ''}
          </td>
        </tr>
      `).join('')
    : emptyRow(6, 'No hay centros registrados');
}

function renderTablaPendientes(pendientes) {
  document.getElementById('totalPendientes').textContent = `${pendientes.length} pendientes`;
  document.getElementById('tablaPendientes').innerHTML = pendientes.length
    ? pendientes.map(c => `
        <tr>
          <td><strong>${c.nombre}</strong></td>
          <td>${c.departamento}</td>
          <td style="font-size:0.78rem">${c.email || '—'}</td>
          <td style="font-size:0.75rem;color:rgba(245,240,232,0.4)">${formatFecha(c.fecha_registro)}</td>
          <td>
            <button class="btn-accion btn-ver"      onclick="verCentro(${c.id_centro})">Detalle</button>
            <button class="btn-accion btn-aprobar"  onclick="cambiarEstado(${c.id_centro},'aprobado')">✓ Aprobar</button>
            <button class="btn-accion btn-rechazar" onclick="cambiarEstado(${c.id_centro},'rechazado')">✗ Rechazar</button>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon"> </div><p>No hay solicitudes pendientes</p></div></td></tr>`;
}

function verCentro(id) {
  centroActual = todosLosCentros.find(c => c.id_centro === id);
  if (!centroActual) return;

  document.getElementById('detNombre').textContent  = centroActual.nombre;
  document.getElementById('detDepto').textContent   = centroActual.departamento;
  document.getElementById('detEstado').innerHTML    = badgeEstado(centroActual.estado);
  document.getElementById('detTel').textContent     = centroActual.telefono || '—';
  document.getElementById('detEmail').textContent   = centroActual.email || '—';
  document.getElementById('detDir').textContent     = centroActual.direccion || '—';
  document.getElementById('detFecha').textContent   = formatFecha(centroActual.fecha_registro);

  document.getElementById('btnAprobarModal').style.display  =
    centroActual.estado !== 'aprobado'  ? 'inline-flex' : 'none';
  document.getElementById('btnRechazarModal').style.display =
    centroActual.estado !== 'rechazado' ? 'inline-flex' : 'none';

  abrirModal('modalCentro');
}

async function cambiarEstado(id, nuevoEstado) {
  try {
    if (nuevoEstado === 'rechazado') {
      if (!confirm('¿Rechazar y eliminar este centro? Esta accion no se puede deshacer.')) return;
      const res = await fetch(`${API}/centros/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast('Centro rechazado y eliminado', 'error');
    } else {
      const centro = todosLosCentros.find(c => c.id_centro === id);
      if (!centro) throw new Error('Centro no encontrado');
      const res = await fetch(`${API}/centros/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:       centro.nombre,
          departamento: centro.departamento,
          direccion:    centro.direccion || '',
          telefono:     centro.telefono  || '',
          email:        centro.email     || '',
          estado:       'aprobado',
        }),
      });
      if (!res.ok) throw new Error('Error al aprobar');
      toast('Centro aprobado correctamente', 'exito');
    }
    cerrarModal('modalCentro');
    await cargarCentros();
    await cargarEstadisticas();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

function accionDesdeModal(estado) {
  if (centroActual) cambiarEstado(centroActual.id_centro, estado);
}

async function cargarUsuarios() {
  try {
    const res = await fetch(`${API}/usuarios/`);
    const usuarios = await res.json();
    document.getElementById('tablaUsuarios').innerHTML = usuarios.length
      ? usuarios.map(u => `
          <tr>
            <td style="color:rgba(245,240,232,0.3)">${u.id_usuario}</td>
            <td><strong>${u.username}</strong></td>
            <td style="font-size:0.8rem">${u.nombre_personal}</td>
            <td>${u.rol}</td>
            <td>${u.estado ? '<span style="color:#7dd4a0">● Activo</span>' : '<span style="color:#f0a09a">● Inactivo</span>'}</td>
            <td>
              <button class="btn-accion btn-rechazar" onclick="eliminarUsuario(${u.id_usuario}, '${u.username}')">Eliminar</button>
            </td>
          </tr>
        `).join('')
      : emptyRow(6, 'No hay usuarios registrados');
  } catch(e) {
    document.getElementById('tablaUsuarios').innerHTML = emptyRow(6, 'Error al cargar usuarios');
  }
}

function abrirModalUsuario() {
  document.getElementById('nuUsername').value = '';
  document.getElementById('nuPassword').value = '';
  document.getElementById('nuPersonal').value = '';
  abrirModal('modalUsuario');
}

async function crearUsuario() {
  const username   = document.getElementById('nuUsername').value.trim();
  const password   = document.getElementById('nuPassword').value;
  const id_personal = parseInt(document.getElementById('nuPersonal').value);
  const id_rol     = parseInt(document.getElementById('nuRol').value);

  if (!username || !password || !id_personal || !id_rol) {
    toast('Completa todos los campos', 'error'); return;
  }
  try {
    const res = await fetch(`${API}/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, id_personal, estado: true, id_rol })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error');
    }
    toast('Usuario creado correctamente', 'exito');
    cerrarModal('modalUsuario');
    cargarUsuarios();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function eliminarUsuario(id, username) {
  if (!confirm(`¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
  try {
    const res = await fetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    toast('Usuario eliminado', 'exito');
    cargarUsuarios();
  } catch(e) {
    toast('Error al eliminar usuario', 'error');
  }
}

async function cargarRoles() {
  try {
    const res = await fetch(`${API}/roles/`);
    const roles = await res.json();

    document.getElementById('tablaRoles').innerHTML = roles.length
      ? roles.map(r => `
          <tr>
            <td style="color:rgba(245,240,232,0.3)">${r.id_rol}</td>
            <td><strong>${r.nombre}</strong></td>
            <td style="font-size:0.8rem;color:rgba(245,240,232,0.5)">${r.descripcion || '—'}</td>
          </tr>
        `).join('')
      : emptyRow(3, 'Sin roles');

    const select = document.getElementById('nuRol');
    select.innerHTML = '<option value="">Seleccionar rol...</option>' +
      roles.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');

  } catch(e) {
    document.getElementById('tablaRoles').innerHTML = emptyRow(3, 'Error al cargar roles');
  }
}

const titulos = {
  estadisticas: ['Estadísticas globales',       'Vista general del sistema SIRAB'],
  centros:      ['Todos los centros',            'Gestión de centros de rescate'],
  pendientes:   ['Solicitudes pendientes',       'Centros que requieren aprobación'],
  usuarios:     ['Usuarios del sistema',         'Gestión de accesos y credenciales'],
  roles:        ['Roles del sistema',            'Permisos y niveles de acceso'],
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

function abrirModal(id)  { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });
});

function toast(msg, tipo = 'info') {
  const cont  = document.getElementById('toastContainer');
  const el    = document.createElement('div');
  const iconos = { exito: ':D', error: ':c', info: 'ℹinfo' };
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<span>${iconos[tipo]}</span> ${msg}`;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function badgeEstado(estado) {
  const map = {
    pendiente:  'badge-pendiente',
    aprobado:   'badge-aprobado',
    rechazado:  'badge-rechazado',
  };
  return `<span class="badge ${map[estado] || 'badge-pendiente'}">${estado || 'pendiente'}</span>`;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div></td></tr>`;
}
