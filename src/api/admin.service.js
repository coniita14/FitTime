import { supabase, supabaseConfigError } from '../config/supabase';

// Todas las operaciones del administrador. Los permisos se validan en PostgreSQL
// (RLS + funciones que verifican current_user_is_admin()), no sólo en la app.

const listo = () => {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
};

const run = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const adminService = {
  // ---------- Estadísticas ----------
  estadisticas: () => { listo(); return run(supabase.rpc('admin_estadisticas')); },

  // ---------- Horarios ----------
  listarHorarios: () => {
    listo();
    return run(supabase.from('horarios')
      .select('id, dia, hora_inicio, hora_fin, cupo_maximo, activo')
      .order('dia').order('hora_inicio'));
  },
  guardarHorario: ({ id, dia, hora_inicio, hora_fin, cupo_maximo, activo = true }) => {
    listo();
    const fila = { dia, hora_inicio, hora_fin, cupo_maximo: Number(cupo_maximo), activo };
    return run(id
      ? supabase.from('horarios').update(fila).eq('id', id).select().single()
      : supabase.from('horarios').insert(fila).select().single());
  },
  cambiarActivoHorario: (id, activo) => { listo(); return run(supabase.from('horarios').update({ activo }).eq('id', id)); },
  eliminarHorario: (id) => { listo(); return run(supabase.from('horarios').delete().eq('id', id)); },

  // ---------- Ejercicios ----------
  listarEjercicios: () => {
    listo();
    return run(supabase.from('ejercicios')
      .select('id, nombre, grupo_muscular, descripcion, video_url, activo')
      .order('nombre'));
  },
  guardarEjercicio: ({ id, nombre, grupo_muscular, descripcion, video_url }) => {
    listo();
    const fila = {
      nombre: nombre.trim(),
      grupo_muscular: grupo_muscular.trim(),
      descripcion: descripcion?.trim() || null,
      video_url: video_url?.trim() || null,
    };
    return run(id
      ? supabase.from('ejercicios').update(fila).eq('id', id).select().single()
      : supabase.from('ejercicios').insert(fila).select().single());
  },
  cambiarActivoEjercicio: (id, activo) => { listo(); return run(supabase.from('ejercicios').update({ activo }).eq('id', id)); },
  eliminarEjercicio: (id) => { listo(); return run(supabase.from('ejercicios').delete().eq('id', id)); },

  // ---------- Rutinas ----------
  listarRutinas: () => {
    listo();
    return run(supabase.from('rutinas')
      .select('id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos, activa, rutina_detalle(id, orden, series, repeticiones, descanso_segundos, ejercicio_id, ejercicios(nombre, grupo_muscular))')
      .order('nombre'));
  },
  guardarRutina: ({ id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos }, creadaPor) => {
    listo();
    const fila = {
      nombre: nombre.trim(),
      objetivo: objetivo.trim(),
      descripcion: descripcion?.trim() || null,
      nivel,
      categoria,
      duracion_minutos: duracion_minutos ? Number(duracion_minutos) : null,
    };
    return run(id
      ? supabase.from('rutinas').update(fila).eq('id', id).select().single()
      : supabase.from('rutinas').insert({ ...fila, creada_por: creadaPor }).select().single());
  },
  cambiarActivaRutina: (id, activa) => { listo(); return run(supabase.from('rutinas').update({ activa }).eq('id', id)); },
  eliminarRutina: (id) => { listo(); return run(supabase.from('rutinas').delete().eq('id', id)); },

  agregarEjercicioARutina: ({ rutina_id, ejercicio_id, series, repeticiones, descanso_segundos, orden }) => {
    listo();
    return run(supabase.from('rutina_detalle').insert({
      rutina_id,
      ejercicio_id,
      series: Number(series),
      repeticiones: Number(repeticiones),
      descanso_segundos: Number(descanso_segundos || 0),
      orden: Number(orden || 1),
    }));
  },
  quitarEjercicioDeRutina: (detalleId) => { listo(); return run(supabase.from('rutina_detalle').delete().eq('id', detalleId)); },

  // ---------- Usuarios ----------
  listarUsuarios: () => {
    listo();
    return run(supabase.from('usuarios')
      .select('id, nombre, apellido, email, rol, telefono, activo, creado_en, rutina_asignada!rutina_asignada_usuario_id_fkey(activa, rutinas(id, nombre))')
      .order('rol').order('apellido'));
  },
  actualizarUsuario: (usuarioId, { rol = null, activo = null }) => {
    listo();
    return run(supabase.rpc('admin_actualizar_usuario', { p_usuario_id: usuarioId, p_rol: rol, p_activo: activo }));
  },
  asignarRutina: (usuarioId, rutinaId, observaciones) => {
    listo();
    return run(supabase.rpc('admin_asignar_rutina', {
      p_usuario_id: usuarioId,
      p_rutina_id: rutinaId,
      p_observaciones: observaciones?.trim() || null,
    }));
  },

  // ---------- Turnos ----------
  listarTurnosDelDia: (fecha) => {
    listo();
    return run(supabase.from('turnos')
      .select('id, fecha_turno, estado, horario_id, horarios(dia, hora_inicio, hora_fin, cupo_maximo), usuarios(nombre, apellido, email)')
      .eq('fecha_turno', fecha)
      .order('horario_id'));
  },
  gestionarTurno: (turnoId, nuevoEstado, motivo) => {
    listo();
    return run(supabase.rpc('admin_gestionar_turno', {
      p_turno_id: turnoId, p_nuevo_estado: nuevoEstado, p_motivo: motivo,
    }));
  },
};
