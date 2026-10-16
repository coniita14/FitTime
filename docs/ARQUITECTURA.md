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

### 2.1 Estructura objetivo

Los elementos marcados con ✱ todavía no existen y hay que crearlos. Los marcados con ↻ existen pero se mueven o se renombran.

```
Gimnasio-proyectoFinal/
├── App.js                       # Providers: SafeArea → Theme → Auth → Navigator
├── app.json                     # Nombre, scheme fittime://, package Android, plugins
├── eas.json                     # Perfil "preview" = APK
├── .env.example                 # EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY
│
├── database/                    # Backend: todo el SQL versionado, en orden
│   ├── init_fittime.sql         # 01 · Tablas base, RLS, reservar/cancelar turno
│   ├── 02_mejoras_fittime.sql   # 02 · Categorías, perfil, favoritas, notificaciones, admin, storage
│   └── 03_cuentas_prueba.sql    # 03 · Rol ADMIN y datos de la cuenta de evaluación
│
├── supabase/functions/          # ✱ (opcional) Edge Function "enviar-push" para push remoto
│
├── docs/
│   ├── ARQUITECTURA.md          # Este documento
│   ├── MODELO_DATOS.md          # Diagrama ER y diccionario de datos
│   ├── GUIA_PRUEBA.md           # Guía del profesor con credenciales
│   ├── LANDING_CONTENIDO.md     # Textos de la landing
│   └── DEFENSA_ORAL.md
│
├── public_landing/              # Sitio público estático
│   ├── index.html
│   ├── styles.css
│   └── assets/                  # ✱ capturas de pantalla, logo
│
└── src/
    ├── config/
    │   └── supabase.js          # Cliente Supabase + sesión persistente (SecureStore)
    ├── context/
    │   ├── AuthContext.js       # user, rol, login, signup, Google, logout, reset
    │   └── ThemeContext.js      # claro / oscuro persistido
    ├── navigation/
    │   ├── AppNavigator.js      # Decide: sin sesión → Auth · CLIENTE → ClienteTabs · ADMIN → AdminNavigator
    │   ├── AuthStack.js         # ✱
    │   ├── ClienteTabs.js       # ✱ Inicio · Turnos · Rutinas · Perfil
    │   └── AdminNavigator.js    # ✱ Sidebar en web / tabs en móvil
    ├── services/                # ↻ hoy se llama src/api/
    │   ├── turnos.service.js    # ↻ separar de gym.service.js
    │   ├── rutinas.service.js   # ↻ separar de gym.service.js (+ categorías y favoritas)
    │   ├── perfil.service.js    # ✱ datos, avatar (Storage), preferencias
    │   ├── notificaciones.service.js  # ✱ historial + recordatorio local
    │   └── admin.service.js     # ✱ ABM horarios/rutinas/ejercicios, usuarios, turnos, estadísticas
    ├── hooks/                   # ✱ useAsync (loading/error), useResponsive (web vs móvil)
    ├── utils/
    │   ├── errores.js           # ✱ Traduce códigos de PostgreSQL/Auth a mensajes claros
    │   ├── fechas.js            # ✱ localDate, próximo día del horario
    │   └── validaciones.js      # ✱ email, contraseña (≥ 8), teléfono
    ├── components/
    │   ├── common/              # CustomButton, CustomInput, StatusBadge, LoadingState ✱, EmptyState ✱, ErrorBanner ✱
    │   ├── cliente/             # ✱ TurnoCard, HorarioItem, RutinaCard, CategoriaChips
    │   └── admin/               # ✱ StatCard, DataTable, FormModal, ConfirmDialog
    ├── screens/
    │   ├── auth/                # ↻ Login, Signup, ForgotPassword, ResetPassword
    │   ├── cliente/             # ↻ dividir HomeScreen.js (36 KB) en:
    │   │   ├── HomeClienteScreen.js       # próximos turnos + rutina activa
    │   │   ├── TurnosScreen.js            # horarios por día, reservar/cancelar
    │   │   ├── RutinasScreen.js           # ✱ catálogo por categoría + favoritas
    │   │   ├── RutinaDetalleScreen.js
    │   │   └── NotificacionesScreen.js    # ✱
    │   ├── admin/               # ✱
    │   │   ├── DashboardScreen.js         # estadísticas + accesos rápidos
    │   │   ├── HorariosScreen.js          # ABM horarios
    │   │   ├── RutinasAdminScreen.js      # ABM rutinas + ejercicios de cada rutina
    │   │   ├── EjerciciosScreen.js        # ABM catálogo de ejercicios
    │   │   ├── UsuariosScreen.js          # listado, rol, alta/baja, asignar rutina
    │   │   └── TurnosAdminScreen.js       # turnos por fecha, marcar asistió/ausente/cancelar
    │   └── comun/
    │       └── PerfilScreen.js            # datos, foto, clave, tema, notificaciones, logout
    └── styles/
        └── theme.js             # Paletas claro/oscuro
```

### 2.2 Archivos heredados que conviene borrar

Estos archivos vienen de otro proyecto (gestión de materias/profesores) y apuntan a una API en `http://172.16.3.24:3000`, que **no existe en FitTime** y rompe el requisito de "no depender de localhost":

- `src/api/client.js`, `src/api/auth.service.js`, `src/api/user.service.js`, `src/api/materia.service.js`
- `src/config/api.config.js`
- `src/components/MateriaCard.js`, `src/components/ProfesorCard.js`
- En `StatusBadge.js` y `SignupScreen.js` quedan referencias a roles `ALUMNO` / `PROFESOR`: cambiarlas por `CLIENTE` / `ADMIN`.

Antes de borrar, verificar con "Buscar en archivos" de VS Code que ninguna pantalla los importe.

## 3. Roles y permisos (defensa en dos capas)

| Capa | Cómo se aplica |
|---|---|
| **Frontend** | `AppNavigator` lee `user.rol` y muestra `ClienteTabs` o `AdminNavigator`. Un cliente nunca ve pantallas de admin. |
| **Backend** | RLS en todas las tablas + funciones que verifican `current_user_is_admin()`. Aunque alguien llame a la API a mano con un token de cliente, PostgreSQL rechaza la operación. |

Reglas principales:

| Recurso | Cliente | Administrador |
|---|---|---|
| Su perfil (nombre, teléfono, foto, preferencias) | Leer / editar | Leer / editar |
| Rol y estado activo de usuarios | — | `admin_actualizar_usuario()` (no puede cambiarse a sí mismo) |
| Horarios | Ver activos | ABM completo |
| Turnos | Reservar / cancelar los propios (`reservar_turno`, `cancelar_turno`) | Ver todos, cambiar estado con motivo (`admin_gestionar_turno`) |
| Rutinas y ejercicios | Ver activos, guardar favoritas | ABM completo, asignar a clientes (`admin_asignar_rutina`) |
| Notificaciones | Ver y marcar como leídas las propias | Enviar avisos generales |
| Estadísticas | — | `admin_estadisticas()` |

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
