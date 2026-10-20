// Reglas de contraseña de FitTime (se usan en registro, recuperación,
// cambio de contraseña y alta de usuarios desde el panel).
export const REGLAS_CLAVE = [
  { test: (c) => c.length >= 8, texto: 'Al menos 8 caracteres', falta: 'al menos 8 caracteres' },
  { test: (c) => /[A-Z]/.test(c), texto: 'Al menos una mayúscula', falta: 'una mayúscula' },
  { test: (c) => /\d/.test(c), texto: 'Al menos un número', falta: 'un número' },
  { test: (c) => /[^A-Za-z0-9\s]/.test(c), texto: 'Al menos un carácter especial (!@#$...)', falta: 'un carácter especial' },
];

export const reglasClave = (clave = '') => REGLAS_CLAVE.map((r) => ({ ok: r.test(clave), texto: r.texto }));

export const claveValida = (clave = '') => REGLAS_CLAVE.every((r) => r.test(clave));

// Devuelve un mensaje con lo que le falta a la contraseña, o null si cumple todo.
export const errorDeClave = (clave = '') => {
  if (!clave) return 'Ingresá una contraseña';
  const faltan = REGLAS_CLAVE.filter((r) => !r.test(clave)).map((r) => r.falta);
  if (!faltan.length) return null;
  const lista = faltan.length === 1 ? faltan[0] : `${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`;
  return `A la contraseña le falta: ${lista}.`;
};
