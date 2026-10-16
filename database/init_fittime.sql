-- =============================================================================
-- FITTIME - SISTEMA OPERATIVO II / CONSTRUCCIÓN DE SOFTWARE (EPET N° 30)
-- Alumna: Constanza Castillo
-- Archivo: init_fittime.sql (DDL + DML para Supabase PostgreSQL)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS public;

-- Extensión para funciones criptográficas y UUID si fuesen requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('CLIENTE', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE estado_turno AS ENUM ('CONFIRMADO', 'CANCELADO', 'COMPLETADO', 'AUSENTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE dia_semana AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE nivel_dificultad AS ENUM ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLA: USUARIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    rol rol_usuario NOT NULL DEFAULT 'CLIENTE',
    telefono VARCHAR(20),
    google_id VARCHAR(100) UNIQUE,
    push_token VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 3. TABLA: HORARIOS (Franjas horarias y capacidad máxima)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id SERIAL PRIMARY KEY,
    dia dia_semana NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_maximo INT NOT NULL CHECK (cupo_maximo > 0),
    cupo_actual INT NOT NULL DEFAULT 0 CHECK (cupo_actual >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT check_horario_valido CHECK (hora_fin > hora_inicio),
    CONSTRAINT check_cupo_no_excedido CHECK (cupo_actual <= cupo_maximo)
);
COMMENT ON COLUMN horarios.cupo_actual IS
    'Valor legado de inicialización. La ocupación vigente se guarda por fecha en ocupacion_turno.';

-- -----------------------------------------------------------------------------
-- 4. TABLA: TURNOS (Reservas realizadas por los clientes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    horario_id INT NOT NULL REFERENCES horarios(id) ON DELETE RESTRICT,
    fecha_turno DATE NOT NULL,
    estado estado_turno NOT NULL DEFAULT 'CONFIRMADO',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelado_en TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_usuario_horario_fecha UNIQUE (usuario_id, horario_id, fecha_turno)
);

CREATE TABLE IF NOT EXISTS ocupacion_turno (
    horario_id INT NOT NULL REFERENCES horarios(id) ON DELETE CASCADE,
    fecha_turno DATE NOT NULL,
    cupo_actual INT NOT NULL DEFAULT 0 CHECK (cupo_actual >= 0),
    PRIMARY KEY (horario_id, fecha_turno)
);

-- -----------------------------------------------------------------------------
-- 5. TABLA: GESTION_TURNOS (Auditoría de cancelaciones y modificaciones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gestion_turnos (
    id SERIAL PRIMARY KEY,
    turno_id INT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    admin_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo VARCHAR(255) NOT NULL,
    fecha_gestion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. TABLA: EJERCICIOS (Catálogo de ejercicios)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ejercicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    grupo_muscular VARCHAR(60) NOT NULL,
    descripcion TEXT,
    video_url VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. TABLA: RUTINAS (Plantillas diseñadas por administradores o entrenadores)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    objetivo VARCHAR(150) NOT NULL,
    nivel nivel_dificultad NOT NULL DEFAULT 'PRINCIPIANTE',
    creada_por INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 8. TABLA: RUTINA_DETALLE (Relación N a N: Rutinas con Ejercicios)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutina_detalle (
    id SERIAL PRIMARY KEY,
    rutina_id INT NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
    ejercicio_id INT NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
    series INT NOT NULL CHECK (series > 0),
    repeticiones INT NOT NULL CHECK (repeticiones > 0),
    descanso_segundos INT DEFAULT 60 CHECK (descanso_segundos >= 0),
    orden INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_rutina_ejercicio UNIQUE (rutina_id, ejercicio_id)
);

-- -----------------------------------------------------------------------------
-- 9. TABLA: RUTINA_ASIGNADA (Asignación individual a cada alumno)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutina_asignada (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rutina_id INT NOT NULL REFERENCES rutinas(id) ON DELETE RESTRICT,
    asignada_por INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    CONSTRAINT check_fechas_rutina CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- -----------------------------------------------------------------------------
-- 10. ÍNDICES DE OPTIMIZACIÓN
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_turnos_usuario ON turnos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_turno);
CREATE INDEX IF NOT EXISTS idx_horarios_dia ON horarios(dia);
CREATE INDEX IF NOT EXISTS idx_rutina_asignada_usuario ON rutina_asignada(usuario_id) WHERE activa = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_horarios_dia_horas
    ON horarios(dia, hora_inicio, hora_fin);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rutinas_nombre
    ON rutinas(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rutina_asignada_inicio
    ON rutina_asignada(usuario_id, rutina_id, fecha_inicio);

-- -----------------------------------------------------------------------------
-- 11. DML: CARGA INICIAL DE DATOS DE PRUEBA
-- -----------------------------------------------------------------------------

-- 11.1 Perfiles de muestra. Las cuentas de acceso se crean desde Supabase Auth.
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, telefono)
VALUES 
('Constanza', 'Castillo', 'admin@fittime.com', NULL, 'ADMIN', '+542995123456'),
('Carlos', 'Gómez', 'cliente@fittime.com', NULL, 'CLIENTE', '+542994987654'),
('Lucía', 'Martínez', 'lucia.m@gmail.com', NULL, 'CLIENTE', '+542994112233')
ON CONFLICT (email) DO NOTHING;
UPDATE usuarios
SET password_hash = NULL
WHERE email IN ('admin@fittime.com', 'cliente@fittime.com', 'lucia.m@gmail.com')
  AND auth_user_id IS NULL;

-- 11.2 Horarios con cupos
INSERT INTO horarios (dia, hora_inicio, hora_fin, cupo_maximo, cupo_actual, activo)
VALUES 
('LUNES', '08:00:00', '09:00:00', 15, 0, TRUE),
('LUNES', '18:00:00', '19:00:00', 20, 0, TRUE),
('MIERCOLES', '19:00:00', '20:00:00', 20, 0, TRUE)
ON CONFLICT (dia, hora_inicio, hora_fin) DO NOTHING;

-- 11.3 Catálogo de Ejercicios
INSERT INTO ejercicios (nombre, grupo_muscular, descripcion)
VALUES 
('Sentadilla Libre', 'Piernas / Cuádriceps', 'Espalda erguida, bajar controlando hasta romper el paralelo.'),
('Press de Banca Plano', 'Pecho / Pectorales', 'Retracción escapular activa y trayectoria controlada.'),
('Remo con Barra', 'Espalda / Dorsales', 'Inclinación de tronco a 45 grados y codos pegados.'),
('Plancha Frontal', 'Core / Abdominales', 'Alineación recta de columna y activación constante de abdomen.')
ON CONFLICT (nombre) DO NOTHING;

-- 11.4 Rutinas (creadas por el Admin id=1)
INSERT INTO rutinas (nombre, objetivo, nivel, creada_por)
VALUES 
('Hipertrofia Tren Superior', 'Ganancia muscular de pecho, espalda y brazos', 'INTERMEDIO', 1),
('Acondicionamiento General', 'Fuerza base, postura y movilidad general', 'PRINCIPIANTE', 1)
ON CONFLICT (nombre) DO NOTHING;

-- 11.5 Detalle de Ejercicios en las Rutinas
INSERT INTO rutina_detalle (rutina_id, ejercicio_id, series, repeticiones, descanso_segundos, orden)
VALUES 
(1, 2, 4, 10, 90, 1),
(1, 3, 4, 12, 75, 2),
(2, 1, 3, 12, 60, 1),
(2, 4, 3, 30, 45, 2)
ON CONFLICT (rutina_id, ejercicio_id) DO NOTHING;

-- 11.6 Asignación de Rutinas a los Usuarios
INSERT INTO rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa, observaciones)
VALUES 
(2, 1, 1, CURRENT_DATE, TRUE, 'Aumentar carga progresivamente cada 14 días.'),
(3, 2, 1, CURRENT_DATE, TRUE, 'Priorizar control técnico sobre el peso.')
ON CONFLICT (usuario_id, rutina_id, fecha_inicio) DO NOTHING;

-- 11.7 Reservas / Turnos de Prueba
INSERT INTO turnos (usuario_id, horario_id, fecha_turno, estado)
VALUES 
(2, 1, CURRENT_DATE + INTERVAL '1 day', 'CONFIRMADO'),
(3, 2, CURRENT_DATE + INTERVAL '1 day', 'CONFIRMADO')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. AUTENTICACIÓN SUPABASE Y CONTROL DE ACCESO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
   SELECT id FROM public.usuarios
   WHERE auth_user_id = auth.uid() AND activo = TRUE
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
   SELECT EXISTS (
       SELECT 1 FROM public.usuarios
       WHERE auth_user_id = auth.uid() AND rol = 'ADMIN' AND activo = TRUE
   )
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
   full_name TEXT := COALESCE(
       NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''),
       NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
       NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
       split_part(NEW.email, '@', 1)
   );
   first_name TEXT;
   last_name TEXT;
   profile_id INTEGER;
   default_routine_id INTEGER;
BEGIN
   first_name := split_part(full_name, ' ', 1);
   last_name := NULLIF(TRIM(substr(full_name, length(first_name) + 1)), '');

   INSERT INTO public.usuarios (nombre, apellido, email, password_hash, rol, auth_user_id)
   VALUES (first_name, COALESCE(last_name, '-'), lower(NEW.email), NULL, 'CLIENTE', NEW.id)
   ON CONFLICT (email) DO UPDATE
     SET auth_user_id = EXCLUDED.auth_user_id,
         rol = CASE
             WHEN public.usuarios.auth_user_id IS NULL THEN 'CLIENTE'::public.rol_usuario
             ELSE public.usuarios.rol
         END
     WHERE public.usuarios.auth_user_id IS NULL
        OR public.usuarios.auth_user_id = EXCLUDED.auth_user_id
   RETURNING id INTO profile_id;
   IF profile_id IS NULL THEN
       RAISE EXCEPTION 'EMAIL_ALREADY_LINKED';
   END IF;

   SELECT id INTO default_routine_id
   FROM public.rutinas
   ORDER BY id
   LIMIT 1;

   IF default_routine_id IS NOT NULL THEN
       INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa)
       SELECT profile_id, default_routine_id, id, CURRENT_DATE, TRUE
       FROM public.usuarios
       WHERE rol = 'ADMIN'
       ORDER BY id
       LIMIT 1
       ON CONFLICT (usuario_id, rutina_id, fecha_inicio) DO NOTHING;
   END IF;

   RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

INSERT INTO public.usuarios (nombre, apellido, email, password_hash, rol, auth_user_id)
SELECT
   split_part(COALESCE(NULLIF(TRIM(a.raw_user_meta_data->>'nombre'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'name'), ''), split_part(a.email, '@', 1)), ' ', 1),
   COALESCE(NULLIF(TRIM(substr(
       COALESCE(NULLIF(TRIM(a.raw_user_meta_data->>'nombre'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'name'), ''), split_part(a.email, '@', 1)),
       length(split_part(COALESCE(NULLIF(TRIM(a.raw_user_meta_data->>'nombre'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(a.raw_user_meta_data->>'name'), ''), split_part(a.email, '@', 1)), ' ', 1)) + 1
   )), ''), '-'),
   lower(a.email),
   NULL,
   'CLIENTE',
   a.id
FROM auth.users a
WHERE a.email IS NOT NULL
ON CONFLICT (email) DO UPDATE
 SET auth_user_id = EXCLUDED.auth_user_id,
     rol = CASE
         WHEN public.usuarios.auth_user_id IS NULL THEN 'CLIENTE'::public.rol_usuario
         ELSE public.usuarios.rol
     END
 WHERE public.usuarios.auth_user_id IS NULL
    OR public.usuarios.auth_user_id = EXCLUDED.auth_user_id;

-- La capacidad se actualiza dentro de la misma transacción que la reserva.
INSERT INTO public.ocupacion_turno AS occupied (horario_id, fecha_turno, cupo_actual)
SELECT horario_id, fecha_turno, COUNT(*)::INTEGER
FROM public.turnos
WHERE estado = 'CONFIRMADO'
GROUP BY horario_id, fecha_turno
ON CONFLICT (horario_id, fecha_turno)
DO UPDATE SET cupo_actual = EXCLUDED.cupo_actual;

CREATE OR REPLACE FUNCTION public.update_turno_capacity()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
   IF NEW.estado = 'CONFIRMADO'
      AND (TG_OP = 'INSERT' OR OLD.estado <> 'CONFIRMADO') THEN
       INSERT INTO public.ocupacion_turno AS occupied (horario_id, fecha_turno, cupo_actual)
       SELECT NEW.horario_id, NEW.fecha_turno, 1
       WHERE EXISTS (
           SELECT 1 FROM public.horarios
           WHERE id = NEW.horario_id AND activo = TRUE AND cupo_maximo > 0
       )
       ON CONFLICT (horario_id, fecha_turno)
       DO UPDATE SET cupo_actual = occupied.cupo_actual + 1
       WHERE occupied.cupo_actual < (
           SELECT cupo_maximo FROM public.horarios WHERE id = NEW.horario_id AND activo = TRUE
       );
       IF NOT FOUND THEN
           RAISE EXCEPTION 'CUPO_COMPLETO';
       END IF;
   ELSIF TG_OP = 'UPDATE'
      AND OLD.estado = 'CONFIRMADO' AND NEW.estado <> 'CONFIRMADO' THEN
       UPDATE public.ocupacion_turno
       SET cupo_actual = cupo_actual - 1
       WHERE horario_id = OLD.horario_id AND fecha_turno = OLD.fecha_turno AND cupo_actual > 0;
   END IF;
   RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS turnos_capacity_trigger ON public.turnos;
CREATE TRIGGER turnos_capacity_trigger
   AFTER INSERT OR UPDATE OF estado ON public.turnos
   FOR EACH ROW EXECUTE FUNCTION public.update_turno_capacity();

ALTER TABLE public.turnos DROP CONSTRAINT IF EXISTS uq_usuario_horario_fecha;
CREATE UNIQUE INDEX IF NOT EXISTS uq_turno_confirmado
   ON public.turnos(usuario_id, horario_id, fecha_turno)
   WHERE estado = 'CONFIRMADO';

CREATE OR REPLACE FUNCTION public.reservar_turno(p_horario_id INTEGER, p_fecha_turno DATE)
RETURNS public.turnos
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
   profile_id INTEGER := public.current_usuario_id();
   booking public.turnos;
   schedule_day public.dia_semana;
   weekday_number INTEGER;
   schedule_start TIME;
   local_now TIMESTAMP := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
BEGIN
   IF auth.uid() IS NULL OR profile_id IS NULL THEN
       RAISE EXCEPTION 'NO_AUTENTICADO';
   END IF;
   IF p_fecha_turno < local_now::DATE THEN
       RAISE EXCEPTION 'FECHA_INVALIDA';
   END IF;

   SELECT dia, hora_inicio INTO schedule_day, schedule_start
   FROM public.horarios
   WHERE id = p_horario_id AND activo = TRUE;
   IF NOT FOUND THEN
       RAISE EXCEPTION 'HORARIO_NO_DISPONIBLE';
   END IF;

   weekday_number := CASE schedule_day
       WHEN 'DOMINGO' THEN 0
       WHEN 'LUNES' THEN 1
       WHEN 'MARTES' THEN 2
       WHEN 'MIERCOLES' THEN 3
       WHEN 'JUEVES' THEN 4
       WHEN 'VIERNES' THEN 5
       WHEN 'SABADO' THEN 6
   END;
   IF extract(dow FROM p_fecha_turno)::INTEGER <> weekday_number THEN
       RAISE EXCEPTION 'FECHA_NO_COINCIDE_CON_HORARIO';
   END IF;
   IF p_fecha_turno = local_now::DATE AND schedule_start <= local_now::TIME THEN
       RAISE EXCEPTION 'HORARIO_YA_INICIADO';
   END IF;

   INSERT INTO public.turnos (usuario_id, horario_id, fecha_turno, estado)
   VALUES (profile_id, p_horario_id, p_fecha_turno, 'CONFIRMADO')
   RETURNING * INTO booking;
   RETURN booking;
EXCEPTION WHEN unique_violation THEN
   RAISE EXCEPTION 'YA_RESERVADO';
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_horarios_disponibles(
    p_dia public.dia_semana,
    p_fecha_actual DATE,
    p_hora_actual TIME
)
RETURNS TABLE (
    id INTEGER,
    dia public.dia_semana,
    hora_inicio TIME,
    hora_fin TIME,
    cupo_maximo INTEGER,
    cupo_actual INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT h.id, h.dia, h.hora_inicio, h.hora_fin, h.cupo_maximo,
           COALESCE(o.cupo_actual, 0)::INTEGER
    FROM public.horarios h
    CROSS JOIN LATERAL (
        SELECT CASE h.dia
            WHEN 'DOMINGO' THEN 0
            WHEN 'LUNES' THEN 1
            WHEN 'MARTES' THEN 2
            WHEN 'MIERCOLES' THEN 3
            WHEN 'JUEVES' THEN 4
            WHEN 'VIERNES' THEN 5
            WHEN 'SABADO' THEN 6
        END AS weekday_number
    ) wd
    CROSS JOIN LATERAL (
        SELECT ((wd.weekday_number - EXTRACT(DOW FROM p_fecha_actual)::INTEGER + 7) % 7)
            + CASE
                WHEN wd.weekday_number = EXTRACT(DOW FROM p_fecha_actual)::INTEGER
                     AND h.hora_inicio <= p_hora_actual THEN 7
                ELSE 0
              END AS days_until
    ) next_day
    LEFT JOIN public.ocupacion_turno o
      ON o.horario_id = h.id
     AND o.fecha_turno = p_fecha_actual + next_day.days_until
    WHERE h.activo = TRUE AND h.dia = p_dia
    ORDER BY h.hora_inicio
$$;

CREATE OR REPLACE FUNCTION public.cancelar_turno(p_turno_id INTEGER)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
   profile_id INTEGER := public.current_usuario_id();
BEGIN
   IF auth.uid() IS NULL OR profile_id IS NULL THEN
       RAISE EXCEPTION 'NO_AUTENTICADO';
   END IF;
   UPDATE public.turnos
   SET estado = 'CANCELADO', cancelado_en = CURRENT_TIMESTAMP
   WHERE id = p_turno_id
     AND usuario_id = profile_id
     AND estado = 'CONFIRMADO';
   IF NOT FOUND THEN
       RAISE EXCEPTION 'TURNO_NO_ENCONTRADO_O_YA_CANCELADO';
   END IF;
END;
$$;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutina_asignada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutina_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestion_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocupacion_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_read_self_or_admin ON public.usuarios;
CREATE POLICY usuarios_read_self_or_admin ON public.usuarios
   FOR SELECT TO authenticated
   USING (auth_user_id = auth.uid() OR public.current_user_is_admin());
DROP POLICY IF EXISTS usuarios_update_self_or_admin ON public.usuarios;
CREATE POLICY usuarios_update_self_or_admin ON public.usuarios
   FOR UPDATE TO authenticated
   USING (id = public.current_usuario_id() OR public.current_user_is_admin())
   WITH CHECK (id = public.current_usuario_id() OR public.current_user_is_admin());

DROP POLICY IF EXISTS horarios_read_active ON public.horarios;
CREATE POLICY horarios_read_active ON public.horarios
   FOR SELECT TO anon, authenticated USING (activo = TRUE);
DROP POLICY IF EXISTS horarios_admin_all ON public.horarios;
CREATE POLICY horarios_admin_all ON public.horarios
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS turnos_read_self_or_admin ON public.turnos;
CREATE POLICY turnos_read_self_or_admin ON public.turnos
   FOR SELECT TO authenticated
   USING (usuario_id = public.current_usuario_id() OR public.current_user_is_admin());

DROP POLICY IF EXISTS rutina_asignada_read_self_or_admin ON public.rutina_asignada;
CREATE POLICY rutina_asignada_read_self_or_admin ON public.rutina_asignada
   FOR SELECT TO authenticated
   USING (usuario_id = public.current_usuario_id() OR public.current_user_is_admin());

DROP POLICY IF EXISTS ejercicios_read_authenticated ON public.ejercicios;
CREATE POLICY ejercicios_read_authenticated ON public.ejercicios
   FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS rutinas_read_authenticated ON public.rutinas;
CREATE POLICY rutinas_read_authenticated ON public.rutinas
   FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS rutina_detalle_read_authenticated ON public.rutina_detalle;
CREATE POLICY rutina_detalle_read_authenticated ON public.rutina_detalle
   FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS ejercicios_admin_all ON public.ejercicios;
CREATE POLICY ejercicios_admin_all ON public.ejercicios
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS rutinas_admin_all ON public.rutinas;
CREATE POLICY rutinas_admin_all ON public.rutinas
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS rutina_detalle_admin_all ON public.rutina_detalle;
CREATE POLICY rutina_detalle_admin_all ON public.rutina_detalle
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS rutina_asignada_admin_all ON public.rutina_asignada;
CREATE POLICY rutina_asignada_admin_all ON public.rutina_asignada
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());
DROP POLICY IF EXISTS gestion_turnos_admin_all ON public.gestion_turnos;
CREATE POLICY gestion_turnos_admin_all ON public.gestion_turnos
   FOR ALL TO authenticated
   USING (public.current_user_is_admin())
   WITH CHECK (public.current_user_is_admin());

REVOKE ALL ON public.usuarios FROM anon, authenticated;
REVOKE ALL ON public.horarios, public.turnos, public.rutina_asignada,
    public.rutinas, public.rutina_detalle, public.ejercicios, public.ocupacion_turno
    FROM anon, authenticated;
REVOKE ALL ON public.gestion_turnos FROM anon, authenticated;

GRANT SELECT (id, nombre, apellido, email, rol, telefono, auth_user_id, activo)
   ON public.usuarios TO authenticated;
GRANT UPDATE (nombre, apellido, telefono) ON public.usuarios TO authenticated;
GRANT SELECT ON public.horarios TO anon, authenticated;
GRANT SELECT ON public.turnos, public.rutina_asignada, public.rutinas, public.rutina_detalle, public.ejercicios
   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.horarios, public.ejercicios, public.rutinas,
   public.rutina_detalle, public.rutina_asignada TO authenticated;
GRANT SELECT, INSERT ON public.gestion_turnos TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON FUNCTION public.reservar_turno(INTEGER, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancelar_turno(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_horarios_disponibles(public.dia_semana, DATE, TIME) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_usuario_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_auth_user_created() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_turno_capacity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_turno(INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_turno(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_horarios_disponibles(public.dia_semana, DATE, TIME) TO anon, authenticated;
