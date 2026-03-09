const API = 'http://127.0.0.1:8000';

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

let centroActual    = null;
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
  document.getElementById('topbarFecha').textContent =
    new Date().toLocaleDateString('es-BO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

async function cargarTodo() {
  await Promise.all([
    cargarEstadisticas(),
    cargarCentros(),
    cargarUsuarios(),
    cargarRoles(),
  ]);
}

// ── ESTADÍSTICAS ──────────────────────────────────────────
async function cargarEstadisticas() {
  try {
    const [r1, r2, r3] = await Promise.all([
      apiFetch('/centros/'),
      apiFetch('/personal/'),
      apiFetch('/animales/'),
    ]);
    const centros  = await r1.json();
    const personal = await r2.json();
    const animales = await r3.json();

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

    const ultimos = [...centros].sort((a,b) =>
      new Date(b.fecha_registro||0) - new Date(a.fecha_registro||0)).slice(0,5);
    document.getElementById('tablaResumen').innerHTML = ultimos.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.departamento}</td>
        <td>${badgeEstado(c.estado)}</td>
      </tr>`).join('') || emptyRow(3, 'Sin centros registrados');

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
          <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
            <span style="font-size:0.82rem;color:var(--crema)">${depto}</span>
            <span style="font-size:0.78rem;color:var(--verde-claro)">${cant} centro${cant>1?'s':''}</span>
          </div>
          <div style="height:4px;background:rgba(122,181,138,0.1);border-radius:2px">
            <div style="height:100%;width:${(cant/max)*100}%;background:var(--verde-claro);border-radius:2px;transition:width 0.8s ease"></div>
          </div>
        </div>`).join('') || '<p style="color:rgba(245,240,232,0.3);font-size:0.85rem">Sin datos</p>';
  } catch(e) { console.error('Error estadísticas:', e); }
}

// ── CENTROS ───────────────────────────────────────────────
async function cargarCentros() {
  try {
    const res = await apiFetch('/centros/');
    todosLosCentros = await res.json();
    const visibles = todosLosCentros.filter(c => c.estado !== 'rechazado');
    document.getElementById('totalCentros').textContent = `${visibles.length} centros`;
    renderTablaCentros(visibles);
    renderTablaPendientes(visibles.filter(c => c.estado === 'pendiente'));
  } catch(e) {
    document.getElementById('tablaCentros').innerHTML    = emptyRow(6, 'Error al cargar centros');
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
        </tr>`).join('')
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
        </tr>`).join('')
    : `<tr><td colspan="5"><div class="empty-state"><p>No hay solicitudes pendientes</p></div></td></tr>`;
}

function verCentro(id) {
  centroActual = todosLosCentros.find(c => c.id_centro === id);
  if (!centroActual) return;
  document.getElementById('detNombre').textContent = centroActual.nombre;
  document.getElementById('detDepto').textContent  = centroActual.departamento;
  document.getElementById('detEstado').innerHTML   = badgeEstado(centroActual.estado);
  document.getElementById('detTel').textContent    = centroActual.telefono  || '—';
  document.getElementById('detEmail').textContent  = centroActual.email     || '—';
  document.getElementById('detDir').textContent    = centroActual.direccion || '—';
  document.getElementById('detFecha').textContent  = formatFecha(centroActual.fecha_registro);
  document.getElementById('btnAprobarModal').style.display  = centroActual.estado !== 'aprobado'  ? 'inline-flex' : 'none';
  document.getElementById('btnRechazarModal').style.display = centroActual.estado !== 'rechazado' ? 'inline-flex' : 'none';
  abrirModal('modalCentro');
}

async function cambiarEstado(id, nuevoEstado) {
  try {
    if (nuevoEstado === 'rechazado') {
      if (!confirm('¿Rechazar y eliminar este centro? Esta acción no se puede deshacer.')) return;
      const res = await apiFetch(`/centros/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast('Centro rechazado y eliminado', 'error');
    } else {
      const centro = todosLosCentros.find(c => c.id_centro === id);
      if (!centro) throw new Error('Centro no encontrado');
      const res = await apiFetch(`/centros/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: centro.nombre, departamento: centro.departamento,
          direccion: centro.direccion || '', telefono: centro.telefono || '',
          email: centro.email || '', estado: 'aprobado',
        }),
      });
      if (!res.ok) throw new Error('Error al aprobar');
      toast('Centro aprobado correctamente', 'exito');
    }
    cerrarModal('modalCentro');
    await cargarCentros();
    await cargarEstadisticas();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

function accionDesdeModal(estado) {
  if (centroActual) cambiarEstado(centroActual.id_centro, estado);
}

// ── USUARIOS ──────────────────────────────────────────────
async function cargarUsuarios() {
  try {
    const res      = await apiFetch('/usuarios/');
    const usuarios = await res.json();
    const filtrados = usuarios.filter(u => u.rol === 'Admin' || u.rol === 'Administrador');
    document.getElementById('tablaUsuarios').innerHTML = filtrados.length
      ? filtrados.map(u => `
          <tr>
            <td style="color:rgba(245,240,232,0.3)">${u.id_usuario}</td>
            <td><strong>${u.username}</strong></td>
            <td style="font-size:0.8rem">${u.nombre_personal || '—'}</td>
            <td>${badgeRol(u.rol)}</td>
            <td>${u.estado
              ? '<span style="display:inline-flex;align-items:center;gap:0.35rem;color:#7dd4a0;font-size:0.8rem"><span style="width:6px;height:6px;background:#7dd4a0;border-radius:50%;display:inline-block"></span>Activo</span>'
              : '<span style="display:inline-flex;align-items:center;gap:0.35rem;color:#f0a09a;font-size:0.8rem"><span style="width:6px;height:6px;background:#f0a09a;border-radius:50%;display:inline-block"></span>Inactivo</span>'
            }</td>
            <td>
              <button class="btn-accion btn-rechazar" onclick="eliminarUsuario(${u.id_usuario},'${u.username}')">Eliminar</button>
            </td>
          </tr>`).join('')
      : emptyRow(6, 'No hay administradores registrados');
  } catch(e) {
    document.getElementById('tablaUsuarios').innerHTML = emptyRow(6, 'Error al cargar usuarios');
  }
}

function abrirModalUsuario() {
  ['nuUsername','nuPassword','nuPersonal'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('nuRol').selectedIndex = 0;
  abrirModal('modalUsuario');
}

async function crearUsuario() {
  const username    = document.getElementById('nuUsername').value.trim();
  const password    = document.getElementById('nuPassword').value;
  const id_personal = parseInt(document.getElementById('nuPersonal').value);
  const id_rol      = parseInt(document.getElementById('nuRol').value);
  if (!username || !password || !id_personal || !id_rol) {
    toast('Completa todos los campos', 'error'); return;
  }
  try {
    const res = await apiFetch('/usuarios/', {
      method: 'POST',
      body: JSON.stringify({ username, password, id_personal, estado: true, id_rol })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    toast('Usuario creado correctamente', 'exito');
    cerrarModal('modalUsuario');
    cargarUsuarios();
  } catch(e) { toast(e.message, 'error'); }
}

async function eliminarUsuario(id, username) {
  if (!confirm(`¿Eliminar al usuario "${username}"?`)) return;
  try {
    const res = await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    toast('Usuario eliminado', 'exito');
    cargarUsuarios();
  } catch(e) { toast('Error al eliminar usuario', 'error'); }
}

// ── ROLES ─────────────────────────────────────────────────
async function cargarRoles() {
  try {
    const res   = await apiFetch('/roles/');
    const roles = await res.json();
    const descs = {
      'Admin':         'Control total del sistema SIRAB',
      'Administrador': 'Administrador de centro de rescate',
      'Veterinario':   'Gestión médica de animales',
      'Operador':      'Registro de rescates y operaciones',
    };
    document.getElementById('tablaRoles').innerHTML = roles.length
      ? roles.map(r => `
          <tr>
            <td style="color:rgba(245,240,232,0.3)">${r.id_rol}</td>
            <td>${badgeRol(r.nombre)}</td>
            <td style="font-size:0.82rem;color:rgba(245,240,232,0.5)">${descs[r.nombre] || r.descripcion || '—'}</td>
          </tr>`).join('')
      : emptyRow(3, 'Sin roles');

    const rolesAdmin = roles.filter(r => r.nombre === 'Admin' || r.nombre === 'Administrador');
    document.getElementById('nuRol').innerHTML =
      '<option value="">Seleccionar rol...</option>' +
      rolesAdmin.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
  } catch(e) {
    document.getElementById('tablaRoles').innerHTML = emptyRow(3, 'Error al cargar roles');
  }
}

// ── REPORTES GLOBALES ─────────────────────────────────────
async function cargarReportes() {
  try {
    const [r1, r2, r3] = await Promise.all([
      apiFetch('/centros/'),
      apiFetch('/reportes/rescates-centro'),
      apiFetch('/reportes/animales-estado'),
    ]);
    const centros   = await r1.json();
    const porCentro = await r2.json();
    const porEstado = await r3.json();

    // Centros por estado
    const aprobados  = centros.filter(c => c.estado === 'aprobado').length;
    const pendientes = centros.filter(c => c.estado === 'pendiente').length;
    const rechazados = centros.filter(c => c.estado === 'rechazado').length;
    const total      = centros.length || 1;
    document.getElementById('tablaRepCentroEstado').innerHTML = [
      { label:'Aprobados',  val:aprobados,  cls:'badge-aprobado',  color:'#7dd4a0' },
      { label:'Pendientes', val:pendientes, cls:'badge-pendiente', color:'#f0b84a' },
      { label:'Rechazados', val:rechazados, cls:'badge-rechazado', color:'#f0a09a' },
    ].map(r => `
      <tr>
        <td><span class="badge ${r.cls}">${r.label}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
              <div style="height:100%;width:${(r.val/total)*100}%;background:${r.color};border-radius:3px;transition:width 0.8s ease"></div>
            </div>
            <span style="font-size:0.85rem;min-width:1.5rem;text-align:right;font-weight:600">${r.val}</span>
          </div>
        </td>
      </tr>`).join('');

    // Centros por departamento
    const porDepto = {};
    centros.filter(c => c.nombre !== 'SIRAB Central').forEach(c => {
      porDepto[c.departamento] = (porDepto[c.departamento] || 0) + 1;
    });
    const sorted = Object.entries(porDepto).sort((a,b) => b[1]-a[1]);
    const maxD   = Math.max(...sorted.map(e => e[1]), 1);
    document.getElementById('tablaRepDepto').innerHTML = sorted.map(([depto, cant], i) => `
      <tr>
        <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i+1}</td>
        <td><strong>${depto}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
              <div style="height:100%;width:${(cant/maxD)*100}%;background:var(--verde-claro);border-radius:3px;transition:width 0.8s ease"></div>
            </div>
            <span style="font-size:0.85rem;min-width:1rem;text-align:right;font-weight:600">${cant}</span>
          </div>
        </td>
      </tr>`).join('') || emptyRow(3, 'Sin datos');

    // Rescates por centro
    const maxR = Math.max(...porCentro.map(r => r.cantidad_rescates || 0), 1);
    document.getElementById('tablaRepRescates').innerHTML = porCentro.length
      ? porCentro.map((r, i) => `
          <tr>
            <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${i+1}</td>
            <td style="font-size:0.83rem">${r.centro}<div style="font-size:0.7rem;color:rgba(245,240,232,0.3)">${r.departamento||''}</div></td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
                  <div style="height:100%;width:${((r.cantidad_rescates||0)/maxR)*100}%;background:var(--dorado);border-radius:3px;transition:width 0.8s ease"></div>
                </div>
                <span style="font-size:0.85rem;min-width:1rem;text-align:right;font-weight:600">${r.cantidad_rescates||0}</span>
              </div>
            </td>
          </tr>`).join('')
      : emptyRow(3, 'Sin datos');

    // Animales por estado
    const maxE = Math.max(...porEstado.map(r => r.cantidad || 0), 1);
    document.getElementById('tablaRepEstado').innerHTML = porEstado.length
      ? porEstado.map(r => `
          <tr>
            <td>${badgeEstadoAnimal(r.estado_actual)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
                  <div style="height:100%;width:${((r.cantidad||0)/maxE)*100}%;background:var(--verde-musgo);border-radius:3px;transition:width 0.8s ease"></div>
                </div>
                <span style="font-size:0.85rem;min-width:1rem;text-align:right;font-weight:600">${r.cantidad||0}</span>
              </div>
            </td>
          </tr>`).join('')
      : emptyRow(2, 'Sin datos');

  } catch(e) { console.error('Error reportes:', e); }
}

// ── REPORTES CENTROS ──────────────────────────────────────
async function cargarReporteCentros() {
  const contenedor = document.getElementById('listaCentrosReporte');
  try {
    const res     = await apiFetch('/centros/');
    const centros = await res.json();
    const aprobados = centros.filter(c => c.estado === 'aprobado')
                             .sort((a,b) => a.nombre.localeCompare(b.nombre));

    document.getElementById('repCentroConteo').textContent = `${aprobados.length} centros`;
    document.getElementById('panelDetalleCentro').style.display = 'none';

    contenedor.innerHTML = aprobados.length
      ? aprobados.map(c => `
          <div class="centro-item">
            <div class="centro-item-header" onclick="verDetalleCentro(${c.id_centro})" style="cursor:pointer">
              <div style="display:flex;align-items:center;gap:0.8rem">
                <div style="width:36px;height:36px;border-radius:50%;background:rgba(122,181,138,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:var(--verde-claro)"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div>
                  <div style="font-size:0.88rem;font-weight:600;color:var(--crema)">${c.nombre}</div>
                  <div style="font-size:0.72rem;color:rgba(245,240,232,0.35);margin-top:0.1rem">${c.departamento}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:0.8rem">
                <span style="font-size:0.72rem;color:rgba(245,240,232,0.3)">${c.email || '—'}</span>
                <button class="btn-accion btn-ver" onclick="event.stopPropagation();verDetalleCentro(${c.id_centro})">Ver reporte →</button>
              </div>
            </div>
          </div>`).join('')
      : '<div style="padding:1.5rem 1.4rem;color:rgba(245,240,232,0.25);font-size:0.85rem">No hay centros aprobados</div>';

  } catch(e) {
    contenedor.innerHTML = '<div style="padding:1.2rem 1.4rem;color:#f0a09a;font-size:0.83rem">Error al cargar centros</div>';
  }
}

async function verDetalleCentro(id) {
  const centro = todosLosCentros.find(c => c.id_centro === id);
  if (!centro) return;

  // Mostrar panel con datos básicos
  document.getElementById('repCentroNombre').textContent    = centro.nombre;
  document.getElementById('repCentroDepto').textContent     = centro.departamento;
  document.getElementById('repCentroDireccion').textContent = centro.direccion || '—';
  document.getElementById('repCentroTel').textContent       = centro.telefono  || '—';
  document.getElementById('repCentroEmail').textContent     = centro.email     || '—';
  document.getElementById('repCentroFecha').textContent     = formatFecha(centro.fecha_registro);
  document.getElementById('panelDetalleCentro').style.display = 'block';
  document.getElementById('listaCentrosReporte').style.display = 'none';

  // Scrollear al detalle
  document.getElementById('panelDetalleCentro').scrollIntoView({ behavior:'smooth', block:'start' });

  // Poner en cargando
  ['repTablaEspecie','repTablaEstado','repTablaPersonal'].forEach(t => {
    document.getElementById(t).innerHTML = `<tr class="loading-row"><td colspan="3">Cargando...</td></tr>`;
  });
  document.getElementById('repCentroPersonal').textContent = '— personal';
  document.getElementById('repCentroAnimales').textContent = '— animales';
  document.getElementById('repCentroRehab').textContent    = '— en rehabilitación';

  try {
    const [rAnim, rPers, rUsu] = await Promise.all([
      apiFetch('/animales/'),
      apiFetch('/personal/'),
      apiFetch('/usuarios/'),
    ]);
    const animales = (await rAnim.json()).filter(a => a.id_centro === id);
    const personal = (await rPers.json()).filter(p => p.id_centro === id);
    const usuarios = await rUsu.json();
    const rehab    = animales.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;

    document.getElementById('repCentroPersonal').textContent = `${personal.length} personal`;
    document.getElementById('repCentroAnimales').textContent = `${animales.length} animales`;
    document.getElementById('repCentroRehab').textContent    = `${rehab} en rehabilitación`;
    lucide.createIcons();

    // Tabla animales por especie
    const porEspecie = {};
    animales.forEach(a => {
      const esp = a.tipo_especie || a.especie || 'Sin especie';
      porEspecie[esp] = (porEspecie[esp] || 0) + 1;
    });
    const maxEsp = Math.max(...Object.values(porEspecie), 1);
    document.getElementById('repTablaEspecie').innerHTML = Object.entries(porEspecie).length
      ? Object.entries(porEspecie).sort((a,b)=>b[1]-a[1]).map(([esp, cant]) => `
          <tr>
            <td style="font-size:0.83rem">${esp}</td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
                  <div style="height:100%;width:${(cant/maxEsp)*100}%;background:var(--dorado);border-radius:3px;transition:width 0.8s ease"></div>
                </div>
                <span style="font-size:0.85rem;min-width:1rem;font-weight:600">${cant}</span>
              </div>
            </td>
          </tr>`).join('')
      : emptyRow(2, 'Sin animales registrados');

    // Tabla animales por estado
    const porEstAnim = {};
    animales.forEach(a => {
      const est = a.estado_actual || 'Sin estado';
      porEstAnim[est] = (porEstAnim[est] || 0) + 1;
    });
    const maxEst = Math.max(...Object.values(porEstAnim), 1);
    document.getElementById('repTablaEstado').innerHTML = Object.entries(porEstAnim).length
      ? Object.entries(porEstAnim).sort((a,b)=>b[1]-a[1]).map(([est, cant]) => `
          <tr>
            <td>${badgeEstadoAnimal(est)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px">
                  <div style="height:100%;width:${(cant/maxEst)*100}%;background:var(--verde-musgo);border-radius:3px;transition:width 0.8s ease"></div>
                </div>
                <span style="font-size:0.85rem;min-width:1rem;font-weight:600">${cant}</span>
              </div>
            </td>
          </tr>`).join('')
      : emptyRow(2, 'Sin animales');

    // Tabla personal
    document.getElementById('repTablaPersonal').innerHTML = personal.length
      ? personal.map(p => {
          const usu = usuarios.find(u => u.id_personal === p.id_personal);
          return `
          <tr>
            <td><strong>${p.nombre} ${p.paterno || ''}</strong></td>
            <td>${badgeRol(p.rol || usu?.rol || '—')}</td>
            <td style="font-size:0.78rem;color:rgba(245,240,232,0.4)">${usu?.username || '—'}</td>
          </tr>`;
        }).join('')
      : emptyRow(3, 'Sin personal registrado');

  } catch(e) {
    console.error('Error detalle centro:', e);
    ['repTablaEspecie','repTablaEstado','repTablaPersonal'].forEach(t => {
      document.getElementById(t).innerHTML = emptyRow(3, 'Error al cargar datos');
    });
  }
}

function cerrarDetalleCentro() {
  document.getElementById('panelDetalleCentro').style.display = 'none';
  document.getElementById('listaCentrosReporte').style.display = 'block';
}

// ── UI ────────────────────────────────────────────────────
const titulos = {
  'estadisticas': ['Estadísticas globales',   'Vista general del sistema SIRAB'],
  'centros':      ['Todos los centros',        'Gestión de centros de rescate'],
  'pendientes':   ['Solicitudes pendientes',   'Centros que requieren aprobación'],
  'usuarios':     ['Administradores',          'Superadmins y admins de centros'],
  'roles':        ['Roles del sistema',        'Permisos y niveles de acceso'],
  'reportes':     ['Reportes del sistema',     'Estadísticas globales de los centros'],
  'rep-centros':  ['Reportes por centro',      'Detalle de actividad por centro de rescate'],
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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  });
});

function toast(msg, tipo = 'info') {
  const cont = document.getElementById('toastContainer');
  const el   = document.createElement('div');
  const svgs = {
    exito: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<span style="display:flex;align-items:center;flex-shrink:0">${svgs[tipo]||svgs.info}</span> ${msg}`;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function badgeEstado(estado) {
  const map = { pendiente:'badge-pendiente', aprobado:'badge-aprobado', rechazado:'badge-rechazado' };
  return `<span class="badge ${map[estado]||'badge-pendiente'}">${estado||'pendiente'}</span>`;
}

function badgeRol(rol) {
  const map = { 'Admin':'badge-admin', 'Administrador':'badge-aprobado', 'Veterinario':'badge-vet', 'Operador':'badge-pendiente' };
  return `<span class="badge ${map[rol]||'badge-pendiente'}">${rol||'—'}</span>`;
}

function badgeEstadoAnimal(estado) {
  if (!estado) return '<span class="badge badge-pendiente">—</span>';
  const e = estado.toLowerCase();
  if (e.includes('rehabilitaci')) return `<span class="badge badge-pendiente">${estado}</span>`;
  if (e.includes('tratamiento'))  return `<span class="badge badge-rechazado">${estado}</span>`;
  return `<span class="badge badge-aprobado">${estado}</span>`;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty-state"><p>${msg}</p></div></td></tr>`;
}
