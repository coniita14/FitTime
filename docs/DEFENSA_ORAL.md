# Guion de defensa oral — FitTime

## Presentación sugerida

> FitTime es una aplicación multiplataforma para la gestión de turnos y rutinas de un gimnasio. El cliente está desarrollado con React Native y Expo. Para autenticación y persistencia utilicé Supabase Auth y PostgreSQL con políticas Row Level Security. Un socio puede registrarse, iniciar sesión, consultar sus datos, cambiar su contraseña, consultar su rutina y reservar o cancelar un turno. La disponibilidad y la capacidad se verifican en PostgreSQL, no sólo en la interfaz.
>
> La aplicación permite cambiar entre tema claro y oscuro y programa recordatorios locales en el dispositivo cuando se confirma un turno. El rol de administrador no se elige desde el registro: se asigna desde el panel confiable de Supabase y las operaciones administrativas se restringen con RLS.

## Preguntas técnicas

**¿Cómo se evita que dos personas reserven el último cupo?**  
La función SQL de reserva actualiza atómicamente la ocupación de esa fecha sólo cuando queda capacidad. El índice único parcial impide duplicados por usuario, horario y fecha. La base de datos es la autoridad; el conteo de la app sólo informa disponibilidad.

**¿Por qué Supabase?**  
El trabajo es individual y la consigna permite un backend administrado. Supabase integra Auth, PostgreSQL y RLS, evitando almacenar contraseñas en la tabla de perfiles y permitiendo autorizar cada operación en el servidor de base de datos.

**¿Cómo se asignan roles?**  
El trigger crea cada perfil con `CLIENTE`. El registro no acepta roles elevados. Una cuenta se promueve a `ADMIN` desde el SQL Editor de Supabase; las políticas RLS controlan acciones administrativas.

**¿El recordatorio es una notificación push del servidor?**  
No. La versión actual programa una notificación local en el dispositivo. Para push remoto haría falta un servicio backend/función y gestionar tokens de Expo.

## Límites que deben comunicarse

No presentar como terminados un dashboard administrativo web, una API propia Node/Express, un cron remoto, un APK distribuido o un sitio publicado: no están configurados en este repositorio. El modal QR es ilustrativo y no valida el acceso. La app web/móvil requiere un proyecto Supabase configurado; la landing requiere hosting para ser pública.
