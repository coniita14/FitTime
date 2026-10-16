-- =============================================================================
-- FITTIME - 03: CUENTAS DE PRUEBA PARA LA EVALUACIÓN
--
-- PASO PREVIO (una sola vez, en el panel de Supabase):
--   Authentication -> Users -> "Add user" -> "Create new user"
--     1) admin@fittime.com    contraseña: FitTime2026!   [x] Auto Confirm User
--     2) cliente@fittime.com  contraseña: FitTime2026!   [x] Auto Confirm User
--
-- Al crearlas, el trigger on_auth_user_created las vincula con los perfiles de
-- muestra de init_fittime.sql, SIEMPRE con rol CLIENTE (por seguridad).
-- Este script promueve la cuenta admin y deja datos listos para la demo.
-- =============================================================================

BEGIN;

-- 1. Promover la cuenta del administrador (sólo si ya existe en Supabase Auth)
UPDATE public.usuarios
   SET rol = 'ADMIN', activo = TRUE
 WHERE email = 'admin@fittime.com'
   AND auth_user_id IS NOT NULL;

-- 2. El cliente de prueba tiene una rutina activa asignada
INSERT INTO public.rutina_asignada (usuario_id, rutina_id, asignada_por, fecha_inicio, activa, observaciones)
SELECT c.id, r.id, a.id, CURRENT_DATE, TRUE, 'Rutina de prueba para la evaluación.'
  FROM public.usuarios c
  JOIN public.rutinas r ON r.nombre = 'Hipertrofia Tren Superior'
  JOIN public.usuarios a ON a.email = 'admin@fittime.com'
 WHERE c.email = 'cliente@fittime.com'
   AND NOT EXISTS (SELECT 1 FROM public.rutina_asignada x WHERE x.usuario_id = c.id AND x.activa)
ON CONFLICT (usuario_id, rutina_id, fecha_inicio) DO NOTHING;

COMMIT;

-- 3. Verificación: deben aparecer las dos cuentas con auth_vinculado = true
SELECT email, rol, activo, auth_user_id IS NOT NULL AS auth_vinculado
  FROM public.usuarios
 WHERE email IN ('admin@fittime.com', 'cliente@fittime.com')
 ORDER BY rol;
