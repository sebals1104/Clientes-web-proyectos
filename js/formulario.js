function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'"&quot;','<':'&lt;','>':'&gt;'}[c]||'&'+c+';')); }

function initFormulario(){
  const form=document.getElementById('form-manual');
  const btnAddSeccion=document.getElementById('btn-add-seccion');
  const seccionesDiv=document.getElementById('form-secciones');
  const msg=document.getElementById('form-manual-msg');
  const listaManuales=document.getElementById('manuales-lista');
  let editandoCodigo=null;
  let secCount=0;
  if(!form) return;

  function limpiarErrores(){ form.querySelectorAll('.err').forEach(e=>e.remove()); if(msg) msg.textContent=''; }
  function setError(el,text){ const span=document.createElement('span'); span.className='err error'; span.textContent=text; el.parentElement.appendChild(span); }

  function renderBloquesSelect(){
    return obtenerBloques().map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.id)} (${escapeHtml(b.tipo)}) ${b.inicio}-${b.fin}</option>`).join('');
  }

  function nuevaSesionHTML(sIdx,sesIdx){
    const opts=renderBloquesSelect();
    return `<div class="card" data-sesion="${sesIdx}">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
        <label>Día<select name="dia-${sIdx}-${sesIdx}" required><option value="">--</option><option value="LUN">LUN</option><option value="MAR">MAR</option><option value="MIE">MIE</option><option value="JUE">JUE</option><option value="VIE">VIE</option><option value="SAB">SAB</option></select></label>
        <label>Bloques<select name="bloques-${sIdx}-${sesIdx}" multiple required>${opts}</select></label>
        <label>Aula<input name="aula-${sIdx}-${sesIdx}" required></label>
        <button type="button" class="secondary btn-del-ses">Eliminar sesión</button>
      </div>
    </div>`;
  }

  function nuevaSeccionHTML(idx){
    return `<div class="card" data-seccion-idx="${idx}">
      <div class="flex">
        <label>ID Sección<input name="sec-id-${idx}" required></label>
        <label>Profesor<input name="sec-prof-${idx}" required></label>
        <button type="button" class="secondary btn-del-sec">Eliminar sección</button>
      </div>
      <div class="grid" data-sesiones-${idx}>${nuevaSesionHTML(idx,0)}</div>
      <button type="button" class="secondary btn-add-ses" data-sidx="${idx}">Agregar sesión</button>
    </div>`;
  }

  function addSeccion(){ secCount++; seccionesDiv.insertAdjacentHTML('beforeend',nuevaSeccionHTML(secCount)); }
  addSeccion();
  if(btnAddSeccion) btnAddSeccion.addEventListener('click',addSeccion);

  seccionesDiv.addEventListener('click',e=>{
    if(e.target.classList.contains('btn-del-sec')){ const c=e.target.closest('[data-seccion-idx]'); if(c) c.remove(); }
    if(e.target.classList.contains('btn-add-ses')){ const c=e.target.closest('[data-seccion-idx]'); if(!c) return; const sIdx=c.getAttribute('data-seccion-idx'); const cont=c.querySelector('[data-sesiones-'+sIdx+']'); if(!cont) return; const sc=cont.querySelectorAll('[data-sesion]').length; cont.insertAdjacentHTML('beforeend',nuevaSesionHTML(sIdx,sc)); }
    if(e.target.classList.contains('btn-del-ses')){ const s=e.target.closest('[data-sesion]'); if(s) s.remove(); }
  });

  function renderManuales(){
    const mans=obtenerMateriasManuales();
    if(!listaManuales) return;
    listaManuales.innerHTML='';
    if(mans.length===0){ listaManuales.innerHTML='<div class="muted">Sin materias manuales.</div>'; return; }
    mans.forEach(m=>{
      const d=document.createElement('div'); d.className='card';
      d.innerHTML=`<div class="flex"><strong>${escapeHtml(m.codigo)} - ${escapeHtml(m.nombre)}</strong><span class="muted">Trim ${m.trimestre} | UC ${m.uc}</span><button class="secondary btn-editar" data-cod="${escapeHtml(m.codigo)}">Editar</button><button class="secondary btn-eliminar" data-cod="${escapeHtml(m.codigo)}">Eliminar</button></div>`;
      listaManuales.appendChild(d);
    });
  }

  if(listaManuales){
    listaManuales.addEventListener('click',e=>{
      if(e.target.classList.contains('btn-eliminar')){ const c=e.target.getAttribute('data-cod'); if(eliminarMateriaManual(c)){ renderManuales(); if(typeof renderCatalogo==='function') renderCatalogo(); } }
      if(e.target.classList.contains('btn-editar')){ const c=e.target.getAttribute('data-cod'); const m=obtenerCatalogoCompleto().find(x=>x.codigo===c); if(m && m.esManual){ /* minimal */ } }
    });
  }

  renderManuales();
}