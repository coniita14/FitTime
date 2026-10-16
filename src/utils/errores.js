// Traduce errores de Supabase/PostgreSQL a mensajes claros para el usuario.
const MENSAJES = {
  // Auth
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirmá tu correo antes de iniciar sesión.',
  'User already registered': 'Ya existe una cuenta con ese correo.',
  'JWT expired': 'Tu sesión expiró. Volvé a iniciar sesión.',
  // Funciones SQL de FitTime
  CUPO_COMPLETO: 'Ese horario ya no tiene lugares disponibles.',
  YA_RESERVADO: 'Ya hay un turno confirmado para esa persona en ese horario y fecha.',
  HORARIO_YA_INICIADO: 'Ese turno ya empezó; elegí otro horario.',
  HORARIO_NO_DISPONIBLE: 'El horario fue dado de baja por el gimnasio.',
  FECHA_INVALIDA: 'La fecha elegida ya pasó.',
  FECHA_NO_COINCIDE_CON_HORARIO: 'La fecha no coincide con el día del horario.',
  TURNO_NO_ENCONTRADO_O_YA_CANCELADO: 'El turno ya estaba cancelado.',
  TURNO_NO_ENCONTRADO: 'No se encontró el turno.',
  NO_AUTENTICADO: 'Tu sesión expiró. Volvé a iniciar sesión.',
  SOLO_ADMIN: 'No tenés permisos para esta acción.',
  MOTIVO_REQUERIDO: 'Escribí un motivo de al menos 3 caracteres.',
  ESTADO_SIN_CAMBIOS: 'El turno ya tiene ese estado.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe o está dado de baja.',
  RUTINA_NO_ENCONTRADA: 'La rutina no existe o está desactivada.',
  NO_PUEDE_MODIFICARSE_A_SI_MISMO: 'No podés cambiar tu propio rol ni darte de baja.',
};

const POR_CODIGO_PG = {
  23505: 'Ya existe un registro con esos datos.',
  23503: 'No se puede eliminar porque está en uso. Desactivalo en su lugar.',
  23514: 'Algún valor no es válido (revisá horas, cupos o números).',
  42501: 'No tenés permisos para esta acción.',
};

export const mensajeDeError = (error, porDefecto = 'Ocurrió un error. Intentá de nuevo.') => {
  if (!error) return porDefecto;
  const texto = String(error.message || error);

  if (/Failed to fetch|Network request failed|NetworkError|fetch failed/i.test(texto)) {
    return 'Sin conexión. Revisá tu internet e intentá de nuevo.';
  }
  const clave = Object.keys(MENSAJES).find((k) => texto.includes(k));
  if (clave) return MENSAJES[clave];
  if (error.code && POR_CODIGO_PG[error.code]) return POR_CODIGO_PG[error.code];
  return texto || porDefecto;
};
