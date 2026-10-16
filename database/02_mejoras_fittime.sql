-- =============================================================================
-- FITTIME - MIGRACIÓN 02: requisitos finales del proyecto
-- Autora: Constanza Castillo
-- Ejecutar DESPUÉS de init_fittime.sql (SQL Editor de Supabase).
-- Es idempotente: se puede volver a ejecutar sin romper datos existentes.
--
-- Agrega:
--   1. Categorías de rutinas (Fuerza, Cardio, Tren superior, ...)         [RF7]
--   2. Foto de perfil y preferencias de la cuenta                         [Req. 6 y 7]
--   3. Rutinas guardadas (favoritas) por el cliente                       [RF8]
--   4. Auditoría completa de gestión de turnos (estado anterior/nuevo)    [ER GESTION_TURNOS]
--   5. Historial de notificaciones (confirmación, cancelación, rutina)    [Req. 8]
--   6. Funciones de administración: estado de turnos, asignar rutinas,
--      rol/activo de usuarios y estadísticas del dashboard               [Req. 2, 3, 4, 5]
--   7. Buckets de Storage para avatares e imágenes de rutinas             [Req. 9]
--   8. Datos de prueba adicionales (horarios, ejercicios y rutinas)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CATEGORÍAS DE RUTINAS Y CAMPOS DEL DIAGRAMA ER
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.categoria_rutina AS ENUM (
        'FUERZA', 'CARDIO', 'TREN_SUPERIOR', 'TREN_INFERIOR', 'CUERPO_COMPLETO', 'MOVILIDAD'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.rutinas
    ADD COLUMN IF NOT EXISTS categoria public.categoria_rutina NOT NULL DEFAULT 'CUERPO_COMPLETO',
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS duracion_minutos INT CHECK (duracion_minutos IS NULL OR duracion_minutos > 0),
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.ejercicios
    ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_rutinas_categoria ON public.rutinas(categoria) WHERE activa = TRUE;

UPDATE public.rutinas SET categoria = 'TREN_SUPERIOR',
       descripcion = COALESCE(descripcion, 'Trabajo de pecho y espalda con cargas moderadas.'),
       duracion_minutos = COALESCE(duracion_minutos, 50)
 WHERE nombre = 'Hipertrofia Tren Superior';
UPDATE public.rutinas SET categoria = 'CUERPO_COMPLETO',
       descripcion = COALESCE(descripcion, 'Rutina inicial para ganar fuerza base y mejorar la postura.'),
       duracion_minutos = COALESCE(duracion_minutos, 40)
 WHERE nombre = 'Acondicionamiento General';

-- Los clientes sólo ven rutinas y ejercicios activos; el admin ve todo.
DROP POLICY IF EXISTS rutinas_read_authenticated ON public.rutinas;
CREATE POLICY rutinas_read_authenticated ON public.rutinas
    FOR SELECT TO authenticated
    USING (activa = TRUE OR public.current_user_is_admin());
DROP POLICY IF EXISTS ejercicios_read_authenticated ON public.ejercicios;
CREATE POLICY ejercicios_read_authenticated ON public.ejercicios
    FOR SELECT TO authenticated
    USING (activo = TRUE OR public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 2. PERFIL: FOTO Y PREFERENCIAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS tema_preferido VARCHAR(10) NOT NULL DEFAULT 'SISTEMA',
    ADD COLUMN IF NOT EXISTS notificaciones_activas BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS recordatorio_minutos INT NOT NULL DEFAULT 60;

DO $$ BEGIN
    ALTER TABLE public.usuarios ADD CONSTRAINT check_tema_preferido
        CHECK (tema_preferido IN ('CLARO', 'OSCURO', 'SISTEMA'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE public.usuarios ADD CONSTRAINT check_recordatorio_minutos
        CHECK (recordatorio_minutos BETWEEN 5 AND 1440);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- actualizado_en se mantiene solo
CREATE OR REPLACE FUNCTION public.set_actualizado_en()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS usuarios_set_actualizado_en ON public.usuarios;
CREATE TRIGGER usuarios_set_actualizado_en
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();

-- El cliente puede leer y editar SOLO estas columnas de su propio perfil (RLS ya
-- limita la fila). rol y activo NO se pueden editar desde la app: sólo con
-- public.admin_actualizar_usuario().
GRANT SELECT (id, nombre, apellido, email, rol, telefono, auth_user_id, activo,
              avatar_url, tema_preferido, notificaciones_activas, recordatorio_minutos, creado_en)
    ON public.usuarios TO authenticated;
GRANT UPDATE (nombre, apellido, telefono, avatar_url, tema_preferido,
              notificaciones_activas, recordatorio_minutos, push_token)
    ON public.usuarios TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RUTINAS GUARDADAS (FAVORITAS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rutinas_guardadas (
    usuario_id INT NOT NULL DEFAULT public.current_usuario_id()
        REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rutina_id INT NOT NULL REFERENCES public.rutinas(id) ON DELETE CASCADE,
    guardada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rutina_id)
);
ALTER TABLE public.rutinas_guardadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rutinas_guardadas_own ON public.rutinas_guardadas;
CREATE POLICY rutinas_guardadas_own ON public.rutinas_guardadas
    FOR ALL TO authenticated
    USING (usuario_id = public.current_usuario_id())
    WITH CHECK (usuario_id = public.current_usuario_id());
REVOKE ALL ON public.rutinas_guardadas FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rutinas_guardadas TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. GESTIÓN DE TURNOS (auditoría según el diagrama ER)
-- -----------------------------------------------------------------------------
ALTER TABLE public.gestion_turnos
    ADD COLUMN IF NOT EXISTS estado_anterior public.estado_turno,
    ADD COLUMN IF NOT EXISTS estado_nuevo public.estado_turno;
CREATE INDEX IF NOT EXISTS idx_gestion_turnos_turno ON public.gestion_turnos(turno_id);

-- Ver/insertar en gestion_turnos sólo mediante la función de abajo
REVOKE INSERT ON public.gestion_turnos FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_gestionar_turno(
    p_turno_id INTEGER,
    p_nuevo_estado public.estado_turno,
    p_motivo TEXT
)
RETURNS public.turnos
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id INTEGER := public.current_usuario_id();
    v_anterior public.estado_turno;
    v_turno public.turnos;
BEGIN
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'SOLO_ADMIN';
    END IF;
    IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
        RAISE EXCEPTION 'MOTIVO_REQUERIDO';
    END IF;

    SELECT estado INTO v_anterior FROM public.turnos WHERE id = p_turno_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'TURNO_NO_ENCONTRADO';
    END IF;
    IF v_anterior = p_nuevo_estado THEN
        RAISE EXCEPTION 'ESTADO_SIN_CAMBIOS';
    END IF;

    -- El trigger turnos_capacity_trigger libera u ocupa el cupo automáticamente.
    UPDATE public.turnos
       SET estado = p_nuevo_estado,
           cancelado_en = CASE WHEN p_nuevo_estado = 'CANCELADO' THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE id = p_turno_id
    RETURNING * INTO v_turno;

    INSERT INTO public.gestion_turnos (turno_id, admin_id, motivo, estado_anterior, estado_nuevo)
    VALUES (p_turno_id, v_admin_id, trim(p_motivo), v_anterior, p_nuevo_estado);

    RETURN v_turno;
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'YA_RESERVADO';
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. NOTIFICACIONES (historial dentro de la app)
--    La app muestra además una notificación local (expo-notifications).
--    Para push remoto: Database Webhook -> Edge Function -> Expo Push API
--    usando usuarios.push_token (ver docs/ARQUITECTURA.md).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'CONFIRMACION_TURNO', 'CANCELACION_TURNO', 'RECORDATORIO_TURNO', 'RUTINA_ASIGNADA', 'GENERAL'
    )),
    titulo VARCHAR(120) NOT NULL,
    mensaje TEXT NOT NULL,
    turno_id INT REFERENCES public.turnos(id) ON DELETE SET NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
    ON public.notificaciones(usuario_id, creada_en DESC);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificaciones_read_own ON public.notificaciones;
CREATE POLICY notificaciones_read_own ON public.notificaciones
    FOR SELECT TO authenticated
    USING (usuario_id = public.current_usuario_id());
DROP POLICY IF EXISTS notificaciones_mark_read_own ON public.notificaciones;
CREATE POLICY notificaciones_mark_read_own ON public.notificaciones
    FOR UPDATE TO authenticated
    USING (usuario_id = public.current_usuario_id())
    WITH CHECK (usuario_id = public.current_usuario_id());
DROP POLICY IF EXISTS notificaciones_admin_insert ON public.notificaciones;
CREATE POLICY notificaciones_admin_insert ON public.notificaciones
    FOR INSERT TO authenticated
    WITH CHECK (public.current_user_is_admin());
REVOKE ALL ON public.notificaciones FROM anon, authenticated;
GRANT SELECT ON public.notificaciones TO authenticated;
GRANT UPDATE (leida) ON public.notificaciones TO authenticated;
GRANT INSERT (usuario_id, tipo, titulo, mensaje) ON public.notificaciones TO authenticated;

CREATE OR REPLACE FUNCTION public.notificar_cambio_turno()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dia TEXT;
    v_hora TEXT;
BEGIN
    SELECT replace(replace(initcap(lower(dia::TEXT)), 'Miercoles', 'Miércoles'), 'Sabado', 'Sábado'),
           to_char(hora_inicio, 'HH24:MI')
      INTO v_dia, v_hora
      FROM public.horarios WHERE id = NEW.horario_id;

    IF TG_OP = 'INSERT' AND NEW.estado = 'CONFIRMADO' THEN
        INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, turno_id)
        VALUES (NEW.usuario_id, 'CONFIRMACION_TURNO', 'Turno confirmado',
                format('Reservaste el %s %s a las %s hs.', v_dia, to_char(NEW.fecha_turno, 'DD/MM'), v_hora),
                NEW.id);
    ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'CONFIRMADO' AND NEW.estado = 'CANCELADO' THEN
        INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, turno_id)
        VALUES (NEW.usuario_id, 'CANCELACION_TURNO', 'Turno cancelado',
                format('Se canceló tu turno del %s %s a las %s hs.', v_dia, to_char(NEW.fecha_turno, 'DD/MM'), v_hora),
                NEW.id);
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turnos_notificar ON public.turnos;
CREATE TRIGGER turnos_notificar
    AFTER INSERT OR UPDATE OF estado ON public.turnos
    FOR EACH ROW EXECUTE FUNCTION public.notificar_cambio_turno();

CREATE OR REPLACE FUNCTION public.notificar_rutina_asignada()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    SELECT NEW.usuario_id, 'RUTINA_ASIGNADA', 'Nueva rutina asignada',
           format('Tu entrenador te asignó la rutina "%s".', r.nombre)
      FROM public.rutinas r WHERE r.id = NEW.rutina_id;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rutina_asignada_notificar ON public.rutina_asignada;
CREATE TRIGGER rutina_asignada_notificar
    AFTER INSERT ON public.rutina_asignada
    FOR EACH ROW EXECUTE FUNCTION public.notificar_rutina_asignada();

-- -----------------------------------------------------------------------------
-- 6. FUNCIONES DE ADMINISTRACIÓN
-- -----------------------------------------------------------------------------

-- 6.1 Asignar una rutina a un cliente (desactiva la rutina activa anterior)
CREATE OR REPLACE FUNCTION public.admin_asignar_rutina(
    p_usuario_id INTEGER,
    p_rutina_id INTEGER,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS public.rutina_asignada
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_asignacion public.rutina_asignada;
BEGIN
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'SOLO_ADMIN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND activo = TRUE) THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.rutinas WHERE id = p_rutina_id AND activa = TRUE) THEN
        RAISE EXCEPTION 'RUTINA_NO_ENCONTRADA';
    END IF;

    UPDATE public.rutina_asignada
       SET activa = FALSE, fecha_fin = CURRENT_DATE
     WHERE usuario_id = p_usuario_id AND activa = TRUE;

    INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa, observaciones)
    VALUES (p_usuario_id, p_rutina_id, public.current_usuario_id(), CURRENT_DATE, TRUE, p_observaciones)
    ON CONFLICT (usuario_id, rutina_id, fecha_inicio)
    DO UPDATE SET activa = TRUE, fecha_fin = NULL, observaciones = EXCLUDED.observaciones,
                  asignada_por = EXCLUDED.asignada_por
    RETURNING * INTO v_asignacion;

    RETURN v_asignacion;
END;
$$;

-- 6.2 Cambiar rol o dar de baja/alta a un usuario
CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario(
    p_usuario_id INTEGER,
    p_rol public.rol_usuario DEFAULT NULL,
    p_activo BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'SOLO_ADMIN';
    END IF;
    IF p_usuario_id = public.current_usuario_id() THEN
        RAISE EXCEPTION 'NO_PUEDE_MODIFICARSE_A_SI_MISMO';
    END IF;

    UPDATE public.usuarios
       SET rol = COALESCE(p_rol, rol),
           activo = COALESCE(p_activo, activo)
     WHERE id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO';
    END IF;
END;
$$;

-- 6.3 Estadísticas para la Home del administrador
CREATE OR REPLACE FUNCTION public.admin_estadisticas()
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    hoy DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
    resultado JSON;
BEGIN
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'SOLO_ADMIN';
    END IF;

    SELECT json_build_object(
        'clientes_activos', (SELECT count(*) FROM usuarios WHERE rol = 'CLIENTE' AND activo),
        'clientes_nuevos_mes', (SELECT count(*) FROM usuarios
                                 WHERE rol = 'CLIENTE' AND creado_en >= date_trunc('month', hoy)),
        'turnos_hoy', (SELECT count(*) FROM turnos WHERE fecha_turno = hoy AND estado = 'CONFIRMADO'),
        'turnos_proximos_7_dias', (SELECT count(*) FROM turnos
                                    WHERE fecha_turno BETWEEN hoy AND hoy + 6 AND estado = 'CONFIRMADO'),
        'cancelaciones_mes', (SELECT count(*) FROM turnos
                               WHERE estado = 'CANCELADO' AND cancelado_en >= date_trunc('month', hoy)),
        'horarios_activos', (SELECT count(*) FROM horarios WHERE activo),
        'rutinas_activas', (SELECT count(*) FROM rutinas WHERE activa),
        'turnos_por_dia', (
            SELECT COALESCE(json_agg(json_build_object('fecha', d::DATE, 'turnos', COALESCE(t.total, 0))
                                     ORDER BY d), '[]'::JSON)
              FROM generate_series(hoy, hoy + 6, INTERVAL '1 day') d
              LEFT JOIN (SELECT fecha_turno, count(*) AS total FROM turnos
                          WHERE estado = 'CONFIRMADO' GROUP BY fecha_turno) t
                ON t.fecha_turno = d::DATE
        ),
        'horarios_mas_concurridos', (
            SELECT COALESCE(json_agg(x ORDER BY x.ocupacion_pct DESC), '[]'::JSON)
              FROM (
                SELECT h.id, h.dia, to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio,
                       h.cupo_maximo, o.cupo_actual,
                       round(100.0 * o.cupo_actual / h.cupo_maximo) AS ocupacion_pct,
                       o.fecha_turno
                  FROM ocupacion_turno o
                  JOIN horarios h ON h.id = o.horario_id
                 WHERE o.fecha_turno BETWEEN hoy AND hoy + 6
                 ORDER BY ocupacion_pct DESC
                 LIMIT 5
              ) x
        ),
        'rutinas_por_categoria', (
            SELECT COALESCE(json_object_agg(categoria, total), '{}'::JSON)
              FROM (SELECT categoria, count(*) AS total FROM rutinas WHERE activa GROUP BY categoria) c
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- 6.4 Permisos de ejecución
REVOKE ALL ON FUNCTION public.admin_gestionar_turno(INTEGER, public.estado_turno, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_asignar_rutina(INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_actualizar_usuario(INTEGER, public.rol_usuario, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_estadisticas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notificar_cambio_turno() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notificar_rutina_asignada() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_gestionar_turno(INTEGER, public.estado_turno, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_asignar_rutina(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(INTEGER, public.rol_usuario, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_estadisticas() TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. STORAGE: avatares (cada usuario en su carpeta) e imágenes de rutinas (admin)
--    Ruta esperada del avatar: avatars/<auth.uid()>/avatar.jpg
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NULL THEN
        RAISE NOTICE 'Storage no disponible: se omiten buckets.';
        RETURN;
    END IF;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
           ('rutinas', 'rutinas', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS fittime_avatars_write_own ON storage.objects;
    CREATE POLICY fittime_avatars_write_own ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
    DROP POLICY IF EXISTS fittime_avatars_update_own ON storage.objects;
    CREATE POLICY fittime_avatars_update_own ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
    DROP POLICY IF EXISTS fittime_avatars_delete_own ON storage.objects;
    CREATE POLICY fittime_avatars_delete_own ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
    DROP POLICY IF EXISTS fittime_media_read ON storage.objects;
    CREATE POLICY fittime_media_read ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id IN ('avatars', 'rutinas'));
    DROP POLICY IF EXISTS fittime_rutinas_admin_write ON storage.objects;
    CREATE POLICY fittime_rutinas_admin_write ON storage.objects
        FOR ALL TO authenticated
        USING (bucket_id = 'rutinas' AND public.current_user_is_admin())
        WITH CHECK (bucket_id = 'rutinas' AND public.current_user_is_admin());
END $$;

-- -----------------------------------------------------------------------------
-- 8. DATOS DE PRUEBA ADICIONALES
-- -----------------------------------------------------------------------------
INSERT INTO public.horarios (dia, hora_inicio, hora_fin, cupo_maximo, cupo_actual, activo)
VALUES
    ('LUNES',     '10:00', '11:00', 15, 0, TRUE),
    ('MARTES',    '08:00', '09:00', 15, 0, TRUE),
    ('MARTES',    '18:00', '19:00', 20, 0, TRUE),
    ('MIERCOLES', '08:00', '09:00', 15, 0, TRUE),
    ('JUEVES',    '08:00', '09:00', 15, 0, TRUE),
    ('JUEVES',    '18:00', '19:00', 20, 0, TRUE),
    ('VIERNES',   '08:00', '09:00', 15, 0, TRUE),
    ('VIERNES',   '17:00', '18:00', 20, 0, TRUE),
    ('SABADO',    '10:00', '11:00', 10, 0, TRUE),
    -- Cupo de 1 para probar el mensaje de "cupo agotado" con dos cuentas
    ('SABADO',    '11:00', '12:00',  1, 0, TRUE)
ON CONFLICT (dia, hora_inicio, hora_fin) DO NOTHING;

INSERT INTO public.ejercicios (nombre, grupo_muscular, descripcion)
VALUES
    ('Peso Muerto',          'Espalda baja / Isquiotibiales', 'Barra pegada a las piernas, espalda neutra y empuje con cadera.'),
    ('Press Militar',        'Hombros / Deltoides',           'De pie, core firme, empujar la barra por encima de la cabeza.'),
    ('Dominadas Asistidas',  'Espalda / Dorsales',            'Bajar controlado hasta extender los brazos por completo.'),
    ('Zancadas',             'Piernas / Glúteos',             'Paso largo, rodilla trasera cerca del piso, torso erguido.'),
    ('Hip Thrust',           'Glúteos',                       'Espalda alta apoyada en banco, extender cadera y apretar glúteos.'),
    ('Burpees',              'Cuerpo completo / Cardio',      'Sentadilla, plancha, flexión y salto en un movimiento continuo.'),
    ('Saltar la Soga',       'Cardio',                        'Saltos cortos sobre la punta de los pies, muñecas giran la soga.'),
    ('Mountain Climbers',    'Core / Cardio',                 'En plancha alta, llevar rodillas al pecho alternando rápido.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rutinas (nombre, objetivo, nivel, categoria, descripcion, duracion_minutos, creada_por)
SELECT v.nombre, v.objetivo, v.nivel::public.nivel_dificultad, v.categoria::public.categoria_rutina,
       v.descripcion, v.duracion, a.id
  FROM (VALUES
    ('Fuerza Base 5x5',     'Aumentar la fuerza máxima en básicos', 'INTERMEDIO',   'FUERZA',
        'Tres ejercicios compuestos con cargas altas y descansos largos.', 60),
    ('Cardio HIIT 20',      'Mejorar la resistencia cardiovascular', 'PRINCIPIANTE', 'CARDIO',
        'Intervalos de alta intensidad: 40 segundos de trabajo y 20 de pausa.', 20),
    ('Piernas y Glúteos',   'Fortalecer el tren inferior',           'INTERMEDIO',   'TREN_INFERIOR',
        'Trabajo de cuádriceps, isquios y glúteos.', 45)
  ) AS v(nombre, objetivo, nivel, categoria, descripcion, duracion)
  CROSS JOIN LATERAL (
      SELECT id FROM public.usuarios WHERE rol = 'ADMIN' ORDER BY id LIMIT 1
  ) a
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rutina_detalle (rutina_id, ejercicio_id, series, repeticiones, descanso_segundos, orden)
SELECT r.id, e.id, v.series, v.reps, v.descanso, v.orden
  FROM (VALUES
    ('Fuerza Base 5x5',   'Sentadilla Libre',     5,  5, 180, 1),
    ('Fuerza Base 5x5',   'Press de Banca Plano', 5,  5, 180, 2),
    ('Fuerza Base 5x5',   'Peso Muerto',          3,  5, 180, 3),
    ('Cardio HIIT 20',    'Burpees',              4, 12,  20, 1),
    ('Cardio HIIT 20',    'Mountain Climbers',    4, 30,  20, 2),
    ('Cardio HIIT 20',    'Saltar la Soga',       4, 60,  20, 3),
    ('Piernas y Glúteos', 'Sentadilla Libre',     4, 10,  90, 1),
    ('Piernas y Glúteos', 'Zancadas',             3, 12,  60, 2),
    ('Piernas y Glúteos', 'Hip Thrust',           4, 12,  60, 3)
  ) AS v(rutina, ejercicio, series, reps, descanso, orden)
  JOIN public.rutinas r ON r.nombre = v.rutina
  JOIN public.ejercicios e ON e.nombre = v.ejercicio
ON CONFLICT (rutina_id, ejercicio_id) DO NOTHING;

COMMIT;
