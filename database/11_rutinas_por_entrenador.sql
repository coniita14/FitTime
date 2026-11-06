-- FitTime · 11 · Cada entrenador tiene sus propias rutinas
-- - El entrenador ve, edita y asigna SÓLO las rutinas que cargó él.
-- - El cliente ve sólo las rutinas de su profesor/a (y la que tenga asignada).
-- - El administrador ve todas.
-- - Los ejercicios tienen un link a un video de YouTube (video_url).

CREATE OR REPLACE FUNCTION public.current_profesor_id()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT profesor_id FROM usuarios WHERE id = public.current_usuario_id();
$$;
GRANT EXECUTE ON FUNCTION public.current_profesor_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.puede_ver_rutina(p_rutina_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_is_admin()
      OR EXISTS (SELECT 1 FROM rutinas r WHERE r.id = p_rutina_id AND (
           r.creada_por = public.current_usuario_id()
           OR (r.activa AND r.creada_por = public.current_profesor_id())))
      OR EXISTS (SELECT 1 FROM rutina_asignada ra WHERE ra.rutina_id = p_rutina_id
                   AND ra.usuario_id = public.current_usuario_id() AND ra.activa);
$$;
GRANT EXECUTE ON FUNCTION public.puede_ver_rutina(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.puede_editar_rutina(p_rutina_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_is_admin()
      OR (public.current_user_is_staff()
          AND EXISTS (SELECT 1 FROM rutinas WHERE id = p_rutina_id AND creada_por = public.current_usuario_id()));
$$;
GRANT EXECUTE ON FUNCTION public.puede_editar_rutina(integer) TO authenticated;

-- rutinas
DROP POLICY IF EXISTS rutinas_admin_all ON public.rutinas;
DROP POLICY IF EXISTS rutinas_read_authenticated ON public.rutinas;
DROP POLICY IF EXISTS rutinas_select ON public.rutinas;
CREATE POLICY rutinas_select ON public.rutinas FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR creada_por = public.current_usuario_id()
    OR (activa AND creada_por = public.current_profesor_id())
    OR EXISTS (SELECT 1 FROM public.rutina_asignada ra WHERE ra.rutina_id = rutinas.id
                 AND ra.usuario_id = public.current_usuario_id() AND ra.activa)
  );
DROP POLICY IF EXISTS rutinas_insert ON public.rutinas;
CREATE POLICY rutinas_insert ON public.rutinas FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_staff() AND (creada_por = public.current_usuario_id() OR public.current_user_is_admin()));
DROP POLICY IF EXISTS rutinas_update ON public.rutinas;
CREATE POLICY rutinas_update ON public.rutinas FOR UPDATE TO authenticated
  USING (public.puede_editar_rutina(id))
  WITH CHECK (public.current_user_is_admin() OR creada_por = public.current_usuario_id());
DROP POLICY IF EXISTS rutinas_delete ON public.rutinas;
CREATE POLICY rutinas_delete ON public.rutinas FOR DELETE TO authenticated
  USING (public.puede_editar_rutina(id));

-- rutina_detalle (ejercicios de cada rutina)
DROP POLICY IF EXISTS rutina_detalle_admin_all ON public.rutina_detalle;
DROP POLICY IF EXISTS rutina_detalle_read_authenticated ON public.rutina_detalle;
DROP POLICY IF EXISTS rutina_detalle_select ON public.rutina_detalle;
DROP POLICY IF EXISTS rutina_detalle_write ON public.rutina_detalle;
CREATE POLICY rutina_detalle_select ON public.rutina_detalle FOR SELECT TO authenticated
  USING (public.puede_ver_rutina(rutina_id));
CREATE POLICY rutina_detalle_write ON public.rutina_detalle FOR ALL TO authenticated
  USING (public.puede_editar_rutina(rutina_id))
  WITH CHECK (public.puede_editar_rutina(rutina_id));

-- Al crear, la rutina queda a nombre de quien la crea (el admin puede crearla para otro)
CREATE OR REPLACE FUNCTION public.rutina_dueno()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.creada_por IS NULL OR NOT public.current_user_is_admin() THEN
    NEW.creada_por := public.current_usuario_id();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_rutina_dueno ON public.rutinas;
CREATE TRIGGER trg_rutina_dueno BEFORE INSERT ON public.rutinas
  FOR EACH ROW WHEN (current_setting('request.jwt.claims', true) IS NOT NULL)
  EXECUTE FUNCTION public.rutina_dueno();

-- Asignar: el entrenador sólo asigna SUS rutinas a SUS alumnos
CREATE OR REPLACE FUNCTION public.admin_asignar_rutina(p_usuario_id integer, p_rutina_id integer, p_observaciones text DEFAULT NULL::text)
 RETURNS rutina_asignada LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
    v_asignacion public.rutina_asignada;
BEGIN
    IF NOT public.current_user_is_staff() THEN RAISE EXCEPTION 'SOLO_ADMIN'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND activo = TRUE AND rol = 'CLIENTE') THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;
    IF NOT public.current_user_is_admin()
       AND NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND profesor_id = public.current_usuario_id()) THEN
        RAISE EXCEPTION 'NO_ES_TU_ALUMNO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.rutinas WHERE id = p_rutina_id AND activa = TRUE) THEN
        RAISE EXCEPTION 'RUTINA_NO_ENCONTRADA';
    END IF;
    IF NOT public.current_user_is_admin()
       AND NOT EXISTS (SELECT 1 FROM public.rutinas WHERE id = p_rutina_id AND creada_por = public.current_usuario_id()) THEN
        RAISE EXCEPTION 'NO_ES_TU_RUTINA';
    END IF;
    UPDATE public.rutina_asignada SET activa = FALSE, fecha_fin = CURRENT_DATE
     WHERE usuario_id = p_usuario_id AND activa = TRUE;
    INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa, observaciones)
    VALUES (p_usuario_id, p_rutina_id, public.current_usuario_id(), CURRENT_DATE, TRUE, p_observaciones)
    ON CONFLICT (usuario_id, rutina_id, fecha_inicio)
    DO UPDATE SET activa = TRUE, fecha_fin = NULL, observaciones = EXCLUDED.observaciones, asignada_por = EXCLUDED.asignada_por
    RETURNING * INTO v_asignacion;
    RETURN v_asignacion;
END;
$function$;

-- Las rutinas de ejemplo del gimnasio pasan a ser de Lucas Díaz (entrenador de prueba)
UPDATE public.rutinas SET creada_por = (SELECT id FROM usuarios WHERE email = 'entrenador@fittime.com')
 WHERE creada_por IN (SELECT id FROM usuarios WHERE rol = 'ADMIN')
   AND EXISTS (SELECT 1 FROM usuarios WHERE email = 'entrenador@fittime.com');

-- Las rutinas son para clientes: se desactivan asignaciones viejas a entrenadores/admins
UPDATE public.rutina_asignada ra SET activa = FALSE, fecha_fin = CURRENT_DATE
  FROM public.usuarios u WHERE u.id = ra.usuario_id AND u.rol <> 'CLIENTE' AND ra.activa;

-- Videos de técnica (YouTube) de los ejercicios de ejemplo
ALTER TABLE public.ejercicios ADD COLUMN IF NOT EXISTS video_url text;
UPDATE public.ejercicios e SET video_url = 'https://www.youtube.com/watch?v=' || v.vid
FROM (VALUES ('Sentadilla Libre','9D7zI27gFHM'), ('Press de Banca Plano','fqsTgdTPRQU'), ('Remo con Barra','VBhFIZWMKUs'),
             ('Plancha Frontal','nmX0DysvqcQ'), ('Peso Muerto','7KL8SgCP4KQ'), ('Press Militar','OHxSwnkSxB8'),
             ('Dominadas Asistidas','lgE47t3dr2Q'), ('Zancadas','2IyAyazvmyE'), ('Hip Thrust','2DVaazHpotc'),
             ('Saltar la Soga','AnQwqHgZdoQ'), ('Mountain Climbers','XWlDAy4_Dvw')) AS v(nombre, vid)
WHERE e.nombre = v.nombre AND (e.video_url IS NULL OR e.video_url = '');
