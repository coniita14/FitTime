# FitTime 🏋️ · Turnos y rutinas para tu gimnasio

FitTime es una aplicación multiplataforma para gimnasios locales. Los **clientes** reservan turnos sin cruzarse con horarios llenos y consultan rutinas por categoría desde el celular; el **administrador** gestiona horarios, rutinas, usuarios y turnos desde un dashboard web.

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

### Administrador (dashboard web)
- **Inicio**: estadísticas (clientes activos, turnos de hoy y de la semana, cancelaciones, horarios más concurridos) y accesos rápidos.
- **ABM** de horarios, rutinas y ejercicios.
- **Usuarios**: listado, cambio de rol, alta/baja y asignación de rutinas.
- **Turnos**: control por fecha, marcar asistencia/ausencia o cancelar con motivo (queda auditado).

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
    ├── config/            # Cliente de Supabase
    ├── context/           # AuthContext (sesión y rol), ThemeContext (tema)
    ├── navigation/        # Navegación según rol
    ├── api/               # Acceso a datos: gym.service (cliente), admin.service (admin)
    ├── components/        # Componentes reutilizables
    ├── screens/           # Login, registro, Home del cliente y admin/ (panel del gimnasio)
    ├── utils/             # Errores, fechas, validaciones
    └── styles/            # Temas claro y oscuro
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
3. En **Authentication → Users → Add user**, crear las cuentas de prueba (ver la guía) y ejecutar `database/03_cuentas_prueba.sql`.
4. En **Authentication → Email Templates → Reset Password**, incluir `{{ .Token }}` para que llegue el código de 6 dígitos.
5. **Google**: activar el proveedor en **Authentication → Providers → Google** con un Client ID de Google Cloud y agregar `fittime://auth/callback` y la URL web en **URL Configuration → Redirect URLs**.

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
| 4 | Roles en backend y frontend | ✅ |
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
