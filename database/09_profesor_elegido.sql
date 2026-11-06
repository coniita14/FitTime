-- FitTime · 09 · El cliente elige a su profesor/a
-- 1) usuarios.profesor_id: entrenador elegido por cada cliente.
-- 2) elegir_profesor(): lo usa el cliente (app o asistente) y avisa al entrenador.
-- 3) Las rutinas ya no se asignan solas al registrarse: recién las asigna el
--    profesor elegido (o un administrador).
-- 4) Un entrenador solo puede asignar rutinas a sus propios alumnos.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS profesor_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_profesor ON public.usuarios(profesor_id);

-- El profesor tiene que ser un entrenador activo (aunque alguien edite la fila directo)
CREATE OR REPLACE FUNCTION public.validar_profesor()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.profesor_id IS NOT NULL AND NEW.profesor_id IS DISTINCT FROM OLD.profesor_id
     AND NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.profesor_id AND rol = 'ENTRENADOR' AND activo) THEN
    RAISE EXCEPTION 'PROFESOR_NO_ENCONTRADO';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER trg_validar_profesor
  BEFORE UPDATE OF profesor_id ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.validar_profesor();

CREATE OR REPLACE FUNCTION public.elegir_profesor(p_profesor_id INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yo public.usuarios;
  prof public.usuarios;
BEGIN
  SELECT * INTO yo FROM public.usuarios WHERE id = public.current_usuario_id();
  IF yo.id IS NULL THEN RAISE EXCEPTION 'NO_AUTENTICADO'; END IF;
  IF yo.rol <> 'CLIENTE' OR NOT yo.activo THEN RAISE EXCEPTION 'SOLO_CLIENTES'; END IF;
  SELECT * INTO prof FROM public.usuarios WHERE id = p_profesor_id AND rol = 'ENTRENADOR' AND activo;
  IF prof.id IS NULL THEN RAISE EXCEPTION 'PROFESOR_NO_ENCONTRADO'; END IF;

  IF yo.profesor_id IS DISTINCT FROM prof.id THEN
    UPDATE public.usuarios SET profesor_id = prof.id WHERE id = yo.id;
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    VALUES (prof.id, 'GENERAL', 'Nuevo alumno',
            format('%s %s te eligió como profesor/a. Entrá a "Alumnos" para asignarle una rutina.', yo.nombre, NULLIF(yo.apellido, '-')));
  END IF;
  RETURN json_build_object('id', prof.id, 'nombre', prof.nombre, 'apellido', prof.apellido);
END;
$$;
REVOKE ALL ON FUNCTION public.elegir_profesor(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.elegir_profesor(INTEGER) TO authenticated;

-- Asignar rutina: el entrenador solo a sus alumnos; el admin a cualquiera
CREATE OR REPLACE FUNCTION public.admin_asignar_rutina(p_usuario_id INTEGER, p_rutina_id INTEGER, p_observaciones TEXT DEFAULT NULL)
RETURNS public.rutina_asignada LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    UPDATE public.rutina_asignada SET activa = FALSE, fecha_fin = CURRENT_DATE
     WHERE usuario_id = p_usuario_id AND activa = TRUE;
    INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa, observaciones)
    VALUES (p_usuario_id, p_rutina_id, public.current_usuario_id(), CURRENT_DATE, TRUE, p_observaciones)
    ON CONFLICT (usuario_id, rutina_id, fecha_inicio)
    DO UPDATE SET activa = TRUE, fecha_fin = NULL, observaciones = EXCLUDED.observaciones, asignada_por = EXCLUDED.asignada_por
    RETURNING * INTO v_asignacion;
    RETURN v_asignacion;
END;
$$;

-- Registro: ya no se asigna una rutina automática
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
   meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);
   full_name TEXT := COALESCE(NULLIF(TRIM(meta->>'nombre'), ''), NULLIF(TRIM(meta->>'full_name'), ''),
                              NULLIF(TRIM(meta->>'name'), ''), split_part(NEW.email, '@', 1));
   first_name TEXT;
   last_name TEXT;
   phone TEXT := NULLIF(left(TRIM(meta->>'telefono'), 20), '');
   profile_id INTEGER;
BEGIN
   IF NULLIF(TRIM(meta->>'apellido'), '') IS NOT NULL THEN
       first_name := left(full_name, 100);
       last_name := left(TRIM(meta->>'apellido'), 100);
   ELSE
       first_name := split_part(full_name, ' ', 1);
       last_name := NULLIF(TRIM(substr(full_name, length(first_name) + 1)), '');
   END IF;

   INSERT INTO public.usuarios (nombre, apellido, email, password_hash, rol, auth_user_id, telefono)
   VALUES (first_name, COALESCE(last_name, '-'), lower(NEW.email), NULL, 'CLIENTE', NEW.id, phone)
   ON CONFLICT (email) DO UPDATE
     SET auth_user_id = EXCLUDED.auth_user_id,
         telefono = COALESCE(public.usuarios.telefono, EXCLUDED.telefono),
         rol = CASE WHEN public.usuarios.auth_user_id IS NULL THEN 'CLIENTE'::public.rol_usuario
                    ELSE public.usuarios.rol END
     WHERE public.usuarios.auth_user_id IS NULL OR public.usuarios.auth_user_id = EXCLUDED.auth_user_id
   RETURNING id INTO profile_id;
   IF profile_id IS NULL THEN RAISE EXCEPTION 'EMAIL_ALREADY_LINKED'; END IF;
   RETURN NEW;
END;
$$;

-- Resumen del entrenador: cuenta sus alumnos (los que lo eligieron)
CREATE OR REPLACE FUNCTION public.entrenador_resumen()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    yo INTEGER := public.current_usuario_id();
    hoy DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
    dia_hoy public.dia_semana := (ARRAY['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'])[EXTRACT(DOW FROM hoy)::INT + 1]::public.dia_semana;
BEGIN
    IF NOT public.current_user_is_staff() THEN RAISE EXCEPTION 'SOLO_ADMIN'; END IF;
    RETURN json_build_object(
        'clases_hoy', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', h.id, 'hora_inicio', to_char(h.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(h.hora_fin, 'HH24:MI'),
                'cupo_maximo', h.cupo_maximo, 'reservas', COALESCE(o.cupo_actual, 0)) ORDER BY h.hora_inicio), '[]'::JSON)
              FROM horarios h
              LEFT JOIN ocupacion_turno o ON o.horario_id = h.id AND o.fecha_turno = hoy
             WHERE h.entrenador_id = yo AND h.activo AND h.dia = dia_hoy),
        'clases_semana', (SELECT count(*) FROM horarios WHERE entrenador_id = yo AND activo),
        'reservas_7_dias', (SELECT count(*) FROM turnos t JOIN horarios h ON h.id = t.horario_id
                             WHERE h.entrenador_id = yo AND t.estado = 'CONFIRMADO' AND t.fecha_turno BETWEEN hoy AND hoy + 6),
        'alumnos', (SELECT count(*) FROM usuarios WHERE profesor_id = yo AND activo),
        'alumnos_sin_rutina', (SELECT count(*) FROM usuarios u WHERE u.profesor_id = yo AND u.activo
                                 AND NOT EXISTS (SELECT 1 FROM rutina_asignada ra WHERE ra.usuario_id = u.id AND ra.activa)),
        'alumnos_con_rutina', (SELECT count(*) FROM usuarios u WHERE u.profesor_id = yo AND u.activo
                                 AND EXISTS (SELECT 1 FROM rutina_asignada ra WHERE ra.usuario_id = u.id AND ra.activa)),
        'rutinas_creadas', (SELECT count(*) FROM rutinas WHERE creada_por = yo),
        'clientes_activos', (SELECT count(*) FROM usuarios WHERE rol = 'CLIENTE' AND activo)
    );
END;
$$;

-- La app lee profesor_id del perfil (la tabla usuarios usa permisos por columna)
GRANT SELECT (profesor_id) ON public.usuarios TO authenticated;
