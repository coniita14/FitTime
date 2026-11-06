-- FitTime · 12 · Permiso de lectura de profesor_id y horario del gimnasio
-- (la app ya no registra asistencias: un turno queda confirmado o cancelado)

-- La tabla usuarios usa permisos por columna: la app necesita leer profesor_id
GRANT SELECT (profesor_id) ON public.usuarios TO authenticated;

-- El gimnasio abre de 08:00 a 23:00: las clases sólo pueden estar dentro de ese horario
ALTER TABLE public.horarios DROP CONSTRAINT IF EXISTS horarios_dentro_de_apertura;
ALTER TABLE public.horarios ADD CONSTRAINT horarios_dentro_de_apertura
  CHECK (hora_inicio >= TIME '08:00' AND hora_fin <= TIME '23:00' AND hora_fin > hora_inicio);

-- Turnos de una hora de 08:00 a 23:00, de lunes a sábado (se respetan las clases que ya existen)
INSERT INTO public.horarios (dia, hora_inicio, hora_fin, cupo_maximo, activo)
SELECT d.dia::dia_semana, make_time(h, 0, 0), make_time(h + 1, 0, 0), 15, TRUE
FROM unnest(ARRAY['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO']) AS d(dia)
CROSS JOIN generate_series(8, 22) AS h
WHERE NOT EXISTS (
  SELECT 1 FROM public.horarios x
  WHERE x.dia::text = d.dia AND x.hora_inicio < make_time(h + 1, 0, 0) AND x.hora_fin > make_time(h, 0, 0)
);
