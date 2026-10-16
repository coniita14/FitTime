-- =============================================================================
-- FITTIME - 06: Reportes (workframe → Reportes: rutinas más usadas)
-- Agrega a admin_estadisticas(): entrenadores, asistencias del mes y el ranking
-- de rutinas más usadas (asignadas activas + guardadas como favoritas).
-- Ya aplicada en Supabase (Fit-Time).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_estadisticas()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    hoy DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
    resultado JSON;
BEGIN
    IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'SOLO_ADMIN'; END IF;
    SELECT json_build_object(
        'clientes_activos', (SELECT count(*) FROM usuarios WHERE rol = 'CLIENTE' AND activo),
        'clientes_nuevos_mes', (SELECT count(*) FROM usuarios WHERE rol = 'CLIENTE' AND creado_en >= date_trunc('month', hoy)),
        'entrenadores', (SELECT count(*) FROM usuarios WHERE rol = 'ENTRENADOR' AND activo),
        'turnos_hoy', (SELECT count(*) FROM turnos WHERE fecha_turno = hoy AND estado = 'CONFIRMADO'),
        'turnos_proximos_7_dias', (SELECT count(*) FROM turnos WHERE fecha_turno BETWEEN hoy AND hoy + 6 AND estado = 'CONFIRMADO'),
        'cancelaciones_mes', (SELECT count(*) FROM turnos WHERE estado = 'CANCELADO' AND cancelado_en >= date_trunc('month', hoy)),
        'asistencias_mes', (SELECT count(*) FROM turnos WHERE estado = 'COMPLETADO' AND fecha_turno >= date_trunc('month', hoy)),
        'horarios_activos', (SELECT count(*) FROM horarios WHERE activo),
        'rutinas_activas', (SELECT count(*) FROM rutinas WHERE activa),
        'turnos_por_dia', (
            SELECT COALESCE(json_agg(json_build_object('fecha', d::DATE, 'turnos', COALESCE(t.total, 0)) ORDER BY d), '[]'::JSON)
              FROM generate_series(hoy, hoy + 6, INTERVAL '1 day') d
              LEFT JOIN (SELECT fecha_turno, count(*) AS total FROM turnos WHERE estado = 'CONFIRMADO' GROUP BY fecha_turno) t
                ON t.fecha_turno = d::DATE),
        'horarios_mas_concurridos', (
            SELECT COALESCE(json_agg(x ORDER BY x.ocupacion_pct DESC), '[]'::JSON)
              FROM (SELECT h.id, h.dia, to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio, h.cupo_maximo, o.cupo_actual,
                           round(100.0 * o.cupo_actual / h.cupo_maximo) AS ocupacion_pct, o.fecha_turno
                      FROM ocupacion_turno o JOIN horarios h ON h.id = o.horario_id
                     WHERE o.fecha_turno BETWEEN hoy AND hoy + 6
                     ORDER BY ocupacion_pct DESC LIMIT 5) x),
        'rutinas_mas_usadas', (
            SELECT COALESCE(json_agg(x ORDER BY x.total DESC, x.nombre), '[]'::JSON)
              FROM (SELECT r.id, r.nombre, r.categoria,
                           (SELECT count(*) FROM rutina_asignada ra WHERE ra.rutina_id = r.id AND ra.activa) AS asignada,
                           (SELECT count(*) FROM rutinas_guardadas g WHERE g.rutina_id = r.id) AS guardada,
                           (SELECT count(*) FROM rutina_asignada ra WHERE ra.rutina_id = r.id AND ra.activa)
                             + (SELECT count(*) FROM rutinas_guardadas g WHERE g.rutina_id = r.id) AS total
                      FROM rutinas r WHERE r.activa
                     ORDER BY total DESC, r.nombre LIMIT 5) x),
        'rutinas_por_categoria', (
            SELECT COALESCE(json_object_agg(categoria, total), '{}'::JSON)
              FROM (SELECT categoria, count(*) AS total FROM rutinas WHERE activa GROUP BY categoria) c)
    ) INTO resultado;
    RETURN resultado;
END;
$function$;
