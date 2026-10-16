# Arquitectura de FitTime

**Autora:** Constanza Castillo · Técnica en Programación · 2026

## 1. Visión general

FitTime usa una arquitectura **cliente – backend como servicio (BaaS)**. Hay un único código fuente en React Native + Expo que se compila para tres destinos:

| Destino | Usuario | Cómo se distribuye |
|---|---|---|
| App Android (APK) | Cliente del gimnasio | EAS Build, perfil `preview` → link y QR en la landing |
| Expo Go | Cliente (alternativa) | `eas update` publica el bundle; se abre escaneando un QR |
| Web (React Native Web) | Administrador (dashboard) y clientes desde la PC | `npx expo export --platform web` → hosting estático (Vercel / Netlify) |

El backend es **Supabase**, que provee:

- **Supabase Auth**: registro, login, Google OAuth, recuperación por código y emisión de **JWT** (access token + refresh token).
- **PostgreSQL**: datos estructurados, con **Row Level Security (RLS)** que lee el JWT (`auth.uid()`) en cada consulta.
- **API REST automática (PostgREST)**: cada tabla y cada función SQL (`rpc`) queda expuesta como endpoint REST. La app la consume con `@supabase/supabase-js`.
- **Storage**: fotos de perfil (`avatars`) e imágenes de rutinas (`rutinas`).

```
┌──────────────────────────┐         HTTPS + JWT           ┌────────────────────────────────┐
│  App Expo (Android/Web)  │ ─────────────────────────────▶│  Supabase                      │
│                          │                               │  ├─ Auth (JWT, Google OAuth)   │
│  AuthContext  (sesión)   │◀───────────────────────────── │  ├─ PostgREST (API REST)       │
│  ThemeContext (tema)     │       JSON / errores          │  ├─ PostgreSQL + RLS           │
│  Navegación por rol      │                               │  │   └─ funciones rpc()        │
│  expo-notifications      │                               │  └─ Storage (avatars, rutinas) │
└──────────────────────────┘                               └────────────────────────────────┘
         ▲
         │ link / QR
┌──────────────────────────┐
│ Landing pública (HTML)   │
└──────────────────────────┘
```

### ¿Por qué Supabase y no Node/Express?

La consigna permite "Node.js / Express **o** Supabase". Elegí Supabase porque:

1. Las reglas de negocio críticas (cupos, roles, quién puede ver qué) viven **en la base de datos**, así que no se pueden saltear desde el cliente, aunque alguien modifique la app.
2. Auth con JWT, Google y recuperación de contraseña vienen resueltos y probados.
3. Hay un solo servidor que desplegar y está disponible 24/7, sin depender de `localhost` en la evaluación.

Las funciones SQL `SECURITY DEFINER` cumplen el rol que tendrían los *controllers* de Express: validan, aplican la regla de negocio y devuelven un resultado o un error con código.

## 2. Estructura de carpetas

### 2.1 Estructura implementada

```
Gimnasio-proyectoFinal/
├── App.js · app.json · eas.json · .env.example
├── assets/bienvenida.jpg          # Foto de la pantalla 1B
├── database/                      # SQL versionado, en orden: init → 02 → 03 → 05a → 05b → 06
├── docs/                          # Arquitectura, modelo de datos, guía de pruebas, landing, defensa
├── public_landing/                # Landing pública (index.html + styles.css)
└── src/
    ├── api/
    │   ├── cliente.service.js     # Horarios por fecha, reservas, mis turnos, rutinas, progreso, perfil, foto
    │   ├── gym.service.js         # Cancelar turno y recordatorios locales
    │   └── admin.service.js       # Panel: estadísticas, ABM, usuarios/roles, turnos, reportes
    ├── components/
    │   ├── cliente/ui.js          # Kit visual de los wireframes (Screen, Card, Button, Chip, TabBar, BottomSheet…)
    │   ├── cliente/NotificacionesModal.js
    │   ├── admin/AdminUI.js       # Kit del panel (tarjetas, modales, chips)
    │   └── CustomButton / CustomInput
    ├── config/  supabase.js · gimnasio.js
    ├── context/ AuthContext.js · ThemeContext.js
    ├── navigation/AppNavigator.js # Splash → Bienvenida → Login/Registro → app según rol
    ├── screens/
    │   ├── auth/                  # 1A Splash, 1B Bienvenida, 1C Login, 1D Registro, Recuperar contraseña
    │   ├── cliente/               # ClienteApp (barra Horarios·Turnos·Rutinas·Perfil) + 2A–2F y 3A–3D
    │   └── admin/                 # AdminScreen (rol ADMIN o ENTRENADOR) y sus secciones
    ├── styles/theme.js            # brand (colores de los wireframes) + colores del panel
    └── utils/                     # errores.js · dialogos.js · fechas.js · exportar.js
```

### 2.2 Correspondencia con los wireframes

| Wireframe | Archivo |
|---|---|
| 1A Splash · 1B Bienvenida · 1C Login · 1D Registro | `screens/auth/*` |
| 2A Horarios (calendario) · 2B Bloques · 2C Confirmar reserva | `HorariosScreen`, `BloquesScreen` |
| 2D Mis Turnos · 2E Detalle del turno | `MisTurnosScreen`, `TurnoDetalleScreen` |
| 2F Rutinas · 3A Detalle de rutina · 3B Ejercicio | `RutinasScreen`, `RutinaDetalleScreen`, `EjercicioDetalleScreen` |
| 3C Perfil · 3D Cambiar contraseña | `PerfilScreen`, `CambiarClaveScreen` |
| Menú administrador (workframe) | `screens/admin/*` |

## 3. Roles y permisos (defensa en dos capas)

| Capa | Cómo se aplica |
|---|---|
| **Frontend** | `AppNavigator` lee `user.rol`: CLIENTE → `ClienteApp` (Horarios / Turnos / Rutinas / Perfil), ENTRENADOR → `AdminScreen rol="ENTRENADOR"`, ADMIN → `AdminScreen rol="ADMIN"`. |
| **Backend** | RLS en todas las tablas + funciones que verifican `current_user_is_admin()`. Aunque alguien llame a la API a mano con un token de cliente, PostgreSQL rechaza la operación. |

Reglas principales:

| Recurso | Cliente | Entrenador | Administrador |
|---|---|---|---|
| Su perfil (nombre, teléfono, foto, preferencias) | Leer / editar | Leer / editar | Leer / editar |
| Rol y estado activo de usuarios | — | — | `admin_actualizar_usuario()` (no puede cambiarse a sí mismo) |
| Horarios | Ver activos | Ver los suyos | ABM completo y asignar instructor |
| Turnos | Reservar / cancelar los propios | Ver y gestionar los de **sus** clases | Ver todos y gestionar con motivo |
| Rutinas y ejercicios | Ver activos, guardar favoritas, marcar completados | ABM, consejos y asignar a clientes | ABM y asignar a clientes |
| Notificaciones | Ver y marcar como leídas las propias | — | Enviar avisos generales |
| Estadísticas | — | `entrenador_resumen()` | `admin_estadisticas()` |

El rol se guarda en `usuarios.rol`. Todo registro nuevo nace como `CLIENTE`; el primer `ADMIN` se asigna desde el SQL Editor de Supabase (`03_cuentas_prueba.sql`) y, después, desde el dashboard.

## 4. Flujos principales

### 4.1 Autenticación y sesión persistente

1. `signUp` / `signInWithPassword` / `signInWithOAuth('google')` → Supabase devuelve un **JWT**.
2. El trigger `on_auth_user_created` crea el perfil en `public.usuarios` con rol `CLIENTE`.
3. La sesión se guarda en **SecureStore** (móvil) o AsyncStorage (web) y se renueva sola (`autoRefreshToken`). Al reabrir la app, `getSession()` la restaura.
4. Cada consulta viaja con `Authorization: Bearer <JWT>`; RLS usa `auth.uid()` para saber quién es.
5. Recuperar contraseña: se envía un código de 6 dígitos al correo → `verifyOtp` → `updateUser({ password })`.

### 4.2 Reserva de turno (interacción cliente ↔ gimnasio)

1. La app pide `obtener_horarios_disponibles(día)` → muestra cupos libres por franja.
2. El cliente toca **Reservar** → `reservar_turno(horario_id, fecha)`.
3. PostgreSQL valida sesión, fecha y día; inserta el turno y el trigger suma 1 a `ocupacion_turno` **sólo si queda cupo** (operación atómica, sin condiciones de carrera).
4. Otro trigger crea la notificación "Turno confirmado"; la app programa además un recordatorio local antes del turno.
5. Si el cupo está lleno → error `CUPO_COMPLETO` → la app muestra "Ese horario ya no tiene lugares disponibles".

### 4.3 Notificaciones

| Tipo | Dónde se genera | Cómo llega al usuario |
|---|---|---|
| Confirmación de turno | Trigger `turnos_notificar` | Notificación local inmediata + historial en la app |
| Recordatorio | App, al reservar | Notificación local programada (`recordatorio_minutos` antes) |
| Cancelación (por el cliente o el admin) | Trigger `turnos_notificar` | Historial en la app (y push remoto si se activa la Edge Function) |
| Rutina asignada | Trigger `rutina_asignada_notificar` | Historial en la app (y push remoto si se activa la Edge Function) |

**Push remoto (opcional):** guardar el `ExpoPushToken` en `usuarios.push_token` al iniciar sesión, crear un *Database Webhook* sobre `INSERT` en `notificaciones` que llame a una Edge Function `enviar-push`, y que esta haga `POST https://exp.host/--/api/v2/push/send`. Requiere un build con EAS (Expo Go no recibe push remoto en Android desde SDK 53).

## 5. Manejo de errores

Las funciones SQL lanzan códigos cortos. `src/utils/errores.js` debe traducirlos a mensajes claros:

| Código | Mensaje para el usuario |
|---|---|
| `Invalid login credentials` | Correo o contraseña incorrectos. |
| `Email not confirmed` | Confirmá tu correo antes de iniciar sesión. |
| `User already registered` | Ya existe una cuenta con ese correo. |
| `CUPO_COMPLETO` | Ese horario ya no tiene lugares disponibles. |
| `YA_RESERVADO` | Ya tenés un turno reservado en ese horario. |
| `HORARIO_YA_INICIADO` | Ese turno ya empezó; elegí otro horario. |
| `HORARIO_NO_DISPONIBLE` | El horario fue dado de baja por el gimnasio. |
| `TURNO_NO_ENCONTRADO_O_YA_CANCELADO` | El turno ya estaba cancelado. |
| `NO_AUTENTICADO` / JWT expirado | Tu sesión expiró. Volvé a iniciar sesión. |
| `SOLO_ADMIN` | No tenés permisos para esta acción. |
| `MOTIVO_REQUERIDO` | Escribí un motivo para el cambio. |
| `Failed to fetch` / `Network request failed` | Sin conexión. Revisá tu internet e intentá de nuevo. |

Toda pantalla que carga datos tiene tres estados visibles: **cargando** (`ActivityIndicator`), **error** (mensaje + botón Reintentar) y **vacío** ("Todavía no reservaste turnos").

## 6. Seguridad

- En la app sólo va la **clave publicable** de Supabase. La `service_role` nunca se incluye.
- Las contraseñas las guarda Supabase Auth con hash bcrypt; la tabla `usuarios` no almacena contraseñas.
- La columna `rol` no se puede modificar desde el cliente (permisos por columna + RLS).
- Fotos: cada usuario sólo puede escribir en `avatars/<su-uid>/`.
- `.env` está en `.gitignore`.
