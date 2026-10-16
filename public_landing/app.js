/**
 * FITTIME - LÓGICA DE ESTADO GLOBAL Y SIMULACIÓN FRONTEND
 * Alumna: Constanza Castillo - EPET N°30
 * Incluye: Control RBAC, persistencia simulada PostgreSQL, transacciones de cupo,
 * selector de temas, emulador móvil y dashboard web.
 */

// ============================================================================
// 1. BASE DE DATOS Y ESTADO GLOBAL EN MEMORIA (SINCRONIZADO CON EL SCRIPT SQL)
// ============================================================================

const STATE = {
  // Usuario actual con sesión activa
  currentUser: null, // { id, nombre, apellido, email, rol: 'CLIENTE' | 'ADMIN' }

  // Horarios precargados según init_fittime.sql
  horarios: [
    { id: 1, dia: 'LUNES', inicio: '08:00', fin: '09:00', cupoMax: 15, cupoActual: 1, activo: true },
    { id: 2, dia: 'LUNES', inicio: '18:00', fin: '19:00', cupoMax: 20, cupoActual: 1, activo: true },
    { id: 3, dia: 'MIERCOLES', inicio: '19:00', fin: '20:00', cupoMax: 20, cupoActual: 0, activo: true },
    { id: 4, dia: 'MARTES', inicio: '09:00', fin: '10:00', cupoMax: 15, cupoActual: 0, activo: true },
    { id: 5, dia: 'JUEVES', inicio: '18:00', fin: '19:00', cupoMax: 20, cupoActual: 0, activo: true },
    { id: 6, dia: 'VIERNES', inicio: '17:00', fin: '18:00', cupoMax: 20, cupoActual: 0, activo: true },
  ],

  // Turnos reservados
  turnos: [
    { id: 101, usuarioId: 2, horarioId: 1, fecha: '2026-10-12', estado: 'CONFIRMADO' },
    { id: 102, usuarioId: 3, horarioId: 2, fecha: '2026-10-12', estado: 'CONFIRMADO' }
  ],

  // Usuarios del sistema
  usuarios: [
    { id: 1, nombre: 'Constanza', apellido: 'Castillo', email: 'admin@fittime.com', rol: 'ADMIN', telefono: '+542995123456', activo: true },
    { id: 2, nombre: 'Carlos', apellido: 'Gómez', email: 'cliente@fittime.com', rol: 'CLIENTE', telefono: '+542994987654', activo: true },
    { id: 3, nombre: 'Lucía', apellido: 'Martínez', email: 'lucia.m@gmail.com', rol: 'CLIENTE', telefono: '+542994112233', activo: true }
  ],

  // Catálogo de Ejercicios
  ejercicios: [
    { id: 1, nombre: 'Sentadilla Libre', grupo: 'Piernas / Cuádriceps', desc: 'Espalda recta, romper el paralelo con control de core.' },
    { id: 2, nombre: 'Press de Banca Plano', grupo: 'Pecho / Pectorales', desc: 'Retracción escapular, barra al pecho medio con control.' },
    { id: 3, nombre: 'Remo con Barra', grupo: 'Espalda / Dorsales', desc: 'Inclinación 45 grados, codos pegados al torso.' },
    { id: 4, nombre: 'Plancha Frontal', grupo: 'Core / Abdominales', desc: 'Alineación recta de columna y respiración rítmica.' }
  ],

  // Rutinas Plantilla
  rutinas: [
    { id: 1, nombre: 'Hipertrofia Tren Superior', nivel: 'Intermedio', objetivo: 'Ganancia muscular de pecho y espalda', ejercicios: [2, 3] },
    { id: 2, nombre: 'Acondicionamiento General', nivel: 'Principiante', objetivo: 'Fuerza base y estabilidad funcional', ejercicios: [1, 4] }
  ],

  // Rutinas Asignadas a Usuarios
  rutinasAsignadas: [
    { id: 1, usuarioId: 2, rutinaId: 1, fechaInicio: '2026-10-01', activa: true, obs: 'Subir 2.5kg por lado cada 2 semanas' },
    { id: 2, usuarioId: 3, rutinaId: 2, fechaInicio: '2026-10-05', activa: true, obs: 'Foco en respiración diafragmática' }
  ],

  // Estado de ejercicios completados por el cliente en la sesión
  completedExercises: {
    2: true, // Press de Banca completado
    3: false
  },

  selectedDay: 'LUNES'
};

// ============================================================================
// 2. INICIALIZACIÓN Y PERSISTENCIA DE TEMA
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  // Auto-login como cliente inicial para facilitar evaluación
  loginUser('cliente@fittime.com', 'Cliente123!');
  updateClock();
  setInterval(updateClock, 30000);
});

function initTheme() {
  const saved = localStorage.getItem('fittime_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const iconSpan = document.querySelector('#globalThemeToggle .theme-icon');
  if (iconSpan) {
    iconSpan.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  const toggleMobile = document.getElementById('mToggleDarkMode');
  if (toggleMobile) {
    toggleMobile.checked = theme === 'dark';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('fittime_theme', next);
  updateThemeIcon(next);
  showToast('Tema Actualizado', `Modo ${next === 'dark' ? 'Oscuro' : 'Claro'} activado.`);
}

function updateClock() {
  const clockEl = document.getElementById('mobileClock');
  if (clockEl) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}`;
  }
}

// ============================================================================
// 3. AUTENTICACIÓN, JWT SIMULADO Y ROLES (RBAC)
// ============================================================================

function loginUser(email, password) {
  const user = STATE.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    alert('Usuario no encontrado. Revisa el correo electrónico.');
    return false;
  }

  // Validación de credenciales
  if (user.rol === 'ADMIN' && password !== 'Admin123!') {
    alert('Contraseña incorrecta para Administrador (Usa: Admin123!)');
    return false;
  }
  if (user.rol === 'CLIENTE' && password !== 'Cliente123!') {
    alert('Contraseña incorrecta para Cliente (Usa: Cliente123!)');
    return false;
  }

  // Guardar sesión
  STATE.currentUser = user;
  sessionStorage.setItem('fittime_session_token', `jwt_mock_${user.rol}_${user.id}`);

  updateSessionUI();
  renderAllViews();

  // Redirigir pantalla mobile
  showMobileScreen('mScreenHome');
  document.getElementById('mBottomNav').style.display = 'flex';

  showToast('Bienvenido a FitTime', `Sesión iniciada como ${user.nombre} (${user.rol})`);
  return true;
}

function logoutUser() {
  STATE.currentUser = null;
  sessionStorage.removeItem('fittime_session_token');

  updateSessionUI();
  showMobileScreen('mScreenAuth');
  document.getElementById('mBottomNav').style.display = 'none';

  // Si estaba en la vista admin y sale, mostrar warning
  renderAdminView();
  showToast('Sesión Finalizada', 'Has cerrado sesión correctamente.');
}

function updateSessionUI() {
  const indicator = document.getElementById('sessionIndicator');
  const btnLogout = document.getElementById('btnQuickLogout');
  const companionRole = document.getElementById('companionUserRole');

  if (STATE.currentUser) {
    const isAdm = STATE.currentUser.rol === 'ADMIN';
    indicator.innerHTML = `
      <span class="role-badge ${isAdm ? 'role-admin' : 'role-client'}">${STATE.currentUser.rol}</span>
      <span class="user-email-label">${STATE.currentUser.nombre}</span>
    `;
    btnLogout.style.display = 'inline-block';
    companionRole.textContent = `${STATE.currentUser.rol} (${STATE.currentUser.nombre} ${STATE.currentUser.apellido})`;
  } else {
    indicator.innerHTML = `
      <span class="role-badge role-guest">Sin Sesión</span>
      <span class="user-email-label">Invitado</span>
    `;
    btnLogout.style.display = 'none';
    companionRole.textContent = 'Ninguno (Invitado)';
  }
}

// ============================================================================
// 4. NAVEGACIÓN Y EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // 1. Selector de Vista Principal (Mobile vs Admin)
  document.getElementById('btnSwitchMobile')?.addEventListener('click', () => switchView('mobile'));
  document.getElementById('btnSwitchAdmin')?.addEventListener('click', () => switchView('admin'));

  // 2. Tema claro / oscuro
  document.getElementById('globalThemeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('mToggleDarkMode')?.addEventListener('change', toggleTheme);

  // 3. Botones de Logout
  document.getElementById('btnQuickLogout')?.addEventListener('click', logoutUser);
  document.getElementById('mBtnLogout')?.addEventListener('click', logoutUser);
  document.getElementById('btnAdminLogout')?.addEventListener('click', logoutUser);

  // 4. Formulario de Login Mobile
  document.getElementById('formMobileLogin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('mEmail').value;
    const pass = document.getElementById('mPass').value;
    loginUser(email, pass);
  });

  // 5. Tabs de Login vs Register en Mobile
  document.getElementById('tabBtnLogin')?.addEventListener('click', () => {
    document.getElementById('tabBtnLogin').classList.add('active');
    document.getElementById('tabBtnRegister').classList.remove('active');
    document.getElementById('formMobileLogin').style.display = 'flex';
    document.getElementById('formMobileRegister').style.display = 'none';
  });
  document.getElementById('tabBtnRegister')?.addEventListener('click', () => {
    document.getElementById('tabBtnRegister').classList.add('active');
    document.getElementById('tabBtnLogin').classList.remove('active');
    document.getElementById('formMobileLogin').style.display = 'none';
    document.getElementById('formMobileRegister').style.display = 'flex';
  });

  // 6. Cuentas rápidas de prueba
  document.getElementById('quickFillClient')?.addEventListener('click', () => {
    document.getElementById('mEmail').value = 'cliente@fittime.com';
    document.getElementById('mPass').value = 'Cliente123!';
    loginUser('cliente@fittime.com', 'Cliente123!');
  });
  document.getElementById('quickFillAdmin')?.addEventListener('click', () => {
    document.getElementById('mEmail').value = 'admin@fittime.com';
    document.getElementById('mPass').value = 'Admin123!';
    loginUser('admin@fittime.com', 'Admin123!');
    switchView('admin');
  });

  // 7. Botón Google OAuth
  document.getElementById('btnGoogleLogin')?.addEventListener('click', () => {
    // Simular flujo OAuth 2.0
    loginUser('cliente@fittime.com', 'Cliente123!');
    showToast('Google Sign-In OK', 'Autenticado vía Google OAuth 2.0 (id_token validado).');
  });

  // 8. Bottom Navigation en Mobile
  document.querySelectorAll('.mobile-bottom-nav .tab-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-bottom-nav .tab-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showMobileScreen(btn.dataset.target);
    });
  });

  // 9. Accesos rápidos en Mobile Home
  document.getElementById('tileReserve')?.addEventListener('click', () => triggerMobileTab('mScreenTurnos'));
  document.getElementById('tileRoutine')?.addEventListener('click', () => triggerMobileTab('mScreenRutina'));
  document.getElementById('tileQr')?.addEventListener('click', openQrModal);
  document.getElementById('mBtnMyQr')?.addEventListener('click', openQrModal);
  document.getElementById('tileNotifs')?.addEventListener('click', () => {
    showToast('🔔 Recordatorio Activo', 'Tu próximo turno comienza a las 18:00 hs.');
  });
  document.getElementById('btnGoReserveNow')?.addEventListener('click', () => triggerMobileTab('mScreenTurnos'));

  // 10. Cancelar turno desde Home Mobile
  document.getElementById('btnCancelActiveTurn')?.addEventListener('click', cancelActiveTurn);

  // 11. Selector de Días en Turnos Mobile
  document.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.selectedDay = chip.dataset.day;
      renderTurnosMobile();
    });
  });

  // 12. Menú Lateral Admin Dashboard
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-menu .menu-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const tabTarget = document.getElementById(item.dataset.adminTab);
      if (tabTarget) tabTarget.classList.add('active');
    });
  });

  // 13. Botón para elevar sesión si cliente intenta ver admin
  document.getElementById('btnElevateToAdmin')?.addEventListener('click', () => {
    loginUser('admin@fittime.com', 'Admin123!');
  });

  // 14. Modales de creación (Admin)
  setupModals();
}

function switchView(viewName) {
  const btnMobile = document.getElementById('btnSwitchMobile');
  const btnAdmin = document.getElementById('btnSwitchAdmin');
  const viewMob = document.getElementById('viewMobile');
  const viewAdm = document.getElementById('viewAdmin');

  if (viewName === 'mobile') {
    btnMobile.classList.add('active');
    btnAdmin.classList.remove('active');
    viewMob.classList.add('active');
    viewAdm.classList.remove('active');
  } else {
    btnAdmin.classList.add('active');
    btnMobile.classList.remove('active');
    viewAdm.classList.add('active');
    viewMob.classList.remove('active');
    renderAdminView();
  }
}

function showMobileScreen(screenId) {
  document.querySelectorAll('.mobile-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function triggerMobileTab(screenId) {
  const btn = document.querySelector(`.mobile-bottom-nav .tab-item[data-target="${screenId}"]`);
  if (btn) btn.click();
}

function openQrModal() {
  const modal = document.getElementById('modalQrMobile');
  const nameLabel = document.getElementById('qrUserNameLabel');
  if (nameLabel && STATE.currentUser) {
    nameLabel.textContent = `${STATE.currentUser.nombre} ${STATE.currentUser.apellido}`;
  }
  modal?.classList.add('active');
}

// ============================================================================
// 5. RENDERIZADO DE LA APLICACIÓN MOBILE
// ============================================================================

function renderMobileHome() {
  if (!STATE.currentUser) return;

  // Header
  document.getElementById('mUserNameDisplay').textContent = `${STATE.currentUser.nombre} ${STATE.currentUser.apellido}`;
  const initials = `${STATE.currentUser.nombre[0]}${STATE.currentUser.apellido[0]}`.toUpperCase();
  document.getElementById('mUserAvatar').textContent = initials;
  document.getElementById('mProfileAvatar').textContent = initials;
  document.getElementById('mProfileName').textContent = `${STATE.currentUser.nombre} ${STATE.currentUser.apellido}`;
  document.getElementById('mProfileEmail').textContent = STATE.currentUser.email;

  // Próximo turno activo del usuario
  const myTurn = STATE.turnos.find(t => t.usuarioId === STATE.currentUser.id && t.estado === 'CONFIRMADO');
  const nextTurnCard = document.getElementById('mNextTurnCard');
  const noTurnCard = document.getElementById('mNoTurnCard');

  if (myTurn) {
    const horario = STATE.horarios.find(h => h.id === myTurn.horarioId);
    if (horario) {
      document.getElementById('mNextTurnDay').textContent = horario.dia;
      document.getElementById('mNextTurnTime').textContent = `${horario.inicio} - ${horario.fin} hs`;
      nextTurnCard.style.display = 'block';
      noTurnCard.style.display = 'none';
    }
  } else {
    nextTurnCard.style.display = 'none';
    noTurnCard.style.display = 'block';
  }

  // Rutina en Home
  updateRoutineHomeProgress();
}

function updateRoutineHomeProgress() {
  // Tomar rutina asignada
  const assigned = STATE.rutinasAsignadas.find(r => r.usuarioId === (STATE.currentUser ? STATE.currentUser.id : 2) && r.activa);
  if (!assigned) return;

  const routine = STATE.rutinas.find(r => r.id === assigned.rutinaId);
  if (!routine) return;

  document.getElementById('mHomeRoutineTitle').textContent = routine.nombre;
  document.getElementById('mHomeRoutineLevel').textContent = routine.nivel;

  const totalEx = routine.ejercicios.length;
  let doneCount = 0;
  routine.ejercicios.forEach(exId => {
    if (STATE.completedExercises[exId]) doneCount++;
  });

  const pct = Math.round((doneCount / totalEx) * 100);
  document.getElementById('mHomeRoutineProgress').style.width = `${pct}%`;
  document.getElementById('mHomeRoutineCompleted').textContent = `${doneCount} de ${totalEx} ejercicios completados`;
  document.getElementById('mHomeRoutinePercent').textContent = `${pct}%`;
}

function renderTurnosMobile() {
  const container = document.getElementById('mTurnosList');
  if (!container) return;

  const list = STATE.horarios.filter(h => h.dia === STATE.selectedDay && h.activo);

  if (list.length === 0) {
    container.innerHTML = `<div class="m-card text-muted" style="text-align:center;">No hay turnos disponibles para este día.</div>`;
    return;
  }

  let html = '';
  list.forEach(h => {
    const cuposLibres = h.cupoMax - h.cupoActual;
    const isFull = cuposLibres <= 0;
    // Chequear si el usuario actual ya reservó este horario
    const yaReservado = STATE.currentUser && STATE.turnos.some(t => t.usuarioId === STATE.currentUser.id && t.horarioId === h.id && t.estado === 'CONFIRMADO');

    html += `
      <div class="turno-card-item">
        <div>
          <div class="turno-time-label">${h.inicio} - ${h.fin} hs</div>
          <div class="turno-cupo-info">
            Cupos: <span class="cupo-pill ${isFull ? 'cupo-lleno' : 'cupo-disponible'}">${h.cupoActual} / ${h.cupoMax}</span>
            ${isFull ? '(COMPLETO)' : `(${cuposLibres} libres)`}
          </div>
        </div>
        <div>
          ${yaReservado 
            ? `<button class="btn-sm btn-outline-danger" onclick="cancelTurnoById(${h.id})">Cancelar</button>`
            : `<button class="btn-sm btn-primary" ${isFull ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="reservarTurno(${h.id})">
                ${isFull ? 'Agotado' : 'Reservar'}
               </button>`
          }
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderRutinaMobile() {
  const container = document.getElementById('mExerciseList');
  if (!container) return;

  const assigned = STATE.rutinasAsignadas.find(r => r.usuarioId === (STATE.currentUser ? STATE.currentUser.id : 2) && r.activa);
  if (!assigned) {
    container.innerHTML = `<div class="m-card text-muted">No tienes una rutina asignada actualmente.</div>`;
    return;
  }

  const routine = STATE.rutinas.find(r => r.id === assigned.rutinaId);
  if (!routine) return;

  document.getElementById('mRoutineHeaderName').textContent = routine.nombre;
  document.getElementById('mRoutineHeaderGoal').textContent = `Objetivo: ${routine.objetivo}`;
  document.getElementById('mRoutineBadgeLevel').textContent = routine.nivel;

  let html = '';
  routine.ejercicios.forEach(exId => {
    const ex = STATE.ejercicios.find(e => e.id === exId);
    if (!ex) return;
    const isChecked = STATE.completedExercises[exId] ? 'checked' : '';

    html += `
      <div class="exercise-item">
        <input type="checkbox" class="ex-checkbox" data-exid="${ex.id}" ${isChecked} onchange="toggleExerciseCheck(${ex.id}, this.checked)">
        <div class="ex-info">
          <div class="ex-name">${ex.nombre}</div>
          <div class="ex-sub">${ex.grupo}</div>
        </div>
        <div class="ex-reps">4x12 reps</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.toggleExerciseCheck = function(exId, isChecked) {
  STATE.completedExercises[exId] = isChecked;
  updateRoutineHomeProgress();
  showToast(isChecked ? '✅ Ejercicio Completado' : 'Ejercicio Desmarcado', 'Progreso de rutina sincronizado.');
};

// ============================================================================
// 6. CONTROL DE TRANSACCIONES DE CUPO (SIMULACIÓN DE POSTGRESQL "FOR UPDATE")
// ============================================================================

window.reservarTurno = function(horarioId) {
  if (!STATE.currentUser) {
    alert('Debes iniciar sesión para reservar.');
    return;
  }

  // 1. Simulación de transacción atómica y verificación de cupos
  const horario = STATE.horarios.find(h => h.id === horarioId);
  if (!horario) return;

  if (horario.cupoActual >= horario.cupoMax) {
    showToast('❌ Sin Cupo', 'El horario seleccionado ya no dispone de lugares libres.');
    return;
  }

  // 2. Verificar duplicados (Constraint uq_usuario_horario_fecha)
  const existe = STATE.turnos.some(t => t.usuarioId === STATE.currentUser.id && t.horarioId === horarioId && t.estado === 'CONFIRMADO');
  if (existe) {
    showToast('⚠️ Reserva Existente', 'Ya posees una reserva activa para este turno.');
    return;
  }

  // 3. Modificación atómica
  horario.cupoActual += 1;
  const nuevoTurno = {
    id: Date.now(),
    usuarioId: STATE.currentUser.id,
    horarioId: horario.id,
    fecha: '2026-10-12',
    estado: 'CONFIRMADO'
  };
  STATE.turnos.push(nuevoTurno);

  // 4. Refresco de UI
  renderAllViews();
  showToast('🎉 Turno Confirmado', `Reservaste para el ${horario.dia} a las ${horario.inicio} hs.`);
};

window.cancelTurnoById = function(horarioId) {
  if (!STATE.currentUser) return;

  const index = STATE.turnos.findIndex(t => t.usuarioId === STATE.currentUser.id && t.horarioId === horarioId && t.estado === 'CONFIRMADO');
  if (index !== -1) {
    STATE.turnos.splice(index, 1);
    const horario = STATE.horarios.find(h => h.id === horarioId);
    if (horario && horario.cupoActual > 0) {
      horario.cupoActual -= 1;
    }
    renderAllViews();
    showToast('Turno Cancelado', 'Tu lugar ha sido liberado para otros alumnos.');
  }
};

function cancelActiveTurn() {
  if (!STATE.currentUser) return;
  const myTurn = STATE.turnos.find(t => t.usuarioId === STATE.currentUser.id && t.estado === 'CONFIRMADO');
  if (myTurn) {
    window.cancelTurnoById(myTurn.horarioId);
  }
}

// ============================================================================
// 7. RENDERIZADO DEL DASHBOARD WEB ADMIN (CON FILTRO RBAC)
// ============================================================================

function renderAdminView() {
  const rbacWarning = document.getElementById('adminRbacWarning');
  const isAdmin = STATE.currentUser && STATE.currentUser.rol === 'ADMIN';

  if (!isAdmin) {
    rbacWarning.style.display = 'flex';
  } else {
    rbacWarning.style.display = 'none';
  }

  // KPIs
  const totalCupos = STATE.horarios.reduce((acc, h) => acc + h.cupoMax, 0);
  const cuposOcupados = STATE.horarios.reduce((acc, h) => acc + h.cupoActual, 0);
  const ocupacionPct = totalCupos > 0 ? ((cuposOcupados / totalCupos) * 100).toFixed(1) : 0;

  document.getElementById('kpiTurnosHoy').textContent = STATE.turnos.filter(t => t.estado === 'CONFIRMADO').length;
  document.getElementById('kpiOcupacion').textContent = `${ocupacionPct}%`;
  document.getElementById('kpiUsuariosActivos').textContent = STATE.usuarios.length;
  document.getElementById('kpiRutinasActivas').textContent = STATE.rutinasAsignadas.filter(r => r.activa).length;

  // 1. Tabla de Turnos Activos
  renderAdminTableTurnos();

  // 2. Tabla de Horarios
  renderAdminTableHorarios();

  // 3. Tabla de Rutinas Asignadas
  renderAdminTableRutinas();

  // 4. Catálogo de Ejercicios
  renderAdminExercises();

  // 5. Tabla de Usuarios
  renderAdminTableUsuarios();
}

function renderAdminTableTurnos() {
  const tbody = document.querySelector('#tableAdminTurnos tbody');
  if (!tbody) return;

  let html = '';
  STATE.turnos.forEach(t => {
    const user = STATE.usuarios.find(u => u.id === t.usuarioId);
    const hor = STATE.horarios.find(h => h.id === t.horarioId);

    html += `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${user ? `${user.nombre} ${user.apellido}` : 'Usuario'}</strong><br><small class="text-muted">${user ? user.email : ''}</small></td>
        <td>${hor ? `${hor.dia} (${hor.inicio} - ${hor.fin})` : '-'}</td>
        <td>${t.fecha}</td>
        <td><span class="status-pill status-confirmed">${t.estado}</span></td>
        <td>
          <button class="btn-sm btn-outline-danger" onclick="adminCancelTurno(${t.id})">Liberar Cupo</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

window.adminCancelTurno = function(turnoId) {
  if (!checkAdminPermission()) return;

  const idx = STATE.turnos.findIndex(t => t.id === turnoId);
  if (idx !== -1) {
    const t = STATE.turnos[idx];
    const hor = STATE.horarios.find(h => h.id === t.horarioId);
    if (hor && hor.cupoActual > 0) hor.cupoActual -= 1;
    STATE.turnos.splice(idx, 1);
    renderAllViews();
    showToast('Turno Gestionado', `Turno #${turnoId} cancelado por el Administrador.`);
  }
};

function renderAdminTableHorarios() {
  const tbody = document.querySelector('#tableAdminHorarios tbody');
  if (!tbody) return;

  let html = '';
  STATE.horarios.forEach(h => {
    const libres = h.cupoMax - h.cupoActual;
    html += `
      <tr>
        <td>#${h.id}</td>
        <td><strong>${h.dia}</strong></td>
        <td>${h.inicio} - ${h.fin} hs</td>
        <td>${h.cupoMax} pers.</td>
        <td>${h.cupoActual} ocupados</td>
        <td><span class="cupo-pill ${libres > 0 ? 'cupo-disponible' : 'cupo-lleno'}">${libres} lugares</span></td>
        <td><span class="status-pill status-confirmed">${h.activo ? 'ACTIVO' : 'PAUSADO'}</span></td>
        <td>
          <button class="btn-sm btn-ghost" onclick="adminToggleHorario(${h.id})">
            ${h.activo ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

window.adminToggleHorario = function(hId) {
  if (!checkAdminPermission()) return;
  const h = STATE.horarios.find(item => item.id === hId);
  if (h) {
    h.activo = !h.activo;
    renderAllViews();
    showToast('Horario Modificado', `Franja #${hId} ${h.activo ? 'activada' : 'desactivada'}.`);
  }
};

function renderAdminTableRutinas() {
  const tbody = document.querySelector('#tableAdminRutinasAsignadas tbody');
  if (!tbody) return;

  let html = '';
  STATE.rutinasAsignadas.forEach(ra => {
    const user = STATE.usuarios.find(u => u.id === ra.usuarioId);
    const rut = STATE.rutinas.find(r => r.id === ra.rutinaId);

    html += `
      <tr>
        <td>#${ra.id}</td>
        <td>${user ? `${user.nombre} ${user.apellido}` : '-'}</td>
        <td><strong>${rut ? rut.nombre : '-'}</strong></td>
        <td>${rut ? rut.objetivo : '-'}</td>
        <td><span class="badge-level">${rut ? rut.nivel : '-'}</span></td>
        <td>${ra.fechaInicio}</td>
        <td><span class="status-pill status-confirmed">${ra.activa ? 'EN CURSO' : 'FINALIZADA'}</span></td>
        <td>
          <button class="btn-sm btn-outline-danger" onclick="adminDesactivarRutina(${ra.id})">Desvincular</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

window.adminDesactivarRutina = function(id) {
  if (!checkAdminPermission()) return;
  const idx = STATE.rutinasAsignadas.findIndex(r => r.id === id);
  if (idx !== -1) {
    STATE.rutinasAsignadas.splice(idx, 1);
    renderAllViews();
    showToast('Rutina Actualizada', 'Asignación removida con éxito.');
  }
};

function renderAdminExercises() {
  const grid = document.getElementById('adminExerciseGrid');
  if (!grid) return;

  let html = '';
  STATE.ejercicios.forEach(ex => {
    html += `
      <div class="exercise-admin-card">
        <div>
          <span class="ex-muscle-tag">${ex.grupo}</span>
          <h4 style="margin: 6px 0;">${ex.nombre}</h4>
          <p class="text-muted" style="font-size: 0.85rem;">${ex.desc}</p>
        </div>
        <div style="margin-top: 14px; text-align: right;">
          <button class="btn-sm btn-ghost" onclick="showToast('Ejercicio', 'Detalles sincronizados con la BD.')">Editar</button>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

function renderAdminTableUsuarios() {
  const tbody = document.querySelector('#tableAdminUsuarios tbody');
  if (!tbody) return;

  let html = '';
  STATE.usuarios.forEach(u => {
    html += `
      <tr>
        <td>#${u.id}</td>
        <td><strong>${u.nombre} ${u.apellido}</strong></td>
        <td>${u.email}</td>
        <td>${u.telefono}</td>
        <td><span class="badge-role ${u.rol === 'ADMIN' ? 'role-admin' : 'role-client'}">${u.rol}</span></td>
        <td><span class="status-pill status-confirmed">ACTIVO</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function checkAdminPermission() {
  if (!STATE.currentUser || STATE.currentUser.rol !== 'ADMIN') {
    alert('Acción denegada por RBAC: Se requieren permisos de Administrador.');
    return false;
  }
  return true;
}

// ============================================================================
// 8. MODALES DE CREACIÓN Y EDICIÓN
// ============================================================================

function setupModals() {
  // Cierre genérico de modales con botones data-close
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      document.getElementById(modalId)?.classList.remove('active');
    });
  });

  // Modal Nuevo Horario
  document.getElementById('btnOpenNewHorarioModal')?.addEventListener('click', () => {
    if (!checkAdminPermission()) return;
    document.getElementById('modalHorario')?.classList.add('active');
  });

  document.getElementById('formNewHorario')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dia = document.getElementById('newHorarioDia').value;
    const inicio = document.getElementById('newHorarioInicio').value;
    const fin = document.getElementById('newHorarioFin').value;
    const cupo = parseInt(document.getElementById('newHorarioCupo').value, 10);

    const newH = {
      id: Date.now(),
      dia,
      inicio,
      fin,
      cupoMax: cupo,
      cupoActual: 0,
      activo: true
    };
    STATE.horarios.push(newH);
    document.getElementById('modalHorario')?.classList.remove('active');
    renderAllViews();
    showToast('Franja Creada', `Nuevo horario para ${dia} de ${inicio} a ${fin} guardado en PostgreSQL.`);
  });

  // Modal Asignar Rutina
  document.getElementById('btnOpenAssignRoutineModal')?.addEventListener('click', () => {
    if (!checkAdminPermission()) return;
    populateAssignRoutineSelects();
    document.getElementById('modalAsignarRutina')?.classList.add('active');
  });

  document.getElementById('formAssignRoutine')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const uId = parseInt(document.getElementById('assignUserSelect').value, 10);
    const rId = parseInt(document.getElementById('assignRoutineSelect').value, 10);
    const obs = document.getElementById('assignRoutineObs').value;

    STATE.rutinasAsignadas.push({
      id: Date.now(),
      usuarioId: uId,
      rutinaId: rId,
      fechaInicio: new Date().toISOString().split('T')[0],
      activa: true,
      obs
    });
    document.getElementById('modalAsignarRutina')?.classList.remove('active');
    renderAllViews();
    showToast('Rutina Asignada', 'Programa de entrenamiento vinculado al alumno.');
  });

  // Modal Nuevo Ejercicio
  document.getElementById('btnOpenNewExerciseModal')?.addEventListener('click', () => {
    if (!checkAdminPermission()) return;
    document.getElementById('modalEjercicio')?.classList.add('active');
  });

  document.getElementById('formNewEjercicio')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('newExNombre').value;
    const grupo = document.getElementById('newExGrupo').value;
    const desc = document.getElementById('newExDesc').value;

    STATE.ejercicios.push({
      id: Date.now(),
      nombre,
      grupo,
      desc
    });
    document.getElementById('modalEjercicio')?.classList.remove('active');
    renderAllViews();
    showToast('Ejercicio Añadido', `"${nombre}" ingresado al catálogo oficial.`);
  });
}

function populateAssignRoutineSelects() {
  const userSel = document.getElementById('assignUserSelect');
  const rutSel = document.getElementById('assignRoutineSelect');
  if (!userSel || !rutSel) return;

  userSel.innerHTML = STATE.usuarios
    .filter(u => u.rol === 'CLIENTE')
    .map(u => `<option value="${u.id}">${u.nombre} ${u.apellido} (${u.email})</option>`)
    .join('');

  rutSel.innerHTML = STATE.rutinas
    .map(r => `<option value="${r.id}">${r.nombre} - Nivel ${r.nivel}</option>`)
    .join('');
}

// ============================================================================
// 9. TOAST DE NOTIFICACIONES
// ============================================================================

function showToast(title, msg) {
  const toast = document.getElementById('toastNotification');
  const tTitle = document.getElementById('toastTitle');
  const tMsg = document.getElementById('toastMessage');

  if (!toast) return;

  tTitle.textContent = title;
  tMsg.textContent = msg;

  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3500);
}

// Helper para refrescar ambas plataformas
function renderAllViews() {
  renderMobileHome();
  renderTurnosMobile();
  renderRutinaMobile();
  renderAdminView();
}
