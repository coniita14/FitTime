import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, supabaseConfigError } from '../config/supabase';

// Funciones del cliente que se suman a gym.service.js:
// catálogo de rutinas, favoritas, notificaciones y foto de perfil.

const listo = () => {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
};

const run = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Decodifica base64 a bytes sin dependencias externas (sirve en Android, iOS y web).
const base64ABytes = (base64) => {
  const tabla = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const limpio = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let j = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const a = tabla.indexOf(limpio[i]);
    const b = tabla.indexOf(limpio[i + 1]);
    const c = tabla.indexOf(limpio[i + 2]);
    const d = tabla.indexOf(limpio[i + 3]);
    bytes[j++] = (a << 2) | (b >> 4);
    if (c >= 0 && limpio[i + 2] !== undefined) bytes[j++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0 && limpio[i + 3] !== undefined) bytes[j++] = ((c & 3) << 6) | d;
  }
  return bytes.slice(0, j);
};

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const COLUMNAS_EJERCICIO = 'id, nombre, grupo_muscular, descripcion, video_url, musculos, consejos';

export const clienteService = {
  // ---------- Horarios y reservas (2A–2C) ----------
  diasConClases: async () => {
    listo();
    const data = await run(supabase.from('horarios').select('dia').eq('activo', true));
    return [...new Set(data.map((h) => h.dia))];
  },
  horariosPorFecha: (fecha) => { listo(); return run(supabase.rpc('horarios_por_fecha', { p_fecha: fecha })); },
  reservar: (horarioId, fecha) => {
    listo();
    return run(supabase.rpc('reservar_turno', { p_horario_id: horarioId, p_fecha_turno: fecha }));
  },

  // ---------- Mis turnos (2D–2E) ----------
  misTurnos: () => {
    listo();
    return run(supabase.from('turnos')
      .select('id, fecha_turno, estado, creado_en, cancelado_en, horario_id, horarios(dia, hora_inicio, hora_fin, cupo_maximo, usuarios(nombre, apellido))')
      .order('fecha_turno', { ascending: false })
      .order('id', { ascending: false }));
  },

  // ---------- Rutinas (2F, 3A, 3B) ----------
  miRutinaAsignada: (usuarioId) => {
    listo();
    return run(supabase.from('rutina_asignada')
      .select('id, rutina_id, observaciones, fecha_inicio, rutinas(id, nombre, objetivo, nivel, categoria), asignador:usuarios!rutina_asignada_asignada_por_fkey(nombre, apellido, rol)')
      .eq('usuario_id', usuarioId)
      .eq('activa', true)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle());
  },
  catalogo: () => {
    listo();
    return run(supabase.from('rutinas')
      .select('id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos, rutina_detalle(count)')
      .eq('activa', true)
      .order('nombre'));
  },
  rutina: (id) => {
    listo();
    return run(supabase.from('rutinas')
      .select(`id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos, rutina_detalle(id, orden, series, repeticiones, descanso_segundos, ejercicios(${COLUMNAS_EJERCICIO}))`)
      .eq('id', id)
      .single());
  },
  completadosHoy: async () => {
    listo();
    const data = await run(supabase.from('ejercicios_completados').select('rutina_detalle_id').eq('fecha', hoyLocal()));
    return data.map((c) => c.rutina_detalle_id);
  },
  marcarCompletado: (detalleId, completado) => {
    listo();
    return completado
      ? run(supabase.from('ejercicios_completados').insert({ rutina_detalle_id: detalleId, fecha: hoyLocal() }))
      : run(supabase.from('ejercicios_completados').delete().eq('rutina_detalle_id', detalleId).eq('fecha', hoyLocal()));
  },

  // ---------- Perfil (3C) ----------
  estadisticasPerfil: async () => {
    listo();
    const contar = async (q) => {
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    };
    const [turnos, guardadas] = await Promise.all([
      contar(supabase.from('turnos').select('id', { count: 'exact', head: true }).in('estado', ['CONFIRMADO', 'COMPLETADO'])),
      contar(supabase.from('rutinas_guardadas').select('rutina_id', { count: 'exact', head: true })),
    ]);
    return { turnos, guardadas };
  },

  // ---------- Catálogo de rutinas ----------
  listarRutinas: () => {
    listo();
    return run(supabase.from('rutinas')
      .select('id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos, rutina_detalle(id, orden, series, repeticiones, descanso_segundos, ejercicios(nombre, grupo_muscular, descripcion))')
      .eq('activa', true)
      .order('nombre'));
  },
  listarFavoritas: async () => {
    listo();
    const data = await run(supabase.from('rutinas_guardadas').select('rutina_id'));
    return data.map((f) => f.rutina_id);
  },
  guardarFavorita: (rutinaId) => { listo(); return run(supabase.from('rutinas_guardadas').insert({ rutina_id: rutinaId })); },
  quitarFavorita: (rutinaId) => { listo(); return run(supabase.from('rutinas_guardadas').delete().eq('rutina_id', rutinaId)); },

  // ---------- Notificaciones (historial en la base) ----------
  listarNotificaciones: () => {
    listo();
    return run(supabase.from('notificaciones')
      .select('id, tipo, titulo, mensaje, leida, creada_en')
      .order('creada_en', { ascending: false })
      .limit(50));
  },
  contarNoLeidas: async () => {
    listo();
    const { count, error } = await supabase.from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('leida', false);
    if (error) throw error;
    return count || 0;
  },
  marcarTodasLeidas: () => { listo(); return run(supabase.from('notificaciones').update({ leida: true }).eq('leida', false)); },

  // Notificación local inmediata al confirmar un turno (Android / iOS).
  notificarConfirmacion: async (horario, fechaTurno) => {
    if (Platform.OS === 'web') return;
    const permiso = await Notifications.getPermissionsAsync();
    if (permiso.status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Turno confirmado ✅',
        body: `Te esperamos el ${fechaTurno.split('-').reverse().slice(0, 2).join('/')} a las ${horario.hora_inicio.slice(0, 5)} hs.`,
      },
      trigger: null,
    });
  },

  // ---------- Preferencias ----------
  guardarPreferencias: (usuarioId, cambios) => {
    listo();
    return run(supabase.from('usuarios').update(cambios).eq('id', usuarioId));
  },

  // ---------- Foto de perfil ----------
  // asset: resultado de expo-image-picker con base64: true
  subirAvatar: async (usuarioId, authId, asset) => {
    listo();
    if (!asset?.base64) throw new Error('No se pudo leer la imagen seleccionada.');
    const tipo = asset.mimeType || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) {
      throw new Error('Elegí una imagen JPG, PNG o WEBP.');
    }
    const bytes = base64ABytes(asset.base64);
    if (bytes.length > 2 * 1024 * 1024) throw new Error('La imagen supera los 2 MB. Elegí una más liviana.');

    const extension = tipo.split('/')[1].replace('jpeg', 'jpg');
    const ruta = `${authId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(ruta, bytes, { contentType: tipo, upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(ruta);
    const url = `${data.publicUrl}?v=${Date.now()}`; // evita que se muestre la foto vieja en caché
    await run(supabase.from('usuarios').update({ avatar_url: url }).eq('id', usuarioId));
    return url;
  },
};
