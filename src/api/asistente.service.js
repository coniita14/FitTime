import { supabase, supabaseConfigError } from '../config/supabase';

// Asistente con IA (Edge Function "asistente").
// La clave de Gemini está en el servidor; la app sólo manda la conversación.
const ERRORES = {
  ASISTENTE_NO_CONFIGURADO: 'El asistente todavía no está activado en el gimnasio.',
  LIMITE_ASISTENTE: 'Llegaste al límite de consultas de hoy. Mañana podés seguir preguntando.',
  IA_OCUPADA: 'El asistente está con mucha demanda. Probá de nuevo en un minuto.',
  IA_ERROR: 'El asistente no pudo responder. Probá de nuevo en un rato.',
  NO_AUTENTICADO: 'Tu sesión expiró. Volvé a iniciar sesión.',
  CUENTA_INACTIVA: 'Tu cuenta está dada de baja.',
};

export const asistenteService = {
  // mensajes: [{ rol: 'usuario' | 'asistente', texto }]
  // Devuelve { respuesta, acciones: [{ tipo, titulo, detalle, horario_id?, fecha?, turno_id? }], restantes }
  async preguntar(mensajes) {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    const { data, error } = await supabase.functions.invoke('asistente', {
      body: { mensajes: mensajes.map(({ rol, texto }) => ({ rol, texto })) },
    });
    if (error) {
      let detalle = null;
      try { detalle = await error.context?.json(); } catch { /* sin cuerpo */ }
      throw new Error(ERRORES[detalle?.error] || 'No se pudo conectar con el asistente. Revisá tu conexión.');
    }
    if (data?.error) throw new Error(ERRORES[data.error] || data.error);
    return { respuesta: data.respuesta, acciones: data.acciones || [], restantes: data.restantes };
  },
};
