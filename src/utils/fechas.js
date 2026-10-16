// Utilidades de fechas en español (formato de los wireframes).
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIA_ENUM = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const hoyISO = () => aISO(new Date());

// "Dom 28 Jun 2026"
export const fechaCorta = (iso) => {
  const d = deISO(iso);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};
// "Lun 30 Jun"
export const fechaMini = (iso) => {
  const d = deISO(iso);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};
// "Domingo 28 de Junio, 2026"
export const fechaLarga = (iso) => {
  const d = deISO(iso);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
};
export const hora = (t) => (t || '').slice(0, 5);

// ¿El turno ya empezó/pasó?
export const yaPaso = (fechaIso, horaInicio) => {
  const d = deISO(fechaIso);
  const [h, m] = hora(horaInicio).split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime() <= Date.now();
};

// Link de Google Calendar (sirve en Android, iOS y web sin permisos extra)
export const linkGoogleCalendar = ({ titulo, fechaIso, inicio, fin, detalle, lugar }) => {
  const f = fechaIso.replace(/-/g, '');
  const t = (x) => `${hora(x).replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${f}T${t(inicio)}/${f}T${t(fin)}`,
    details: detalle || '',
    location: lugar || '',
    ctz: 'America/Argentina/Buenos_Aires',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
