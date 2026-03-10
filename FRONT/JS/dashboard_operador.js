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

let MI_CENTRO        = null;
let usuario          = null;
let animalesCentro   = [];
let rescatesCentro   = [];
let historialCentro  = [];
let especiesLista    = [];
let animalEditandoId  = null;
let animalFichaActual = null;

document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  mostrarFecha();
  cargarTodo();

  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('visible'); });
  });
});


function verificarSesion() {
  usuario   = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  const rol = sessionStorage.getItem('rol');
  MI_CENTRO = parseInt(sessionStorage.getItem('id_centro'));

  console.log('[SIRAB Operador] rol=', JSON.stringify(rol), '| id_rol=', usuario?.id_rol, '| centro=', MI_CENTRO);

  if (!usuario) {
    window.location.href = 'login_personal.html';
    return;
  }


  const idRol = usuario.id_rol;
  const rolNombre = (rol || '').toLowerCase();
  const esOperador = idRol === 3
    || rolNombre.includes('operador')
    || rolNombre.includes('cuidador')
    || rolNombre.includes('operator');

  if (!esOperador) {
    console.warn('[SIRAB] No es operador. rol=', rol, 'id_rol=', idRol);
    window.location.href = 'login_personal.html';
    return;
  }

  MI_CENTRO = isNaN(MI_CENTRO) ? 0 : MI_CENTRO;
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

  await Promise.all([
    cargarCentroInfo(),
    cargarEspecies(),
    cargarAnimales(),
  ]);
  await Promise.all([
    cargarRescates(),
    cargarHistorial(),
  ]);
}


async function cargarCentroInfo() {
  try {
    const res    = await apiFetch(`/centros/${MI_CENTRO}`);
    const centro = await res.json();
    document.getElementById('sidebarCentro').textContent = centro.nombre || `Centro #${MI_CENTRO}`;
  } catch(e) {
    document.getElementById('sidebarCentro').textContent = `Centro #${MI_CENTRO}`;
  }
}


async function cargarAnimales() {
  try {
    const res   = await apiFetch('/animales/');
    const todos = await res.json();
    animalesCentro = todos.filter(a => a.id_centro === MI_CENTRO);
    renderTablaAnimales(animalesCentro);
    actualizarStats();
  } catch(e) {
    document.getElementById('tablaAnimales').innerHTML = emptyRow(8, 'Error al cargar animales');
  }
}

function renderTablaAnimales(lista) {
  document.getElementById('tablaAnimales').innerHTML = lista.length
    ? lista.map(a => `
        <tr>
          <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${a.id_animal}</td>
          <td>
            <strong>${apodo(a)}</strong>
            ${a.observaciones
              ? `<div style="font-size:0.7rem;color:rgba(245,240,232,0.3);margin-top:0.1rem">
                   ${a.observaciones.substring(0,35)}${a.observaciones.length > 35 ? '...' : ''}
                 </div>` : ''}
          </td>
          <td style="font-size:0.82rem">${a.nombre_comun || a.especie || '—'}</td>
          <td style="font-size:0.82rem">${a.sexo || '—'}</td>
          <td style="font-size:0.82rem">${a.peso ? a.peso + ' kg' : '—'}</td>
          <td>${badgeEstado(a.estado_actual)}</td>
          <td style="font-size:0.75rem;color:rgba(245,240,232,0.35)">${formatFecha(a.fecha_ingreso)}</td>
          <td>
            <button class="btn-accion btn-ver"    onclick="verFichaAnimal(${a.id_animal})">Ficha</button>
            <button class="btn-accion btn-editar" onclick="abrirModalAnimal(${a.id_animal})">Editar</button>
          </td>
        </tr>`).join('')
    : emptyRow(8, 'No hay animales registrados en este centro');
}

function filtrarAnimales() {
  const texto  = document.getElementById('buscarAnimal').value.toLowerCase();
  const estado = document.getElementById('filtroEstado').value;
  const filtrados = animalesCentro.filter(a => {
    const matchTexto = !texto ||
      apodo(a).toLowerCase().includes(texto) ||
      (a.nombre_comun || a.especie || '').toLowerCase().includes(texto) ||
      String(a.id_animal).includes(texto);
    const matchEstado = !estado || a.estado_actual === estado;
    return matchTexto && matchEstado;
  });
  renderTablaAnimales(filtrados);
}

function apodo(a) {
  if (a.observaciones) {
    const match = a.observaciones.match(/apodo[:\s]+([^\n,\.]+)/i);
    if (match) return match[1].trim();
  }
  return `${a.nombre_comun || a.especie || 'Animal'} #${a.id_animal}`;
}

function actualizarStats() {
  const rehab  = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('rehabilitaci')).length;
  const trat   = animalesCentro.filter(a => a.estado_actual?.toLowerCase().includes('tratamiento')).length;
  document.getElementById('statAnimales').textContent = animalesCentro.length;
  document.getElementById('statRehab').textContent    = `${rehab} en rehabilitación`;
  document.getElementById('statCriticos').textContent = trat;


  const ultimos = [...animalesCentro]
    .sort((a, b) => new Date(b.fecha_ingreso || 0) - new Date(a.fecha_ingreso || 0))
    .slice(0, 5);
  document.getElementById('tablaResumenAnimales').innerHTML = ultimos.length
    ? ultimos.map(a => `
        <tr onclick="verFichaAnimal(${a.id_animal})" style="cursor:pointer">
          <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${a.id_animal}</td>
          <td><strong>${apodo(a)}</strong></td>
          <td style="font-size:0.8rem">${a.nombre_comun || a.especie || '—'}</td>
          <td>${badgeEstado(a.estado_actual)}</td>
        </tr>`).join('')
    : emptyRow(4, 'Sin animales');


    const porEstado = {};
  animalesCentro.forEach(a => {
    const est = a.estado_actual || 'Sin estado';
    porEstado[est] = (porEstado[est] || 0) + 1;
  });
  const max = Math.max(...Object.values(porEstado), 1);
  document.getElementById('distEstado').innerHTML = Object.entries(porEstado)
    .sort((a, b) => b[1] - a[1])
    .map(([est, cant]) => `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
          ${badgeEstado(est)}
          <span style="font-size:0.78rem;color:rgba(245,240,232,0.4)">${cant}</span>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:2px">
          <div style="height:100%;width:${(cant/max)*100}%;background:var(--verde-claro);border-radius:2px;transition:width 0.8s ease"></div>
        </div>
      </div>`).join('') || '<p style="color:rgba(245,240,232,0.2);font-size:0.82rem">Sin datos</p>';
}


async function verFichaAnimal(id) {
  const a = animalesCentro.find(x => x.id_animal === id);
  if (!a) return;
  animalFichaActual = a;

  let edadTexto = '—';
  if (a.fecha_nacimiento_aprox) {
    const diff  = Date.now() - new Date(a.fecha_nacimiento_aprox).getTime();
    const años  = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const meses = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
    edadTexto = años > 0
      ? `${años} año${años > 1 ? 's' : ''} ${meses > 0 ? `y ${meses} mes${meses > 1 ? 'es' : ''}` : ''}`
      : `${meses} mes${meses > 1 ? 'es' : ''}`;
  }

  const histAnimal = historialCentro.filter(h => h.id_animal === id);
  const ultimoReg  = [...histAnimal].sort((a, b) =>
    new Date(b.fecha_revision) - new Date(a.fecha_revision))[0];


  const rescateVinculado = rescatesCentro.find(r => r.id_rescate === a.id_rescate);

  document.getElementById('fichaAnimalBody').innerHTML = `
    <div class="ficha-header">
      <div class="ficha-avatar">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5M8 14v.5C8 17 9.79 19 12 19s4-2 4-4.5V14"/>
        </svg>
      </div>
      <div>
        <div class="ficha-nombre">${apodo(a)}</div>
        <div class="ficha-id">ID Animal: #${a.id_animal} &nbsp;·&nbsp; ${badgeEstado(a.estado_actual)}</div>
      </div>
    </div>

    <div class="ficha-grid">
      <div class="ficha-item"><span class="ficha-label">Especie</span><span class="ficha-val">${a.nombre_comun || a.especie || '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Sexo</span><span class="ficha-val">${a.sexo || 'Desconocido'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Peso</span><span class="ficha-val">${a.peso ? a.peso + ' kg' : '—'}</span></div>
      <div class="ficha-item"><span class="ficha-label">Edad aprox.</span><span class="ficha-val">${edadTexto}</span></div>
      <div class="ficha-item"><span class="ficha-label">Fecha de ingreso</span><span class="ficha-val">${formatFecha(a.fecha_ingreso)}</span></div>
      <div class="ficha-item"><span class="ficha-label">Rescate</span><span class="ficha-val">${rescateVinculado ? `#${rescateVinculado.id_rescate} — ${rescateVinculado.tipo_incidente}` : '—'}</span></div>
    </div>

    ${a.observaciones ? `
      <div class="ficha-obs" style="margin-bottom:1rem">
        <span style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.25);display:block;margin-bottom:0.4rem">Observaciones</span>
        ${a.observaciones}
      </div>` : ''}

    <div style="margin-bottom:1rem">
      <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.25);margin-bottom:0.6rem">
        Horario de alimentación sugerido
      </div>
      ${horarioAlimentacion(a)}
    </div>

    ${ultimoReg ? `
      <div>
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.25);margin-bottom:0.6rem">
          Último registro médico — ${formatFecha(ultimoReg.fecha_revision)}
        </div>
        <div class="ficha-obs">
          <strong>${ultimoReg.diagnostico || '—'}</strong>
          ${ultimoReg.tratamiento ? `<span style="font-size:0.78rem;margin-top:0.3rem;display:block">${ultimoReg.tratamiento}</span>` : ''}
        </div>
      </div>` : ''}
  `;

  abrirModal('modalFichaAnimal');
  lucide.createIcons();
}

function horarioAlimentacion(a) {
  const estado = (a.estado_actual || '').toLowerCase();

  const guardado = getHorarioGuardado(a.id_animal);
  let comidas = guardado || [];

  if (!comidas.length) {
    if (estado.includes('tratamiento') || estado.includes('critico')) {
      comidas = [
        { hora: '07:00', label: 'Mañana',   detalle: 'Dieta blanda + medicación' },
        { hora: '12:00', label: 'Mediodía', detalle: 'Porción reducida' },
        { hora: '17:00', label: 'Tarde',    detalle: 'Dieta blanda + hidratación' },
        { hora: '21:00', label: 'Noche',    detalle: 'Suplemento proteico' },
      ];
    } else if (estado.includes('rehabilitaci')) {
      comidas = [
        { hora: '07:00', label: 'Mañana',   detalle: 'Alimentación principal' },
        { hora: '13:00', label: 'Mediodía', detalle: 'Snack / enriquecimiento' },
        { hora: '18:00', label: 'Tarde',    detalle: 'Alimentación secundaria' },
      ];
    } else {
      comidas = [
        { hora: '08:00', label: 'Mañana', detalle: 'Alimentación principal' },
        { hora: '18:00', label: 'Tarde',  detalle: 'Alimentación secundaria' },
      ];
    }
  }

  return `
    <div class="horario-grid" style="grid-template-columns:repeat(${comidas.length},1fr)" id="horarioGrid_${a.id_animal}">
      ${comidas.map((c, i) => `
        <div class="horario-card">
          <div class="horario-hora">${c.hora}</div>
          <div class="horario-label">${c.label}</div>
          <div class="horario-detalle">${c.detalle}</div>
        </div>`).join('')}
    </div>
    <button onclick="abrirEditarHorario(${a.id_animal})" style="margin-top:0.6rem;background:transparent;border:1px solid rgba(122,181,138,0.25);color:var(--verde-claro);border-radius:0.5rem;padding:0.3rem 0.8rem;font-size:0.75rem;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:0.4rem">
      <i data-lucide="pencil" style="width:11px;height:11px"></i> Editar horario
    </button>`;
}

function getHorarioGuardado(id_animal) {
  try {
    const d = sessionStorage.getItem(`horario_${id_animal}`);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
}

function abrirEditarHorario(id_animal) {
  const a = animalesCentro.find(x => x.id_animal === id_animal);
  if (!a) return;

  const estado = (a.estado_actual || '').toLowerCase();
  const guardado = getHorarioGuardado(id_animal);
  let comidas = guardado || [];
  if (!comidas.length) {
    if (estado.includes('tratamiento')) {
      comidas = [
        { hora: '07:00', label: 'Mañana',   detalle: 'Dieta blanda + medicación' },
        { hora: '12:00', label: 'Mediodía', detalle: 'Porción reducida' },
        { hora: '17:00', label: 'Tarde',    detalle: 'Dieta blanda + hidratación' },
        { hora: '21:00', label: 'Noche',    detalle: 'Suplemento proteico' },
      ];
    } else if (estado.includes('rehabilitaci')) {
      comidas = [
        { hora: '07:00', label: 'Mañana',   detalle: 'Alimentación principal' },
        { hora: '13:00', label: 'Mediodía', detalle: 'Snack / enriquecimiento' },
        { hora: '18:00', label: 'Tarde',    detalle: 'Alimentación secundaria' },
      ];
    } else {
      comidas = [
        { hora: '08:00', label: 'Mañana', detalle: 'Alimentación principal' },
        { hora: '18:00', label: 'Tarde',  detalle: 'Alimentación secundaria' },
      ];
    }
  }


  const existente = document.getElementById('modalHorario');
  if (existente) existente.remove();

  const filas = comidas.map((c, i) => `
    <div style="display:grid;grid-template-columns:90px 1fr 1fr auto;gap:0.5rem;align-items:center;margin-bottom:0.5rem">
      <input type="time" value="${c.hora}" id="hHora_${i}" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
      <input type="text" value="${c.label}" id="hLabel_${i}" placeholder="Ej: Mañana" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
      <input type="text" value="${c.detalle}" id="hDetalle_${i}" placeholder="Descripción" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
      <button onclick="eliminarFilaHorario(${i})" style="background:transparent;border:none;color:rgba(245,240,232,0.3);cursor:pointer;font-size:1rem;padding:0.2rem 0.4rem" title="Eliminar">✕</button>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay visible';
  modal.id = 'modalHorario';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <h3>Editar horario — ${apodo(a)}</h3>
        <button class="modal-close" onclick="document.getElementById('modalHorario').remove()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div style="font-size:0.72rem;color:rgba(245,240,232,0.3);margin-bottom:0.8rem">
          Edita hora, nombre y descripción de cada comida
        </div>
        <div id="filasHorario">${filas}</div>
        <button onclick="agregarFilaHorario()" style="margin-top:0.4rem;background:transparent;border:1px dashed rgba(122,181,138,0.3);color:var(--verde-claro);border-radius:0.5rem;padding:0.3rem 0.8rem;font-size:0.75rem;cursor:pointer;font-family:'DM Sans',sans-serif">
          + Agregar comida
        </button>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('modalHorario').remove()">Cancelar</button>
        <button class="btn-primary" onclick="guardarHorario(${id_animal})">
          <i data-lucide="save" style="width:13px;height:13px"></i> Guardar horario
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  lucide.createIcons();
}

function agregarFilaHorario() {
  const filas = document.getElementById('filasHorario');
  const i = filas.querySelectorAll('input[type="time"]').length;
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:90px 1fr 1fr auto;gap:0.5rem;align-items:center;margin-bottom:0.5rem';
  div.innerHTML = `
    <input type="time" value="12:00" id="hHora_${i}" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
    <input type="text" value="" id="hLabel_${i}" placeholder="Ej: Mediodía" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
    <input type="text" value="" id="hDetalle_${i}" placeholder="Descripción" style="background:rgba(245,240,232,0.06);border:1px solid rgba(245,240,232,0.12);border-radius:0.5rem;padding:0.4rem 0.6rem;color:inherit;font-family:'DM Sans',sans-serif;font-size:0.82rem"/>
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:rgba(245,240,232,0.3);cursor:pointer;font-size:1rem;padding:0.2rem 0.4rem" title="Eliminar">✕</button>`;
  filas.appendChild(div);
}

function eliminarFilaHorario(i) {
  const filas = document.getElementById('filasHorario');
  const divs = filas.children;
  if (divs[i]) divs[i].remove();
}

function guardarHorario(id_animal) {
  const filas = document.getElementById('filasHorario');
  const horas   = filas.querySelectorAll('input[type="time"]');
  const labels  = filas.querySelectorAll('input[placeholder^="Ej"]');
  const detalles= filas.querySelectorAll('input[placeholder="Descripción"]');

  const comidas = [];
  for (let i = 0; i < horas.length; i++) {
    const hora   = horas[i].value;
    const label  = labels[i]?.value.trim() || '';
    const detalle= detalles[i]?.value.trim() || '';
    if (hora) comidas.push({ hora, label, detalle });
  }

  sessionStorage.setItem(`horario_${id_animal}`, JSON.stringify(comidas));
  document.getElementById('modalHorario').remove();
  toast('Horario guardado', 'exito');


  const a = animalesCentro.find(x => x.id_animal === id_animal);
  if (a && document.getElementById('modalFichaAnimal').classList.contains('visible')) {
    verFichaAnimal(id_animal);
  }
}

function editarDesdeficha() {
  if (!animalFichaActual) return;
  cerrarModal('modalFichaAnimal');
  abrirModalAnimal(animalFichaActual.id_animal);
}


function abrirModalAnimal(id = null) {
  animalEditandoId = id;
  document.getElementById('modalAnimalTitulo').textContent = id ? 'Editar animal' : 'Nuevo animal';

  if (id) {
    const a = animalesCentro.find(x => x.id_animal === id);
    if (a) {
      document.getElementById('aEspecie').value         = a.id_especie || '';
      document.getElementById('aSexo').value            = a.sexo || '';
      document.getElementById('aPeso').value            = a.peso || '';
      document.getElementById('aFechaIngreso').value    = a.fecha_ingreso?.substring(0, 10) || '';
      document.getElementById('aFechaNacimiento').value = a.fecha_nacimiento_aprox?.substring(0, 10) || '';
      document.getElementById('aEstado').value          = a.estado_actual || 'En rehabilitación';
      document.getElementById('aRescate').value         = a.id_rescate || '';
      document.getElementById('aObservaciones').value   = a.observaciones || '';
    }
  } else {
    ['aEspecie','aSexo','aPeso','aFechaIngreso','aFechaNacimiento','aRescate','aObservaciones'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });
    document.getElementById('aEstado').value        = 'En rehabilitación';
    document.getElementById('aFechaIngreso').value  = new Date().toISOString().substring(0, 10);
  }
  abrirModal('modalAnimal');
}

async function guardarAnimal() {
  const id_especie  = parseInt(document.getElementById('aEspecie').value);
  const id_rescate  = parseInt(document.getElementById('aRescate').value) || null;
  const fecha_ingreso = document.getElementById('aFechaIngreso').value || new Date().toISOString().substring(0, 10);

  if (!id_especie) { toast('Selecciona una especie', 'error'); return; }
  if (!id_rescate) { toast('El rescate vinculado es obligatorio', 'error'); return; }

  const body = {
    id_especie,
    id_centro:              MI_CENTRO,
    id_rescate,
    sexo:                   document.getElementById('aSexo').value || null,
    fecha_ingreso,
    fecha_nacimiento_aprox: document.getElementById('aFechaNacimiento').value || null,
    estado_actual:          document.getElementById('aEstado').value,
    peso:                   parseFloat(document.getElementById('aPeso').value) || null,
    observaciones:          document.getElementById('aObservaciones').value || null,
  };

  try {
    const url    = animalEditandoId ? `/animales/${animalEditandoId}` : '/animales/';
    const method = animalEditandoId ? 'PUT' : 'POST';
    const res    = await apiFetch(url, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.detail === 'string' ? err.detail
        : Array.isArray(err.detail) ? err.detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(' | ')
        : JSON.stringify(err)
      );
    }
    toast(animalEditandoId ? 'Animal actualizado' : 'Animal registrado', 'exito');
    cerrarModal('modalAnimal');
    await cargarAnimales();
  } catch(e) { toast(e.message, 'error'); }
}


async function cargarRescates() {
  try {
    const res  = await apiFetch('/rescates/');
    const todos = await res.json();


    const idsVinculados = new Set(
      animalesCentro.map(a => a.id_rescate).filter(Boolean)
    );


    const locales = JSON.parse(sessionStorage.getItem('rescates_creados') || '[]');
    locales.forEach(id => idsVinculados.add(id));

    rescatesCentro = todos.filter(r => idsVinculados.has(r.id_rescate));

    const ahora    = new Date();
    const esteMes  = rescatesCentro.filter(r => {
      const f = new Date(r.fecha_rescate || 0);
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }).length;
    document.getElementById('statRescates').textContent     = rescatesCentro.length;
    document.getElementById('statRescatesMes').textContent  = `${esteMes} este mes`;

    renderTablaRescates();
  } catch(e) {
    document.getElementById('tablaRescates').innerHTML = emptyRow(6, 'Error al cargar rescates');
  }
}

function renderTablaRescates() {
  document.getElementById('tablaRescates').innerHTML = rescatesCentro.length
    ? [...rescatesCentro]
        .sort((a, b) => new Date(b.fecha_rescate || 0) - new Date(a.fecha_rescate || 0))
        .map(r => {

          const animal = animalesCentro.find(a => a.id_rescate === r.id_rescate);
          const animalTexto = animal
            ? `<span style="cursor:pointer;color:var(--verde-claro)" onclick="verFichaAnimal(${animal.id_animal})">${apodo(animal)}</span>`
            : '<span style="color:rgba(245,240,232,0.25)">—</span>';
          return `
            <tr>
              <td style="color:rgba(245,240,232,0.3);font-size:0.75rem">${r.id_rescate}</td>
              <td>${animalTexto}</td>
              <td style="font-size:0.82rem">${r.tipo_incidente || '—'}</td>
              <td style="font-size:0.78rem;color:rgba(245,240,232,0.4)">${r.ubicacion || '—'}</td>
              <td style="font-size:0.75rem;color:rgba(245,240,232,0.35)">${formatFecha(r.fecha_rescate)}</td>
              <td>
                <button class="btn-accion btn-editar" onclick="abrirModalEditarRescate(${r.id_rescate})">Editar</button>
              </td>
            </tr>`;
        }).join('')
    : emptyRow(6, 'No hay rescates registrados para este centro');
}

function abrirModalRescate() {
  rescateEditandoId = null;
  ['rTipo','rUbicacion','rDescripcion','rPeso','rObsAnimal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rFecha').value        = new Date().toISOString().substring(0, 10);
  document.getElementById('rSexo').value         = '';
  document.getElementById('rEstadoAnimal').value = 'En rehabilitación';
  document.getElementById('rNacimiento').value   = '';


  const selAnimal = document.getElementById('rAnimal');
  selAnimal.innerHTML = '<option value="">Desconocida</option>' +
    especiesLista.map(e =>
      `<option value="${e.id_especie}">${e.nombre_comun}</option>`
    ).join('');

  abrirModal('modalRescate');
}

async function guardarRescate() {
  const tipo       = document.getElementById('rTipo').value.trim();
  const ubicacion  = document.getElementById('rUbicacion').value.trim();
  const fecha      = document.getElementById('rFecha').value;
  const id_especie = parseInt(document.getElementById('rAnimal').value) || null;
  const sexo       = document.getElementById('rSexo').value || null;
  const peso       = parseFloat(document.getElementById('rPeso').value) || null;
  const estadoAnim = document.getElementById('rEstadoAnimal').value;
  const nacimiento = document.getElementById('rNacimiento').value || null;
  const obsAnimal  = document.getElementById('rObsAnimal').value.trim() || null;
  const desc       = document.getElementById('rDescripcion').value.trim() || null;

  if (!tipo || !ubicacion || !fecha) {
    toast('Tipo, ubicación y fecha son obligatorios', 'error'); return;
  }

  try {

    const resR = await apiFetch('/rescates/', {
      method: 'POST',
      body: JSON.stringify({
        tipo_incidente: tipo,
        ubicacion,
        fecha_rescate:  fecha,
        descripcion:    desc,
        id_centro:      MI_CENTRO,
      })
    });
    if (!resR.ok) {
      const err = await resR.json().catch(() => ({}));
      const msg = typeof err.detail === 'string'
        ? err.detail
        : Array.isArray(err.detail)
          ? err.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(' | ')
          : JSON.stringify(err);
      throw new Error(msg);
    }
    const rescate = await resR.json();


    const locales = JSON.parse(sessionStorage.getItem('rescates_creados') || '[]');
    locales.push(rescate.id_rescate);
    sessionStorage.setItem('rescates_creados', JSON.stringify(locales));


    if (id_especie) {
      const resA = await apiFetch('/animales/', {
        method: 'POST',
        body: JSON.stringify({
          id_especie,
          id_centro:              MI_CENTRO,
          id_rescate:             rescate.id_rescate,
          sexo,
          peso,
          fecha_ingreso:          fecha,
          fecha_nacimiento_aprox: nacimiento,
          estado_actual:          estadoAnim,
          observaciones:          obsAnimal,
        })
      });
      if (!resA.ok) {

        const err = await resA.json().catch(() => ({}));
        toast(`Rescate creado pero error al registrar animal: ${typeof err.detail === 'string' ? err.detail : JSON.stringify(err)}`, 'error');
      } else {
        toast('Rescate y animal registrados correctamente', 'exito');
      }
    } else {
      toast('Rescate registrado correctamente', 'exito');
    }

    cerrarModal('modalRescate');
    await cargarAnimales();
    await cargarRescates();
  } catch(e) { toast(e.message, 'error'); }
}


let rescateEditandoId = null;
function abrirModalEditarRescate(id) {
  const r = rescatesCentro.find(x => x.id_rescate === id);
  if (!r) return;
  rescateEditandoId = id;

  document.getElementById('rTipo').value        = r.tipo_incidente || '';
  document.getElementById('rUbicacion').value   = r.ubicacion || '';
  document.getElementById('rFecha').value       = r.fecha_rescate?.substring(0, 10) || '';
  document.getElementById('rDescripcion').value = r.descripcion || '';


  const animal = animalesCentro.find(a => a.id_rescate === id);
  const selAnimal = document.getElementById('rAnimal');
  selAnimal.innerHTML = '<option value="">Desconocida</option>' +
    especiesLista.map(e =>
      `<option value="${e.id_especie}" ${e.id_especie === animal?.id_especie ? 'selected' : ''}>${e.nombre_comun}</option>`
    ).join('');

  document.getElementById('rSexo').value         = animal?.sexo || '';
  document.getElementById('rPeso').value         = animal?.peso || '';
  document.getElementById('rEstadoAnimal').value = animal?.estado_actual || 'En rehabilitación';
  document.getElementById('rNacimiento').value   = animal?.fecha_nacimiento_aprox?.substring(0,10) || '';
  document.getElementById('rObsAnimal').value    = animal?.observaciones || '';

  abrirModal('modalRescate');
}


async function cargarHistorial() {
  try {

    const arrays = await Promise.all(
      animalesCentro.map(a =>
        apiFetch(`/historial-medico/animal/${a.id_animal}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    );
    historialCentro = arrays.flat();
    document.getElementById('statHistorial').textContent = historialCentro.length;
    renderHistorial(historialCentro);
  } catch(e) {
    document.getElementById('listaHistorial').innerHTML =
      '<div class="empty-state"><p>Error al cargar historial</p></div>';
  }
}

function renderHistorial(lista) {
  if (!lista.length) {
    document.getElementById('listaHistorial').innerHTML =
      '<div class="empty-state"><p>No hay registros médicos</p></div>';
    return;
  }
  const sorted = [...lista].sort((a, b) =>
    new Date(b.fecha_revision || 0) - new Date(a.fecha_revision || 0));
  document.getElementById('listaHistorial').innerHTML = sorted.map(h => {
    const animal = animalesCentro.find(a => a.id_animal === h.id_animal);
    return `
      <div class="historial-item">
        <div class="hist-fecha">${formatFecha(h.fecha_revision)}</div>
        <div class="hist-body">
          <div class="hist-animal">
            ${animal ? apodo(animal) : `Animal #${h.id_animal}`}
            ${animal ? badgeEstado(animal.estado_actual) : ''}
          </div>
          <div class="hist-vet">Veterinario: ${h.nombre_veterinario || h.nombre_personal || `#${h.id_personal}` || '—'}</div>
          ${h.diagnostico ? `<div class="hist-diag"><strong>Diagnóstico:</strong> ${h.diagnostico}</div>` : ''}
          ${h.tratamiento  ? `<div class="hist-diag"><strong>Tratamiento:</strong> ${h.tratamiento}</div>`  : ''}
        </div>
      </div>`;
  }).join('');
}

function filtrarHistorial() {
  const texto = document.getElementById('buscarHistorial').value.toLowerCase();
  const filtrado = historialCentro.filter(h => {
    const animal = animalesCentro.find(a => a.id_animal === h.id_animal);
    return !texto ||
      (animal ? apodo(animal) : '').toLowerCase().includes(texto) ||
      (h.diagnostico || '').toLowerCase().includes(texto) ||
      (h.nombre_veterinario || h.nombre_personal || '').toLowerCase().includes(texto);
  });
  renderHistorial(filtrado);
}



async function cargarEspecies() {
  try {
    const res = await apiFetch('/especies/');
    especiesLista = await res.json();
    const sel = document.getElementById('aEspecie');
    sel.innerHTML = '<option value="">Seleccionar especie...</option>' +
      especiesLista.map(e =>
        `<option value="${e.id_especie}">${e.nombre_comun}</option>`
      ).join('');
  } catch(e) { console.warn('No se pudieron cargar especies'); }
}


const titulos = {
  resumen:   ['Resumen',          'Vista general de tu centro'],
  animales:  ['Animales',         'Gestión de animales del centro'],
  rescates:  ['Rescates',         'Registro de rescates del centro'],
  historial: ['Historial médico', 'Solo lectura — registrado por veterinarios'],
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
  localStorage.clear(); sessionStorage.clear();
  window.location.href = 'login_personal.html';
}

function abrirModal(id)  { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }


function toast(msg, tipo = 'info') {
  const cont = document.getElementById('toastContainer');
  const el   = document.createElement('div');
  const svgs = {
    exito: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>',
  };
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<span style="display:flex;align-items:center;flex-shrink:0">${svgs[tipo] || svgs.info}</span> ${msg}`;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function badgeEstado(estado) {
  if (!estado) return '<span class="badge badge-gris">—</span>';
  const e = estado.toLowerCase();
  if (e.includes('rehabilitaci')) return `<span class="badge badge-dorado">${estado}</span>`;
  if (e.includes('tratamiento'))  return `<span class="badge badge-rojo">${estado}</span>`;
  if (e.includes('liberaci') || e.includes('listo')) return `<span class="badge badge-verde">${estado}</span>`;
  return `<span class="badge badge-azul">${estado}</span>`;
}

function badgeEstadoTexto(estado) {
  if (!estado) return '—';
  return estado;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}">
    <div class="empty-state"><p>${msg}</p></div>
  </td></tr>`;
}