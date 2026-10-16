-- =============================================================================
-- FITTIME - 05a: nuevos valores de enumerados
-- Se ejecuta SOLO, antes de 05b (PostgreSQL no permite usar un valor nuevo de
-- un ENUM en la misma transacción en la que se agrega).
-- =============================================================================
ALTER TYPE public.rol_usuario ADD VALUE IF NOT EXISTS 'ENTRENADOR';
ALTER TYPE public.categoria_rutina ADD VALUE IF NOT EXISTS 'PERDIDA_PESO';
