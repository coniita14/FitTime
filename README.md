# FitTime 🏋️ · Turnos y rutinas para tu gimnasio

FitTime es una aplicación multiplataforma para gimnasios locales. Los **clientes** reservan turnos sin cruzarse con horarios llenos y siguen rutinas desde el celular; los **entrenadores** arman rutinas, cargan consejos de ejercicios y se las asignan a sus alumnos; el **administrador** gestiona horarios, usuarios y turnos desde un dashboard web.

| | |
|---|---|
| **Autora** | Constanza Castillo — constanzacastillo@epet12smandes.edu.ar |
| **Carrera** | Técnica en Programación · Proyecto final 2026 (individual) |
| **Landing pública** | `[COMPLETAR: URL de la landing]` |
| **APK Android** | `[COMPLETAR: link de descarga del APK]` |
| **Dashboard web (admin)** | `[COMPLETAR: URL de la versión web]` |
| **Guía para el profesor** | [docs/GUIA_PRUEBA.md](./docs/GUIA_PRUEBA.md) — incluye credenciales de prueba |

---

## Funcionalidades

### Cliente (app móvil)
- Registro, inicio de sesión con correo o **Google**, recuperación de contraseña por código y sesión persistente.
- **Inicio**: próximos turnos y rutina asignada.
- **Turnos**: horarios por día con cupos libres en tiempo real, reserva y cancelación.
- **Rutinas**: catálogo por categoría (Fuerza, Cardio, Tren superior, Tren inferior, Cuerpo completo, Movilidad), detalle de ejercicios y rutinas guardadas.
- **Notificaciones**: confirmación de turno, recordatorio antes de entrenar, avisos de cancelación y de rutina asignada.
- **Perfil**: datos personales, foto, cambio de contraseña, tema claro/oscuro, preferencias de notificación y cerrar sesión.

### Entrenador (panel web / móvil)
- **Inicio**: sus clases de hoy con ocupación, reservas de la semana y alumnos con su rutina.
- **Mis clases**: alumnos anotados en sus horarios; marcar asistencia o ausencia.
- **Alumnos**: asignar rutinas con indicaciones (el cliente recibe una notificación).
- **Rutinas y ejercicios**: crear y editar rutinas, músculos involucrados y "consejos del entrenador".

### Asistente con IA "Fiti" (cliente y entrenador)
- Botón ✨ flotante que abre un chat con IA (Google Gemini) que conoce los datos de quien pregunta.
- **Cliente**: consulta sus turnos y su rutina asignada, pregunta por horarios y cupos, pide explicaciones de ejercicios y **reserva o cancela turnos** desde el chat. La IA sólo *propone* la acción: la app muestra una tarjeta con **Confirmar** y recién ahí se hace la reserva, con las mismas reglas que en la pantalla de Horarios.
- **Entrenador**: consulta sus clases y quiénes se anotaron, y pide ideas de entrenamiento.
- Límite de 40 consultas por persona por día para no superar el plan gratuito.

### Administrador (dashboard web)
- **Inicio**: estadísticas (clientes activos, turnos de hoy y de la semana, cancelaciones, horarios más concurridos) y accesos rápidos.
- **ABM** de horarios, rutinas y ejercicios.
- **Usuarios**: listado, rol (Cliente / Entrenador / Administrador), alta/baja y asignación de rutinas.
- **Horarios**: además de día, hora y cupo, se asigna el **instructor** de cada clase.
- **Turnos**: control por fecha, marcar asistencia/ausencia o cancelar con motivo (queda auditado).
- **Reportes**: turnos por día, horarios más concurridos, rutinas más usadas y **exportación a CSV** (turnos de un período y usuarios activos), que abre directo en Excel.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React Native 0.86 + Expo SDK 57 (Android, iOS y Web con React Native Web) |
| Backend | Supabase: Auth (JWT + Google OAuth), API REST (PostgREST), Storage |
| Base de datos | PostgreSQL con Row Level Security y funciones SQL |
| Notificaciones | `expo-notifications` (locales) + tabla `notificaciones` |
| Sesión segura | `expo-secure-store` (móvil) / AsyncStorage (web) |
| Distribución | EAS Build (APK), Expo Go, hosting estático para web y landing |

La arquitectura completa está en [docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md) y el modelo de datos en [docs/MODELO_DATOS.md](./docs/MODELO_DATOS.md).

---

## Estructura del repositorio

```
├── App.js                 # Punto de entrada: providers de tema y sesión
├── app.json / eas.json    # Configuración de Expo y del build APK
├── database/              # SQL del backend (ejecutar en orden 01 → 02 → 03)
├── docs/                  # Arquitectura, modelo de datos, guía de pruebas, defensa
├── public_landing/        # Landing pública (HTML + CSS)
└── src/
    ├── api/               # admin.service (panel), cliente.service y gym.service (app del cliente)
    ├── components/        # admin/ (kit del panel) y cliente/ (kit visual de los wireframes)
    ├── config/            # supabase.js (conexión) y gimnasio.js (nombre, dirección, soporte)
    ├── context/           # AuthContext (sesión y rol) y ThemeContext (tema claro/oscuro)
    ├── navigation/        # AppNavigator: Splash → Bienvenida → login → app según el rol
    ├── screens/
    │   ├── auth/          # 1A Splash · 1B Bienvenida · 1C Login · 1D Registro · Recuperar
    │   ├── cliente/       # 2A–2F y 3A–3D: Horarios, Bloques, Mis Turnos, Detalle, Rutinas, Ejercicio, Perfil, Contraseña
    │   └── admin/         # Panel del administrador y del entrenador
    ├── styles/            # theme.js: colores de los wireframes (claro) y versión oscura
    └── utils/             # errores, diálogos, fechas y exportar CSV
```

---

## Instalación y ejecución local

### Requisitos
- Node.js LTS y npm
- Cuenta gratuita en [Supabase](https://supabase.com)
- Expo Go en el celular (opcional, para desarrollo)

### 1. Base de datos (Supabase)
1. Crear un proyecto en Supabase.
2. En **SQL Editor**, ejecutar en este orden:
   1. `database/init_fittime.sql`
   2. `database/02_mejoras_fittime.sql`
   3. `database/05a_roles_y_categorias.sql` (solo, en una ejecución aparte)
   4. `database/05b_entrenadores_y_diseno.sql`
   5. `database/06_reportes.sql`
   6. `database/07_entrenadores_admin.sql`
   7. `database/08_asistente.sql`
3. En **Authentication → Users → Add user**, crear las cuentas de prueba (ver la guía) y ejecutar `database/03_cuentas_prueba.sql`.
4. En **Authentication → Email Templates → Reset Password**, incluir `{{ .Token }}` para que llegue el código de 6 dígitos.
   En **Authentication → Sign In / Providers → Email**, desactivar **Confirm email**: el servicio de correo gratuito de Supabase sólo envía a miembros del equipo y rechaza el registro de otros correos (`email_address_invalid`). Para que la recuperación de contraseña llegue a cualquier correo, configurar un SMTP propio en **Authentication → SMTP Settings**.
5. **Asistente con IA**: crear una clave gratis en [Google AI Studio](https://aistudio.google.com/apikey), desplegar `supabase functions deploy asistente --no-verify-jwt` y cargar la clave en **Edge Functions → Secrets** con el nombre `GEMINI_API_KEY` (opcional: `GEMINI_MODEL` para cambiar el modelo). La clave nunca va en la app.
6. **Google**: activar el proveedor en **Authentication → Providers → Google** con un Client ID de Google Cloud y agregar `fittime://auth/callback` y la URL web en **URL Configuration → Redirect URLs**.

### 2. Variables de entorno
```bash
cp .env.example .env
```
Completar con **Project Settings → API**:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```
> Usar sólo la clave publicable. La clave `service_role` nunca va en la app.

### 3. Ejecutar
```bash
npm install
npx expo start          # escanear el QR con Expo Go
npx expo start --web    # versión web / dashboard admin
```

---

## Distribución

### APK de Android
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
Al terminar, EAS entrega un link de descarga del `.apk`. Ese link se publica en la landing y en este README.

> EAS compila en la nube y no sube el `.env` (está en `.gitignore`). Por eso la URL y la clave **publicable** de Supabase están en `eas.json` → `build.preview.env`. Nunca poner ahí la clave `service_role`.

### Versión web (dashboard)
```bash
npx expo export --platform web   # genera dist/
```
Subir `dist/` a Vercel o Netlify y agregar esa URL en las Redirect URLs de Supabase.

### Landing pública
Subir la carpeta `public_landing/` a cualquier hosting estático (Vercel, Netlify o GitHub Pages) y completar la constante `APK_URL` en `index.html` para que se genere el QR de descarga.

---

## Seguridad
- Contraseñas gestionadas por Supabase Auth (hash bcrypt); la app nunca las guarda.
- Cada consulta lleva el JWT del usuario y PostgreSQL aplica **Row Level Security**: un cliente sólo ve sus turnos, notificaciones y favoritas.
- El rol no se puede modificar desde la app; las acciones de admin están protegidas en la base de datos.
- Reservas atómicas: dos personas no pueden ocupar el último lugar al mismo tiempo.

---

## Estado de cumplimiento de requisitos

> Actualizar esta tabla antes de entregar.

| # | Requisito | Estado |
|---|---|---|
| 1 | Autenticación (registro, login, logout, recuperación, sesión, JWT, Google) | ✅ |
| 2 | Home según rol | ✅ cliente y admin (estadísticas + accesos rápidos) |
| 3 | ABM horarios, rutinas, ejercicios, turnos | ✅ |
| 4 | Roles en backend y frontend (Cliente, Entrenador, Administrador) | ✅ |
| 5 | Interacción entre usuarios (reservas, asignación de rutinas) | ✅ |
| 6 | Configuración de cuenta (datos, clave, foto, preferencias, logout) | ✅ |
| 7 | Tema claro / oscuro | ✅ |
| 8 | Notificaciones | ✅ confirmación + recordatorio local configurable + historial en la app |
| 9 | Almacenamiento persistente (PostgreSQL + Storage) | ✅ |
| 10 | Validaciones y manejo de errores | ✅ |
| 11 | APK / Expo Go sin localhost | ⬜ generar build |
| 12 | Landing pública | ✅ contenido · ⬜ publicar |

---

## Documentación
- [Guía de pruebas para el profesor](./docs/GUIA_PRUEBA.md)
- [Arquitectura](./docs/ARQUITECTURA.md)
- [Modelo de datos](./docs/MODELO_DATOS.md)
- [Contenido de la landing](./docs/LANDING_CONTENIDO.md)
- [Guion de defensa oral](./docs/DEFENSA_ORAL.md)

## Licencia
Proyecto académico. © 2026 Constanza Castillo.
# FitTime
