// choques.js - Detección de choques e incompatibilidades
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
  // tomar inicio/fin de cada sesión: usar primer/último bloque según inicio/fin
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

function detectarIncompatibilidades(seleccion){
  // seleccion: array de códigos de materias seleccionadas
  const res=[];
  const cat=obtenerCatalogoCompleto();
  const mats=cat.filter(m=> seleccion.includes(m.codigo));
  for(let i=0;i<mats.length;i++){
    const A=mats[i], sA=obtenerSesionesDeMateria(A);
    for(let j=i+1;j<mats.length;j++){
      const B=mats[j], sB=obtenerSesionesDeMateria(B);
      let todasAChocanConB=true;
      if(sA.length===0 || sB.length===0){ todasAChocanConB=false; }
      else {
        for(let k=0;k<sA.length;k++){
          let chocaAlguna=false;
          for(let p=0;p<sB.length;p++){
            if(sesionChocaCon(sA[k],sB[p])){ chocaAlguna=true; break; }
          }
          if(!chocaAlguna){ todasAChocanConB=false; break; }
        }
      }
      if(todasAChocanConB){
        // también chequear simétrico
        res.push({a:A.codigo,b:B.codigo});
      }
    }
  }
  return res;
}