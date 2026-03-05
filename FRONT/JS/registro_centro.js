let currentStep = 1;

const totalSteps = 4;


document.addEventListener('DOMContentLoaded', () => {


  const soloLetras = /[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g;
  ['rep_nombre', 'rep_apellido'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('maxlength', '60');
    el.addEventListener('input', () => {
      const pos = el.selectionStart;
      el.value = el.value.replace(soloLetras, '');
      el.setSelectionRange(pos, pos);
    });
  });


  const limites = { nombre_centro: 120, ciudad: 60, rep_cargo: 60 };
  Object.entries(limites).forEach(([id, max]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('maxlength', max);
  });


  const nitEl = document.getElementById('nit');
  if (nitEl) {
    nitEl.setAttribute('maxlength', '12');
    nitEl.setAttribute('inputmode', 'numeric');
    nitEl.addEventListener('input', () => {
      nitEl.value = nitEl.value.replace(/[^0-9]/g, '');
    });
  }


  const soloTel = /[^0-9+\-\s]/g;
  ['telefono', 'rep_telefono'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('maxlength', '15');
    el.setAttribute('inputmode', 'tel');
    el.addEventListener('input', () => {
      el.value = el.value.replace(soloTel, '');
    });
  });

});


function nextStep() {
  
  if (!validateStep(currentStep)) return;
  if (currentStep === totalSteps) {
    submitForm();
    return;
  }
  goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function goToStep(step) {
  
  document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
  document.querySelector(`[data-step="${currentStep}"]`).classList.add('done');

  
  if (step < currentStep) {
    document.querySelector(`[data-step="${currentStep}"]`).classList.remove('done');
  }

  
  document.getElementById(`step${currentStep}`).classList.remove('active');

  currentStep = step;


  document.getElementById(`step${currentStep}`).classList.add('active');
  document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');
  document.querySelector(`[data-step="${currentStep}"]`).classList.remove('done');

  updateProgress();
  updateNavButtons();


  if (currentStep === 4) fillResumen();
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  const pct = Math.round((currentStep / totalSteps) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `Paso ${currentStep} de ${totalSteps}`;
  document.getElementById('progressPct').textContent = pct + '%';
}

function updateNavButtons() {
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  btnPrev.style.visibility = currentStep > 1 ? 'visible' : 'hidden';

  if (currentStep === totalSteps) {
    btnNext.textContent = '✓ Enviar solicitud';
    btnNext.className = 'btn btn-submit';
  } else {
    btnNext.textContent = 'Siguiente →';
    btnNext.className = 'btn btn-next';
  }
}


function validateStep(step) {
  let valid = true;

  if (step === 1) {
    
    if (!document.getElementById('tipo_institucion').value) {
      showError('err_tipo'); valid = false;
    } else hideError('err_tipo');


    if (!val('nombre_centro')) { showError('err_nombre'); valid = false; }
    else hideError('err_nombre');


    if (!val('departamento')) { showError('err_depto'); valid = false; }
    else hideError('err_depto');


    if (!val('ciudad')) { showError('err_ciudad'); valid = false; }
    else hideError('err_ciudad');


    const checked = document.querySelectorAll('#tiposAnimales input:checked');
    if (checked.length === 0) { showError('err_animales'); valid = false; }
    else hideError('err_animales');
  }

  if (step === 2) {
    if (!validTel('telefono')) { showError('err_telefono'); valid = false; }
    else hideError('err_telefono');

    if (!validEmail('email_centro')) { showError('err_email'); valid = false; }
    else hideError('err_email');

    if (!val('descripcion')) { showError('err_descripcion'); valid = false; }
    else hideError('err_descripcion');
  }

  if (step === 3) {

    ['rep_nombre', 'rep_apellido'].forEach(id => {
      const v = val(id);
      if (!v || /\d/.test(v)) { showError(`err_${id}`); valid = false; }
      else hideError(`err_${id}`);
    });

    if (!val('rep_cargo')) { showError('err_rep_cargo'); valid = false; }
    else hideError('err_rep_cargo');


    const nit = val('nit');
    if (!nit || !/^\d+$/.test(nit)) { showError('err_nit'); valid = false; }
    else hideError('err_nit');

    if (!validEmail('rep_email')) { showError('err_rep_email'); valid = false; }
    else hideError('err_rep_email');
  }

  return valid;
}


function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}
function validEmail(id) {
  const v = val(id);
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validTel(id) {
  const v = val(id);
  return v && /^[0-9+\-\s]{7,15}$/.test(v);
}
function showError(id) {
  document.getElementById(id)?.classList.add('visible');
}
function hideError(id) {
  document.getElementById(id)?.classList.remove('visible');
}


function selectTipo(btn, value) {
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('tipo_institucion').value = value;
  hideError('err_tipo');
}


function toggleCheck(label) {
  setTimeout(() => {
    const input = label.querySelector('input');
    label.classList.toggle('checked', input.checked);

    const checked = document.querySelectorAll('#tiposAnimales input:checked');
    if (checked.length > 0) hideError('err_animales');
  }, 0);
}


function fillResumen() {
  const animales = [...document.querySelectorAll('#tiposAnimales input:checked')]
    .map(i => i.value).join(', ') || '—';

  const redes = [
    val('sitio_web') ? `🌐 ${val('sitio_web')}` : '',
    val('facebook')  ? `📘 Facebook` : '',
    val('instagram') ? `📸 Instagram` : '',
  ].filter(Boolean).join(' · ') || 'No indicado';

  document.getElementById('resumenGrid').innerHTML = `
    <div class="resumen-card">
      <h4>🏛️ Institución</h4>
      <div class="resumen-item">
        <div class="rlabel">Tipo</div>
        <div class="rval">${val('tipo_institucion') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Nombre</div>
        <div class="rval">${val('nombre_centro') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Ubicación</div>
        <div class="rval">${val('ciudad')}, ${val('departamento')}</div>
      </div>
      ${val('direccion') ? `<div class="resumen-item"><div class="rlabel">Dirección</div><div class="rval">${val('direccion')}</div></div>` : ''}
    </div>

    <div class="resumen-card">
      <h4>📞 Contacto</h4>
      <div class="resumen-item">
        <div class="rlabel">Teléfono</div>
        <div class="rval">${val('telefono') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Email</div>
        <div class="rval">${val('email_centro') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Redes / Web</div>
        <div class="rval">${redes}</div>
      </div>
    </div>

    <div class="resumen-card">
      <h4>👤 Representante</h4>
      <div class="resumen-item">
        <div class="rlabel">Nombre completo</div>
        <div class="rval">${val('rep_nombre')} ${val('rep_apellido')}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Cargo</div>
        <div class="rval">${val('rep_cargo') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">NIT / Registro</div>
        <div class="rval">${val('nit') || '—'}</div>
      </div>
      <div class="resumen-item">
        <div class="rlabel">Email</div>
        <div class="rval">${val('rep_email') || '—'}</div>
      </div>
    </div>

    <div class="resumen-card">
      <h4>🐾 Fauna que atienden</h4>
      <div class="resumen-item">
        <div class="rval">${animales}</div>
      </div>
    </div>

    <div class="resumen-card full">
      <h4>📝 Descripción</h4>
      <div class="resumen-item">
        <div class="rval" style="font-weight:300; line-height:1.6;">${val('descripcion') || '—'}</div>
      </div>
    </div>
  `;
}


function submitForm() {


  document.getElementById('step4').classList.remove('active');
  document.getElementById('formNav').style.display = 'none';
  document.getElementById('successPanel').classList.add('visible');


  document.querySelector('[data-step="4"]').classList.remove('active');
  document.querySelector('[data-step="4"]').classList.add('done');

  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressText').textContent = '¡Completado!';
  document.getElementById('progressPct').textContent = '100%';
}

