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
  resumenEntrenador: () => { listo(); return run(supabase.rpc('entrenador_resumen')); },
  listarEntrenadores: () => {
    listo();
    return run(supabase.from('usuarios').select('id, nombre, apellido').eq('rol', 'ENTRENADOR').eq('activo', true).order('nombre'));
  },

  // ---------- Horarios ----------
  listarHorarios: () => {
    listo();
    return run(supabase.from('horarios')
      .select('id, dia, hora_inicio, hora_fin, cupo_maximo, activo, observaciones, entrenador_id, entrenador:usuarios(nombre, apellido)')
      .order('dia').order('hora_inicio'));
  },
  guardarHorario: ({ id, dia, hora_inicio, hora_fin, cupo_maximo, activo = true, entrenador_id = null, observaciones = '' }) => {
    listo();
    const fila = {
      dia, hora_inicio, hora_fin, cupo_maximo: Number(cupo_maximo), activo, entrenador_id: entrenador_id || null,
      observaciones: observaciones?.trim() || null,
    };
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
      .select('id, nombre, grupo_muscular, descripcion, video_url, activo, musculos, consejos')
      .order('nombre'));
  },
  guardarEjercicio: ({ id, nombre, grupo_muscular, descripcion, video_url, musculos = '', consejos }) => {
    listo();
    const fila = {
      nombre: nombre.trim(),
      grupo_muscular: grupo_muscular.trim(),
      descripcion: descripcion?.trim() || null,
      video_url: video_url?.trim() || null,
      musculos: (Array.isArray(musculos) ? musculos : musculos.split(',')).map((m) => m.trim()).filter(Boolean),
      consejos: consejos?.trim() || null,
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
      .select('id, nombre, objetivo, descripcion, nivel, categoria, duracion_minutos, activa, creada_por, creador:usuarios!rutinas_creada_por_fkey(nombre, apellido, rol), rutina_detalle(id, orden, series, repeticiones, descanso_segundos, ejercicio_id, ejercicios(nombre, grupo_muscular))')
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
  listarUsuarios: (soloClientes = false) => {
    listo();
    const q = supabase.from('usuarios')
      .select('id, nombre, apellido, email, rol, telefono, activo, creado_en, rutina_asignada!rutina_asignada_usuario_id_fkey(activa, observaciones, rutinas(id, nombre))')
      .order('rol').order('apellido');
    return run(soloClientes ? q.eq('rol', 'CLIENTE') : q);
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

  // Alta de cuentas desde el panel (Edge Function "crear-usuario": usa la clave
  // secreta en el servidor, nunca en la app, y verifica que quien llama sea admin).
  crearUsuario: async ({ nombre, apellido, email, telefono, password, rol }) => {
    listo();
    const { data, error } = await supabase.functions.invoke('crear-usuario', {
      body: { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim().toLowerCase(), telefono: telefono?.trim() || null, password, rol },
    });
    if (error) {
      let detalle = null;
      try { detalle = await error.context?.json(); } catch { /* sin cuerpo */ }
      const msg = detalle?.error === 'SOLO_ADMIN' ? 'Sólo un administrador puede crear cuentas.'
        : detalle?.error || 'No se pudo crear la cuenta. Revisá tu conexión.';
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data.usuario;
  },

  // ---------- Entrenadores ----------
  entrenadores: () => { listo(); return run(supabase.rpc('admin_entrenadores')); },
  // Deja asignadas al entrenador exactamente las clases indicadas
  asignarClases: async (entrenadorId, horarioIds) => {
    listo();
    const ids = horarioIds.map(Number);
    let q = supabase.from('horarios').update({ entrenador_id: null }).eq('entrenador_id', entrenadorId);
    if (ids.length) q = q.not('id', 'in', `(${ids.join(',')})`);
    await run(q);
    if (ids.length) await run(supabase.from('horarios').update({ entrenador_id: entrenadorId }).in('id', ids));
  },

  // ---------- Reportes ----------
  reporteTurnos: (desde, hasta) => {
    listo();
    return run(supabase.from('turnos')
      .select('id, fecha_turno, estado, creado_en, cancelado_en, usuarios(nombre, apellido, email), horarios(dia, hora_inicio, hora_fin, usuarios(nombre, apellido))')
      .gte('fecha_turno', desde)
      .lte('fecha_turno', hasta)
      .order('fecha_turno')
      .order('horario_id'));
  },
  reporteUsuarios: () => {
    listo();
    return run(supabase.from('usuarios')
      .select('id, nombre, apellido, email, telefono, rol, activo, creado_en, rutina_asignada!rutina_asignada_usuario_id_fkey(activa, rutinas(nombre))')
      .order('rol').order('apellido'));
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
