-- FitTime · 08 · Asistente con IA
-- Lleva la cuenta de consultas diarias por usuario para no agotar el plan
-- gratuito de Gemini. La Edge Function "asistente" llama a asistente_consumir()
-- con el token del usuario antes de cada pregunta.

CREATE TABLE IF NOT EXISTS public.asistente_uso (
  usuario_id INTEGER NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha      DATE    NOT NULL,
  consultas  INTEGER NOT NULL DEFAULT 0 CHECK (consultas >= 0),
  PRIMARY KEY (usuario_id, fecha)
);

ALTER TABLE public.asistente_uso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asistente_uso_read_self ON public.asistente_uso;
CREATE POLICY asistente_uso_read_self ON public.asistente_uso
  FOR SELECT USING (usuario_id = public.current_usuario_id() OR public.current_user_is_admin());

-- Suma una consulta y devuelve cuántas quedan hoy (hora de Argentina).
-- Si ya se llegó al límite lanza LIMITE_ASISTENTE.
CREATE OR REPLACE FUNCTION public.asistente_consumir()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INTEGER := public.current_usuario_id();
  v_hoy     DATE    := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_usadas  INTEGER;
  p_limite  CONSTANT INTEGER := 40; -- consultas por persona por día (fijo en el servidor)
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO';
  END IF;

  INSERT INTO public.asistente_uso (usuario_id, fecha, consultas)
  VALUES (v_usuario, v_hoy, 1)
  ON CONFLICT (usuario_id, fecha)
  DO UPDATE SET consultas = public.asistente_uso.consultas + 1
  WHERE public.asistente_uso.consultas < p_limite
  RETURNING consultas INTO v_usadas;

  IF v_usadas IS NULL THEN
    RAISE EXCEPTION 'LIMITE_ASISTENTE';
  END IF;
  RETURN p_limite - v_usadas;
END;
$$;

REVOKE ALL ON FUNCTION public.asistente_consumir() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asistente_consumir() TO authenticated;
