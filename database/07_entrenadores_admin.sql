-- FitTime · 07 · Sección "Entrenadores" del panel admin y observaciones de horarios
-- Ejecutar después de 06_reportes.sql

ALTER TABLE public.horarios ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Resumen por entrenador: clases a cargo, alumnos con rutina asignada por él,
-- rutinas creadas y asistencias del mes en sus clases. Sólo administradores.
CREATE OR REPLACE FUNCTION public.admin_entrenadores()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'SOLO_ADMIN'; END IF;
    RETURN (
        SELECT COALESCE(json_agg(x ORDER BY x.activo DESC, x.nombre), '[]'::JSON) FROM (
            SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.activo, u.avatar_url, u.creado_en,
                   (SELECT COALESCE(json_agg(json_build_object(
                        'id', h.id, 'dia', h.dia, 'hora_inicio', to_char(h.hora_inicio, 'HH24:MI'),
                        'hora_fin', to_char(h.hora_fin, 'HH24:MI'), 'activo', h.activo)
                        ORDER BY array_position(ARRAY['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO']::dia_semana[], h.dia), h.hora_inicio), '[]'::JSON)
                      FROM horarios h WHERE h.entrenador_id = u.id) AS clases,
                   (SELECT count(DISTINCT ra.usuario_id) FROM rutina_asignada ra WHERE ra.asignada_por = u.id AND ra.activa) AS alumnos,
                   (SELECT count(*) FROM rutinas r WHERE r.creada_por = u.id) AS rutinas_creadas,
                   (SELECT count(*) FROM turnos t JOIN horarios h ON h.id = t.horario_id
                     WHERE h.entrenador_id = u.id AND t.estado = 'COMPLETADO'
                       AND t.fecha_turno >= date_trunc('month', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) AS asistencias_mes
              FROM usuarios u WHERE u.rol = 'ENTRENADOR'
        ) x
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_entrenadores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_entrenadores() TO authenticated;
