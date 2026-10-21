// choques.js - Detecci�n de choques e incompatibilidades
// Usa tiempo.js para comparar intervalos. fin==inicio NO es choque.

function obtenerSesionesDeMateria(materia){
  const ses = [];
  if(!materia || !materia.secciones) return ses;
  materia.secciones.forEach(sec=>{
    if(sec.horario) sec.horario.forEach(h=> ses.push({secId: sec.id, dia: h.dia, bloques: h.bloques||[], aula: h.aula||''}));
  });
  return ses;
}

function sesionChocaCon(s1,s2){
  if(s1.dia !== s2.dia) return false;
  const b1 = obtenerBloques();
  const b2 = obtenerBloques();
  const map = new Map(b1.map(x=>[x.id,x]));
  const m2 = new Map(b2.map(x=>[x.id,x]));
  const get = (id,mapa)=> mapa.get(id);
  // tomar inicio/fin de cada sesi�n: usar primer/�ltimo bloque seg�n inicio/fin
  const getIniFin = (ses,mapa)=>{
    let min=Infinity, max=-Infinity;
    (ses.bloques||[]).forEach(id=>{
      const b=mapa.get(id);
      if(!b) return;
      const i=hhmmToMin(b.inicio), f=hhmmToMin(b.fin);
      if(i<min) min=i; if(f>max) max=f;
    });
    return {ini:min,fin:max};
  };
  const a=getIniFin(s1,map), b=getIniFin(s2,m2);
  if(a.ini===Infinity || b.ini===Infinity) return false;
  return chocanIntervalos(minutosAHhmm(a.ini), minutosAHhmm(a.fin), minutosAHhmm(b.ini), minutosAHhmm(b.fin));
}

function seccionesChocanEntre(seccionA, seccionB){
  const sA = (seccionA && seccionA.horario) ? seccionA.horario : [];
  const sB = (seccionB && seccionB.horario) ? seccionB.horario : [];
  for(let i=0;i<sA.length;i++){
    for(let j=0;j<sB.length;j++){
      if(sesionChocaCon(sA[i], sB[j])) return true;
    }
  }
  return false;
}

function seccionesDisponiblesParaChoques(codigo){
  if(typeof seccionesDisponibles === 'function'){
    const disponibles = seccionesDisponibles(codigo);
    if(disponibles && disponibles.length > 0) return disponibles;
  }
  const materia = obtenerMateriaPorCodigo(codigo);
  return (materia && materia.secciones) ? materia.secciones : [];
}

function detectarIncompatibilidades(seleccion){
  // seleccion: array de codigos de materias seleccionadas (o de entradas de seleccion).
  // Dos materias son incompatibles cuando TODAS las secciones disponibles de una
  // chocan con TODAS las secciones disponibles de la otra (relacion simetrica).
  const res=[];
  const codigos = (seleccion || []).map(e => (typeof e === 'string') ? e : e.codigo);
  const mats = codigos.map(c => obtenerMateriaPorCodigo(c)).filter(m => m);
  for(let i=0;i<mats.length;i++){
    for(let j=i+1;j<mats.length;j++){
      const secsA = seccionesDisponiblesParaChoques(mats[i].codigo);
      const secsB = seccionesDisponiblesParaChoques(mats[j].codigo);
      if(secsA.length===0 || secsB.length===0) continue;
      let todasChocan = true;
      for(let a=0;a<secsA.length && todasChocan;a++){
        for(let b=0;b<secsB.length;b++){
          if(!seccionesChocanEntre(secsA[a], secsB[b])){ todasChocan=false; break; }
        }
      }
      if(todasChocan) res.push({a: mats[i].codigo, b: mats[j].codigo});
    }
  }
  return res;
}