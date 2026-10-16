-- =============================================================================
-- FITTIME - 05b: rol ENTRENADOR + datos que piden los wireframes
-- Ejecutar después de 05a_roles_y_categorias.sql.
--   * Entrenador: crea/edita rutinas y ejercicios, asigna rutinas a clientes,
--     ve y gestiona los turnos de SUS clases.
--   * horarios.entrenador_id  -> "Instructor" en el detalle del turno (2E)
--   * ejercicios.musculos / consejos -> "Músculos involucrados" y
--     "Consejos del entrenador" en el detalle del ejercicio (3B)
--   * ejercicios_completados -> progreso "3/8 completados" (3A)
--   * horarios_por_fecha() -> bloques del día elegido en el calendario (2A/2B)
-- =============================================================================

-- ---------- Helpers de rol ----------
CREATE OR REPLACE FUNCTION public.current_user_is_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.usuarios
                   WHERE auth_user_id = auth.uid() AND activo AND rol IN ('ADMIN', 'ENTRENADOR'))
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_entrenador()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.usuarios
                   WHERE auth_user_id = auth.uid() AND activo AND rol = 'ENTRENADOR')
$$;

-- ---------- Columnas nuevas ----------
ALTER TABLE public.horarios
    ADD COLUMN IF NOT EXISTS entrenador_id INT REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_horarios_entrenador ON public.horarios(entrenador_id);

ALTER TABLE public.ejercicios
    ADD COLUMN IF NOT EXISTS musculos TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS consejos TEXT;

CREATE OR REPLACE FUNCTION public.es_entrenador_del_horario(p_horario_id INTEGER)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.horarios
                   WHERE id = p_horario_id AND entrenador_id = public.current_usuario_id())
$$;

-- ---------- Ejercicios completados (progreso del cliente) ----------
CREATE TABLE IF NOT EXISTS public.ejercicios_completados (
    usuario_id INT NOT NULL DEFAULT public.current_usuario_id() REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rutina_detalle_id INT NOT NULL REFERENCES public.rutina_detalle(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE,
    completado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rutina_detalle_id, fecha)
);
ALTER TABLE public.ejercicios_completados ENABLE ROW LEVEL SECURITY;
CREATE POLICY ejercicios_completados_own ON public.ejercicios_completados FOR ALL TO authenticated
    USING (usuario_id = public.current_usuario_id())
    WITH CHECK (usuario_id = public.current_usuario_id());
REVOKE ALL ON public.ejercicios_completados FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.ejercicios_completados TO authenticated;

-- ---------- Permisos: el entrenador gestiona rutinas y ejercicios ----------
ALTER POLICY rutinas_admin_all ON public.rutinas
    USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
ALTER POLICY ejercicios_admin_all ON public.ejercicios
    USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
ALTER POLICY rutina_detalle_admin_all ON public.rutina_detalle
    USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
ALTER POLICY rutina_asignada_admin_all ON public.rutina_asignada
    USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());
ALTER POLICY rutinas_read_authenticated ON public.rutinas
    USING (activa = TRUE OR public.current_user_is_staff());
ALTER POLICY ejercicios_read_authenticated ON public.ejercicios
    USING (activo = TRUE OR public.current_user_is_staff());

-- Usuarios: cada uno ve su perfil; el staff ve a todos; todos ven el nombre de
-- entrenadores y administradores (para mostrar "Instructor" y "Asignada por").
ALTER POLICY usuarios_read_self_or_admin ON public.usuarios
    USING (auth_user_id = auth.uid() OR public.current_user_is_staff() OR rol IN ('ENTRENADOR', 'ADMIN'));

-- Turnos: el entrenador ve los turnos de las clases que dicta
ALTER POLICY turnos_read_self_or_admin ON public.turnos
    USING (usuario_id = public.current_usuario_id()
           OR public.current_user_is_admin()
           OR public.es_entrenador_del_horario(horario_id));

-- El entrenador puede ver también los horarios pausados que dicta
CREATE POLICY horarios_read_entrenador ON public.horarios FOR SELECT TO authenticated
    USING (entrenador_id = public.current_usuario_id());

-- ---------- Funciones de negocio actualizadas ----------
CREATE OR REPLACE FUNCTION public.admin_asignar_rutina(p_usuario_id INTEGER, p_rutina_id INTEGER, p_observaciones TEXT DEFAULT NULL)
RETURNS public.rutina_asignada LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_asignacion public.rutina_asignada;
BEGIN
    IF NOT public.current_user_is_staff() THEN RAISE EXCEPTION 'SOLO_ADMIN'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND activo = TRUE AND rol = 'CLIENTE') THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
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

CREATE OR REPLACE FUNCTION public.admin_gestionar_turno(p_turno_id INTEGER, p_nuevo_estado public.estado_turno, p_motivo TEXT)
RETURNS public.turnos LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_usuario_id INTEGER := public.current_usuario_id();
    v_anterior public.estado_turno;
    v_horario INTEGER;
    v_turno public.turnos;
BEGIN
    IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN RAISE EXCEPTION 'MOTIVO_REQUERIDO'; END IF;
    SELECT estado, horario_id INTO v_anterior, v_horario FROM public.turnos WHERE id = p_turno_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'TURNO_NO_ENCONTRADO'; END IF;
    IF NOT (public.current_user_is_admin()
            OR (public.current_user_is_entrenador() AND public.es_entrenador_del_horario(v_horario))) THEN
        RAISE EXCEPTION 'SOLO_ADMIN';
    END IF;
    IF v_anterior = p_nuevo_estado THEN RAISE EXCEPTION 'ESTADO_SIN_CAMBIOS'; END IF;

    UPDATE public.turnos
       SET estado = p_nuevo_estado,
           cancelado_en = CASE WHEN p_nuevo_estado = 'CANCELADO' THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE id = p_turno_id
    RETURNING * INTO v_turno;

    INSERT INTO public.gestion_turnos (turno_id, admin_id, motivo, estado_anterior, estado_nuevo)
    VALUES (p_turno_id, v_usuario_id, trim(p_motivo), v_anterior, p_nuevo_estado);
    RETURN v_turno;
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'YA_RESERVADO';
END;
$$;

-- Bloques de un día concreto (calendario del cliente)
CREATE OR REPLACE FUNCTION public.horarios_por_fecha(p_fecha DATE)
RETURNS TABLE (id INTEGER, dia public.dia_semana, hora_inicio TIME, hora_fin TIME,
               cupo_maximo INTEGER, cupo_actual INTEGER, entrenador TEXT, ya_reservado BOOLEAN)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH ahora AS (SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires') AS t)
    SELECT h.id, h.dia, h.hora_inicio, h.hora_fin, h.cupo_maximo,
           COALESCE(o.cupo_actual, 0)::INTEGER,
           NULLIF(trim(concat(e.nombre, ' ', NULLIF(e.apellido, '-'))), ''),
           EXISTS (SELECT 1 FROM public.turnos t
                    WHERE t.horario_id = h.id AND t.fecha_turno = p_fecha
                      AND t.estado = 'CONFIRMADO' AND t.usuario_id = public.current_usuario_id())
      FROM public.horarios h
      CROSS JOIN ahora
      LEFT JOIN public.ocupacion_turno o ON o.horario_id = h.id AND o.fecha_turno = p_fecha
      LEFT JOIN public.usuarios e ON e.id = h.entrenador_id
     WHERE h.activo
       AND h.dia = (ARRAY['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'])[EXTRACT(DOW FROM p_fecha)::INT + 1]::public.dia_semana
       AND p_fecha >= ahora.t::DATE
       AND (p_fecha > ahora.t::DATE OR h.hora_inicio > ahora.t::TIME)
     ORDER BY h.hora_inicio
$$;

-- Resumen para la pantalla de inicio del entrenador
CREATE OR REPLACE FUNCTION public.entrenador_resumen()
RETURNS JSON LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = public AS $$
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
        'alumnos_con_rutina', (SELECT count(DISTINCT usuario_id) FROM rutina_asignada WHERE asignada_por = yo AND activa),
        'rutinas_creadas', (SELECT count(*) FROM rutinas WHERE creada_por = yo),
        'clientes_activos', (SELECT count(*) FROM usuarios WHERE rol = 'CLIENTE' AND activo)
    );
END;
$$;

-- Registro: guarda apellido y teléfono del formulario (1D)
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
   meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);
   full_name TEXT := COALESCE(NULLIF(TRIM(meta->>'nombre'), ''), NULLIF(TRIM(meta->>'full_name'), ''),
                              NULLIF(TRIM(meta->>'name'), ''), split_part(NEW.email, '@', 1));
   first_name TEXT;
   last_name TEXT;
   phone TEXT := NULLIF(left(TRIM(meta->>'telefono'), 20), '');
   profile_id INTEGER;
   default_routine_id INTEGER;
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

   SELECT id INTO default_routine_id FROM public.rutinas WHERE activa ORDER BY id LIMIT 1;
   IF default_routine_id IS NOT NULL THEN
       INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa)
       SELECT profile_id, default_routine_id, id, CURRENT_DATE, TRUE
       FROM public.usuarios WHERE rol = 'ADMIN' ORDER BY id LIMIT 1
       ON CONFLICT (usuario_id, rutina_id, fecha_inicio) DO NOTHING;
   END IF;
   RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_is_entrenador() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_entrenador_del_horario(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.horarios_por_fecha(DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.entrenador_resumen() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_auth_user_created() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_entrenador() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_entrenador_del_horario(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.horarios_por_fecha(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.entrenador_resumen() TO authenticated;

-- ---------- Datos: músculos y consejos de los ejercicios ----------
UPDATE public.ejercicios e SET musculos = v.musculos, consejos = COALESCE(e.consejos, v.consejos)
  FROM (VALUES
    ('Sentadilla Libre', ARRAY['Cuádriceps','Glúteos','Isquiotibiales','Core'], 'Evitá que las rodillas sobrepasen la punta de los pies. Respirá en cada repetición.'),
    ('Press de Banca Plano', ARRAY['Pectorales','Tríceps','Deltoides anterior'], 'Mantené los omóplatos juntos y los pies firmes en el piso.'),
    ('Remo con Barra', ARRAY['Dorsales','Romboides','Bíceps'], 'No redondees la espalda; llevá la barra hacia el ombligo.'),
    ('Plancha Frontal', ARRAY['Core','Hombros','Glúteos'], 'Cuerpo en línea recta: no dejes caer la cadera.'),
    ('Peso Muerto', ARRAY['Isquiotibiales','Glúteos','Espalda baja'], 'Empujá el piso con los pies y mantené la barra pegada al cuerpo.'),
    ('Press Militar', ARRAY['Deltoides','Tríceps','Core'], 'Apretá glúteos y abdomen para no arquear la espalda.'),
    ('Dominadas Asistidas', ARRAY['Dorsales','Bíceps','Antebrazos'], 'Bajá lento y controlado hasta estirar los brazos.'),
    ('Zancadas', ARRAY['Cuádriceps','Glúteos','Isquiotibiales'], 'Paso largo y torso erguido; la rodilla de atrás casi toca el piso.'),
    ('Hip Thrust', ARRAY['Glúteos','Isquiotibiales'], 'Mentón hacia el pecho y apretá los glúteos arriba un segundo.'),
    ('Burpees', ARRAY['Piernas','Pectorales','Core','Hombros'], 'Mantené un ritmo constante; priorizá la técnica antes que la velocidad.'),
    ('Saltar la Soga', ARRAY['Gemelos','Hombros','Core'], 'Saltos cortos sobre la punta de los pies; las muñecas giran la soga.'),
    ('Mountain Climbers', ARRAY['Core','Hombros','Cuádriceps'], 'Cadera baja y alineada con los hombros durante todo el ejercicio.')
  ) AS v(nombre, musculos, consejos)
 WHERE e.nombre = v.nombre AND cardinality(e.musculos) = 0;
