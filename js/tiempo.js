function hhmmToMin(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

function minutosAHhmm(min) {
  let m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m/60);
  const mm = m % 60;
  return String(h).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
}

function intervaloMin(inicio, fin) {
  return { ini: hhmmToMin(inicio), fin: hhmmToMin(fin) };
}

function chocanIntervalos(inicioA, finA, inicioB, finB) {
  const a = intervaloMin(inicioA,finA);
  const b = intervaloMin(inicioB,finB);
  if (a.fin <= b.ini) return false;
  if (b.fin <= a.ini) return false;
  return true;
}

function duracionMin(inicio, fin) {
  return hhmmToMin(fin) - hhmmToMin(inicio);
}