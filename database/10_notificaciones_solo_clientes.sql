-- FitTime · 10 · Las notificaciones son sólo para clientes
-- Entrenadores y administradores no reciben avisos: cualquier notificación dirigida
-- a una cuenta que no sea CLIENTE se descarta antes de guardarse.
CREATE OR REPLACE FUNCTION public.notificacion_solo_clientes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = NEW.usuario_id AND rol = 'CLIENTE') THEN
    RETURN NULL; -- se descarta en silencio
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacion_solo_clientes ON public.notificaciones;
CREATE TRIGGER trg_notificacion_solo_clientes
  BEFORE INSERT ON public.notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.notificacion_solo_clientes();

-- Limpia avisos viejos de entrenadores y administradores
DELETE FROM public.notificaciones n
USING public.usuarios u
WHERE u.id = n.usuario_id AND u.rol <> 'CLIENTE';
