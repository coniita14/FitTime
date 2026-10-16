# Guía de pruebas de FitTime — para el profesor

**Proyecto:** FitTime · **Autora:** Constanza Castillo · Técnica en Programación · 2026

Esta guía permite evaluar los 12 requisitos obligatorios en unos 20 minutos. No hace falta instalar nada en la computadora: la app usa un servidor en la nube (Supabase), no `localhost`.

---

## 1. Acceso

| Plataforma | Cómo entrar |
|---|---|
| **Android (recomendado)** | Escanear el QR de la landing o abrir `[COMPLETAR: link del APK]` → descargar → instalar (permitir "orígenes desconocidos" si lo pide). |
| **Expo Go** | Instalar Expo Go desde Play Store y escanear el QR `[COMPLETAR: link de Expo Go]`. |
| **Navegador (dashboard admin)** | Abrir `[COMPLETAR: URL web]`. |
| **Landing** | `[COMPLETAR: URL de la landing]` |

> El inicio de sesión con Google funciona en el APK y en la web. En Expo Go usar correo y contraseña.

## 2. Credenciales de prueba

| Rol | Correo | Contraseña | Para probar |
|---|---|---|---|
| Administrador | `admin@fittime.com` | `FitTime2026!` | Dashboard, ABM, usuarios, turnos, estadísticas |
| Cliente | `cliente@fittime.com` | `FitTime2026!` | Reservas, rutinas, perfil, notificaciones |
| Entrenador | `entrenador@fittime.com` | `FitTime2026!` | Sus clases, alumnos, rutinas y consejos de ejercicios |

Son cuentas de demostración sin datos reales; la contraseña se cambiará después de la evaluación.

**Registro:** se puede usar cualquier correo (no se envía mail de confirmación).

**Recuperación de contraseña:** el código se envía por mail. Con el servicio de correo gratuito de Supabase sólo llega a las casillas de los miembros del proyecto, por eso esta prueba se demuestra con la cuenta de la autora (las cuentas `@fittime.com` no reciben correo).

---

## 3. Pruebas por requisito

Marcar cada casilla al verificarla.

### R1 · Autenticación y seguridad
- [ ] **Registro:** "Crear cuenta" con nombre, apellido, teléfono, cualquier correo y contraseña de 8 o más caracteres, aceptando los términos → la cuenta se crea con rol Cliente y entra directo (sin confirmación por mail).
- [ ] **Login inválido:** `cliente@fittime.com` con contraseña `123` → *"Correo o contraseña incorrectos"*, sin entrar.
- [ ] **Login válido:** `cliente@fittime.com` / `FitTime2026!` → entra al Inicio del cliente.
- [ ] **Sesión persistente:** cerrar la app por completo y volver a abrirla → sigue logueado.
- [ ] **Logout:** Perfil → Cerrar sesión → vuelve al login.
- [ ] **Recuperar contraseña:** "¿Olvidaste tu contraseña?" con el correo propio → llega un código de 6 dígitos → ingresar código y clave nueva → iniciar sesión con la clave nueva.
- [ ] **Google:** "Continuar con Google" → elegir cuenta → entra como Cliente.
- [ ] **JWT:** (técnico) en la web, DevTools → Network → cualquier pedido a `supabase.co` lleva `Authorization: Bearer eyJ...`.

- [ ] **Ingresar como Cliente o Entrenador:** en *Iniciar Sesión* elegir el tipo de cuenta. Con `entrenador@fittime.com` en "Entrenador" se abre el panel del entrenador; con `cliente@fittime.com` en "Cliente", la app del cliente.
- [ ] **Tipo equivocado:** `entrenador@fittime.com` con "Cliente" seleccionado → *"Esta es una cuenta de entrenador. Elegí 'Entrenador' para ingresar."* y no entra. El administrador usa "Acceso administrador".

### R2 · Pantalla principal según rol
- [ ] Como **cliente**: el Inicio muestra próximos turnos y la rutina asignada.
- [ ] Como **admin**: el Inicio muestra estadísticas (clientes activos, turnos de hoy y de la semana, horarios más concurridos) y accesos rápidos.

### R3 · ABM / gestión de datos (admin)
- [ ] **Horarios:** crear "Domingo 09:00–10:00, cupo 8" → editarlo a cupo 10 → darlo de baja. El cliente ya no lo ve.
- [ ] **Ejercicios:** crear "Remo en máquina" → editar la descripción → eliminar.
- [ ] **Rutinas:** crear una rutina de categoría *Cardio* con dos ejercicios → editarla → desactivarla.
- [ ] **Turnos:** en la lista de turnos, marcar uno como *Asistió* o *Ausente* indicando un motivo.

### R4 · Multiusuario y roles
- [ ] Logueado como cliente no aparece ningún menú de administración.
- [ ] (técnico) Con la sesión de cliente, ejecutar `admin_estadisticas()` desde la API → error `SOLO_ADMIN`. Las reglas están en PostgreSQL (RLS), no sólo en la interfaz.

### R4b · Entrenador
- [ ] Entrar como `entrenador@fittime.com`: se abre el **panel del entrenador** (sin Horarios ni Usuarios).
- [ ] *Inicio* muestra sus clases de hoy y la ocupación.
- [ ] *Alumnos* → asignar "Fuerza Base 5x5" a un cliente con una indicación → el cliente la ve en *Rutinas → Tu rutina* con "Asignada por …" y la indicación.
- [ ] *Ejercicios* → editar los consejos de "Sentadilla Libre" → el cliente los ve en el detalle del ejercicio ("Consejos del entrenador").
- [ ] *Mis clases* → marcar a un alumno como "Asistió".
- [ ] Como cliente, el detalle del turno muestra el **Instructor** de la clase.

### R5 · Interacción entre usuarios
- [ ] Como **cliente**, reservar un turno → como **admin**, verlo en la lista de turnos de esa fecha con el nombre del cliente.
- [ ] Como **admin**, asignar la rutina "Fuerza Base 5x5" al cliente → como **cliente**, aparece en Inicio y llega la notificación "Nueva rutina asignada".
- [ ] Como **admin**, cancelar un turno del cliente con motivo → el cliente recibe "Turno cancelado" y el cupo se libera.

### R6 · Configuración de cuenta
- [ ] Perfil → editar nombre y teléfono → guardar → cerrar y abrir la app → los datos se mantienen.
- [ ] Cambiar la foto de perfil desde la galería.
- [ ] Cambiar contraseña estando logueado.
- [ ] Preferencias: activar/desactivar notificaciones y elegir cuánto antes llega el recordatorio.

### R7 · Tema visual
- [ ] Perfil → alternar tema claro/oscuro → toda la app cambia. Cerrar y abrir → se conserva.

### R8 · Notificaciones
- [ ] Al reservar, aceptar el permiso → llega la notificación "Turno confirmado".
- [ ] Reservar un turno con más de una hora de anticipación → se programa un recordatorio antes del turno.
- [ ] La campana de Notificaciones muestra el historial (confirmaciones, cancelaciones y rutinas) y permite marcarlas como leídas.

### R9 · Almacenamiento persistente
- [ ] Los turnos, rutinas y datos del perfil se mantienen al cambiar de dispositivo (iniciar sesión con la misma cuenta en la web).
- [ ] La foto de perfil se guarda en Supabase Storage y se ve en ambos dispositivos.

### R10 · Validaciones y errores
- [ ] Registro con correo mal escrito (`ana@`) → *"Ingresá un correo válido"*.
- [ ] Registro con contraseña de 5 caracteres → *"La contraseña debe tener al menos 8 caracteres"*.
- [ ] **Cupo agotado:** el horario **Sábado 11:00** tiene cupo de 1 persona. Reservarlo con `cliente@fittime.com` y luego intentarlo con la cuenta propia → *"Ese horario ya no tiene lugares disponibles"*.
- [ ] Intentar reservar dos veces el mismo horario → *"Ya tenés un turno reservado en ese horario"*.
- [ ] **Sin conexión:** activar modo avión y tirar hacia abajo para recargar → *"Sin conexión. Revisá tu internet e intentá de nuevo"*.
- [ ] Mientras carga cualquier lista se ve un indicador de carga.

### R11 · Distribución externa
- [ ] La app se instala desde el APK (o se abre en Expo Go) y funciona con datos móviles, sin estar en la misma red que la computadora de desarrollo.

### R12 · Landing pública
- [ ] La landing abre desde cualquier navegador, describe el producto, muestra el QR/link de descarga y las instrucciones de uso.

---

## 4. Datos precargados

| Dato | Detalle |
|---|---|
| Horarios | 13 franjas de lunes a sábado, de mañana y de tarde; **Sábado 11:00 con cupo 1** para probar el cupo agotado |
| Rutinas | Hipertrofia Tren Superior · Acondicionamiento General · Fuerza Base 5x5 · Cardio HIIT 20 · Piernas y Glúteos |
| Ejercicios | 12 ejercicios con grupo muscular y descripción |

## 5. Para instalar desde cero (opcional)

Seguir la sección *Instalación* del [README](../README.md): ejecutar `init_fittime.sql`, `02_mejoras_fittime.sql`, crear las dos cuentas en **Authentication → Users → Add user** (con *Auto Confirm User*) y ejecutar `03_cuentas_prueba.sql`.
