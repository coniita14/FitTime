-- FitTime · 13 · Al reservar, el cliente elige con qué profesor/a entrena en ese turno
-- Reservar NO cambia el profesor/a principal del cliente (usuarios.profesor_id),
-- que es quien le asigna las rutinas.
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS profesor_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_turnos_profesor ON public.turnos(profesor_id, fecha_turno);

DROP FUNCTION IF EXISTS public.reservar_turno(integer, date);
CREATE OR REPLACE FUNCTION public.reservar_turno(p_horario_id integer, p_fecha_turno date, p_profesor_id integer DEFAULT NULL)
 RETURNS turnos LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
   profile_id INTEGER := public.current_usuario_id();
   booking public.turnos;
   schedule_day public.dia_semana;
   weekday_number INTEGER;
   schedule_start TIME;
   local_now TIMESTAMP := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
BEGIN
   IF auth.uid() IS NULL OR profile_id IS NULL THEN RAISE EXCEPTION 'NO_AUTENTICADO'; END IF;
   IF p_fecha_turno < local_now::DATE THEN RAISE EXCEPTION 'FECHA_INVALIDA'; END IF;

   SELECT dia, hora_inicio INTO schedule_day, schedule_start
   FROM public.horarios WHERE id = p_horario_id AND activo = TRUE;
   IF NOT FOUND THEN RAISE EXCEPTION 'HORARIO_NO_DISPONIBLE'; END IF;

   weekday_number := CASE schedule_day
       WHEN 'DOMINGO' THEN 0 WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3
       WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 WHEN 'SABADO' THEN 6 END;
   IF extract(dow FROM p_fecha_turno)::INTEGER <> weekday_number THEN
       RAISE EXCEPTION 'FECHA_NO_COINCIDE_CON_HORARIO';
   END IF;
   IF p_fecha_turno = local_now::DATE AND schedule_start <= local_now::TIME THEN
       RAISE EXCEPTION 'HORARIO_YA_INICIADO';
   END IF;
   IF p_profesor_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.usuarios WHERE id = p_profesor_id AND rol = 'ENTRENADOR' AND activo) THEN
       RAISE EXCEPTION 'PROFESOR_NO_ENCONTRADO';
   END IF;

   INSERT INTO public.turnos (usuario_id, horario_id, fecha_turno, estado, profesor_id)
   VALUES (profile_id, p_horario_id, p_fecha_turno, 'CONFIRMADO', p_profesor_id)
   RETURNING * INTO booking;
   RETURN booking;
EXCEPTION WHEN unique_violation THEN
   RAISE EXCEPTION 'YA_RESERVADO';
END;
$function$;
GRANT EXECUTE ON FUNCTION public.reservar_turno(integer, date, integer) TO authenticated;

-- El profesor/a elegido para el turno lo ve en "Mis clases"
DROP POLICY IF EXISTS turnos_read_self_or_admin ON public.turnos;
CREATE POLICY turnos_read_self_or_admin ON public.turnos FOR SELECT TO authenticated
  USING (usuario_id = current_usuario_id() OR current_user_is_admin()
         OR profesor_id = current_usuario_id()
         OR (profesor_id IS NULL AND es_entrenador_del_horario(horario_id)));
