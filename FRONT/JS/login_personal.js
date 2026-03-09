const API_URL = 'http://127.0.0.1:8000';


let centroSeleccionado = null;


document.addEventListener('DOMContentLoaded', () => {
  cargarCentros();


  document.getElementById('selectCentro').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarCentro();
  });
  document.getElementById('username').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('password').focus();
  });
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') iniciarSesion();
  });


  document.getElementById('username').addEventListener('input', () => hideError('err_usuario'));
  document.getElementById('password').addEventListener('input', () => hideError('err_password'));
});


async function cargarCentros() {
  const select = document.getElementById('selectCentro');
  try {
    const res = await fetch(`${API_URL}/centros/`);
    if (!res.ok) throw new Error('Error al cargar centros');

    const centros = await res.json();
    select.innerHTML = '<option value="">Selecciona tu centro...</option>';

    if (centros.length === 0) {
      select.innerHTML = '<option value="">No hay centros registrados</option>';
      return;
    }

    centros.filter(c => c.estado === 'aprobado').forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_centro;
      opt.textContent = c.nombre;
      opt.dataset.nombre = c.nombre;
      select.appendChild(opt);
    });

  } catch (err) {
    select.innerHTML = '<option value="">Error al cargar centros</option>';
    document.getElementById('alertaCentros').classList.add('visible');
  }
}


function confirmarCentro() {
  const select = document.getElementById('selectCentro');
  const idx = select.selectedIndex;

  if (!select.value) {
    showError('err_centro');
    return;
  }
  hideError('err_centro');

  centroSeleccionado = {
    id: parseInt(select.value),
    nombre: select.options[idx].dataset.nombre || select.options[idx].text
  };


  document.getElementById('badgeNombre').textContent = centroSeleccionado.nombre;
  
  irFase(2);
}


function cambiarCentro() {
  centroSeleccionado = null;
  ocultarAlerta();
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  irFase(1);
}


async function iniciarSesion() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;


  let valid = true;
  if (!username) { showError('err_usuario'); valid = false; }
  else hideError('err_usuario');

  if (!password) { showError('err_password'); valid = false; }
  else hideError('err_password');

  if (!valid) return;


  setLoading('btnLogin', true);
  ocultarAlerta();


  try {
     const res = await fetch(`${API_URL}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        id_centro: centroSeleccionado.id
      })
    });

    const data = await res.json();

    if (!res.ok) {

      mostrarAlertaLogin(data.detail || 'Usuario o contraseña incorrectos.');
      return;
    }

    sessionStorage.setItem('token',     data.token);
    sessionStorage.setItem('usuario',   JSON.stringify(data.usuario));
    sessionStorage.setItem('rol',       data.usuario.rol);
    sessionStorage.setItem('id_centro', centroSeleccionado.id);

    
    redirigirPorRol(data.usuario.rol);

  } catch (err) {
    mostrarAlertaLogin('No se pudo conectar con el servidor. Intenta nuevamente.');
  } finally {
    setLoading('btnLogin', false);
  }
}

function redirigirPorRol(rol) {
  const rutas = {
    'Admin':         'dashboard_admin.html', 
    'Administrador': 'dashboard_centro.html',      
    'Veterinario':   'dashboard_veterinario.html',  
    'Operador':      'dashboard_operador.html',
  };
  const destino = rutas[rol] || 'dashboard.html';
  window.location.href = destino;
}

function irFase(num) {
  document.querySelectorAll('.fase').forEach(f => f.classList.remove('active'));
  document.getElementById(`fase${num}`).classList.add('active');
}

function togglePassword() {
  const input = document.getElementById('password');
  const btn   = document.getElementById('toggleBtn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

function showError(id)  { document.getElementById(id)?.classList.add('visible'); }
function hideError(id)  { document.getElementById(id)?.classList.remove('visible'); }

function mostrarAlertaLogin(msg) {
  document.getElementById('alertaMsg').textContent = msg;
  document.getElementById('alertaLogin').classList.add('visible');
}
function ocultarAlerta() {
  document.getElementById('alertaLogin')?.classList.remove('visible');
  document.getElementById('alertaCentros')?.classList.remove('visible');
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}
