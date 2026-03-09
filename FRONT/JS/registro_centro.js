const API_URL = 'http://127.0.0.1:8000';

let currentStep = 1;

const totalSteps = 4;


const ICON = {
  institucion: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;opacity:.6"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  contacto:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;opacity:.6"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.66A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
  rep:         `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;opacity:.6"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  fauna:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;opacity:.6"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  desc:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;opacity:.6"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  globe:       `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;opacity:.6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  fb:          `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;opacity:.6"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`,
  ig:          `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;opacity:.6"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
};


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
  if (currentStep === totalSteps) { submitForm(); return; }
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
    btnNext.innerHTML = `Enviar solicitud <i data-lucide="send"></i>`;
    btnNext.className = 'btn btn-submit';
  } else {
    btnNext.innerHTML = `Siguiente <i data-lucide="arrow-right"></i>`;
    btnNext.className = 'btn btn-next';
  }
  if (window.lucide) lucide.createIcons();
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


function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function validEmail(id) {
  const v = val(id);
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validTel(id) {
  const v = val(id);
  return v && /^[0-9+\-\s]{7,15}$/.test(v);
}
function showError(id) { document.getElementById(id)?.classList.add('visible'); }
function hideError(id) { document.getElementById(id)?.classList.remove('visible'); }


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

  const redesArr = [
    val('sitio_web') ? `${ICON.globe}${val('sitio_web')}` : '',
    val('facebook')  ? `${ICON.fb}Facebook`               : '',
    val('instagram') ? `${ICON.ig}Instagram`              : '',
  ].filter(Boolean);
  const redes = redesArr.length ? redesArr.join(' &nbsp;·&nbsp; ') : 'No indicado';

  document.getElementById('resumenGrid').innerHTML = `
    <div class="resumen-card">
      <h4>${ICON.institucion}Institución</h4>
      <div class="resumen-item"><div class="rlabel">Tipo</div><div class="rval">${val('tipo_institucion') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">Nombre</div><div class="rval">${val('nombre_centro') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">Ubicación</div><div class="rval">${val('ciudad')}, ${val('departamento')}</div></div>
      ${val('direccion') ? `<div class="resumen-item"><div class="rlabel">Dirección</div><div class="rval">${val('direccion')}</div></div>` : ''}
    </div>

    <div class="resumen-card">
      <h4>${ICON.contacto}Contacto</h4>
      <div class="resumen-item"><div class="rlabel">Teléfono</div><div class="rval">${val('telefono') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">Email</div><div class="rval">${val('email_centro') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">Redes / Web</div><div class="rval" style="font-size:0.82rem">${redes}</div></div>
    </div>

    <div class="resumen-card">
      <h4>${ICON.rep}Representante</h4>
      <div class="resumen-item"><div class="rlabel">Nombre completo</div><div class="rval">${val('rep_nombre')} ${val('rep_apellido')}</div></div>
      <div class="resumen-item"><div class="rlabel">Cargo</div><div class="rval">${val('rep_cargo') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">NIT / Registro</div><div class="rval">${val('nit') || '—'}</div></div>
      <div class="resumen-item"><div class="rlabel">Email</div><div class="rval">${val('rep_email') || '—'}</div></div>
    </div>

    <div class="resumen-card">
      <h4>${ICON.fauna}Fauna que atienden</h4>
      <div class="resumen-item"><div class="rval">${animales}</div></div>
    </div>

    <div class="resumen-card full">
      <h4>${ICON.desc}Descripción</h4>
      <div class="resumen-item"><div class="rval" style="font-weight:300;line-height:1.6;">${val('descripcion') || '—'}</div></div>
    </div>
  `;
}

async function submitForm() {
  const btnNext = document.getElementById('btnNext');
  btnNext.disabled = true;
  btnNext.textContent = 'Enviando...';

  document.getElementById('submitError')?.remove();

  const payload = {
    nombre:       val('nombre_centro'),
    departamento: val('departamento'),
    direccion:    [val('ciudad'), val('direccion')].filter(Boolean).join(', '),
    telefono:     val('telefono'),
    email:        val('email_centro'),
  };

  try {
    const res = await fetch(`${API_URL}/centros/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }

    document.getElementById('step4').classList.remove('active');
    document.getElementById('formNav').style.display = 'none';
    document.getElementById('successPanel').classList.add('visible');
    document.querySelector('[data-step="4"]').classList.remove('active');
    document.querySelector('[data-step="4"]').classList.add('done');
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressText').textContent = '¡Completado!';
    document.getElementById('progressPct').textContent  = '100%';

  } catch (e) {
    btnNext.disabled = false;
    btnNext.innerHTML = `Enviar solicitud <i data-lucide="send"></i>`;
    btnNext.className = 'btn btn-submit';
    if (window.lucide) lucide.createIcons();

    const errDiv = document.createElement('div');
    errDiv.id = 'submitError';
    errDiv.style.cssText = 'margin-top:1rem;padding:0.9rem 1rem;background:rgba(212,100,90,0.1);border:1px solid rgba(212,100,90,0.3);border-radius:0.75rem;font-size:0.85rem;color:#f0a09a;display:flex;gap:0.5rem;align-items:flex-start;';
    errDiv.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <span>No se pudo enviar la solicitud: ${e.message}. Verifica tu conexión e intenta de nuevo.</span>
    `;
    document.getElementById('step4').appendChild(errDiv);
  }
}
