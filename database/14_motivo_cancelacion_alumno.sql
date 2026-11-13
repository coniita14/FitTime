-- FitTime · 14 · El alumno ve el motivo cuando el profesor/a o el gimnasio le cancela un turno
-- Los motivos quedan en gestion_turnos (admin_gestionar_turno). Hasta ahora sólo el
-- administrador podía leer esa tabla; esta política deja que cada alumno lea las
-- gestiones de SUS turnos (sólo lectura: insertar sigue siendo sólo por la función).
GRANT SELECT ON public.gestion_turnos TO authenticated;

DROP POLICY IF EXISTS gestion_turnos_read_alumno ON public.gestion_turnos;
CREATE POLICY gestion_turnos_read_alumno ON public.gestion_turnos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.turnos t
     WHERE t.id = gestion_turnos.turno_id
       AND t.usuario_id = public.current_usuario_id()
  ));
