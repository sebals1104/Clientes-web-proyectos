/* ---------- Conversión de horas ---------- */

// Convierte "HH:MM" a minutos desde medianoche.
function hhmmToMin(hhmm) {
  const [horas, minutos] = hhmm.split(':').map(Number);
  return horas * 60 + minutos;
}

// Convierte minutos desde medianoche a "HH:MM".
function minutosAHhmm(min) {
  const minutosDelDia = ((min % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosDelDia / 60);
  const minutos = minutosDelDia % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/* ---------- Choque de intervalos ---------- */

// Dos intervalos chocan solo si se solapan; que uno termine cuando empieza el otro no es choque.
function chocanIntervalos(inicioA, finA, inicioB, finB) {
  return hhmmToMin(inicioA) < hhmmToMin(finB) && hhmmToMin(inicioB) < hhmmToMin(finA);
}
