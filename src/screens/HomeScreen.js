import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { gymService } from '../api/gym.service';
import { clienteService } from '../api/cliente.service';
import { RutinasCatalogo } from '../components/cliente/RutinasCatalogo';
import { NotificacionesModal } from '../components/cliente/NotificacionesModal';
import { mensajeDeError } from '../utils/errores';
import { avisar, confirmar, DIA_LABEL, NIVEL_LABEL } from '../utils/dialogos';

const formatearFecha = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const HomeScreen = () => {
  const { user, logout, updateProfile, changePassword, patchUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState('inicio'); // inicio | turnos | rutina | perfil
  const [horarios, setHorarios] = useState([]);
  const [rutina, setRutina] = useState(null);
  const [misTurnos, setMisTurnos] = useState([]);
  const [selectedDay, setSelectedDay] = useState('LUNES');
  const [loading, setLoading] = useState(false);
  const [completedExercises, setCompletedExercises] = useState({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [savingHorarioId, setSavingHorarioId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSurname, setProfileSurname] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [rutinaVista, setRutinaVista] = useState('mia'); // mia | catalogo | guardadas
  const [noLeidas, setNoLeidas] = useState(0);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const loadRequestId = useRef(0);

  const actualizarNoLeidas = async () => {
    try {
      setNoLeidas(await clienteService.contarNoLeidas());
    } catch (e) {
      console.warn('No se pudo contar notificaciones:', e?.message);
    }
  };

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, selectedDay]);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const [hList, rData, tList] = await Promise.all([
        gymService.getHorarios(selectedDay),
        gymService.getMiRutina(user.id),
        gymService.getMisTurnos(),
      ]);
      actualizarNoLeidas();
      if (requestId === loadRequestId.current) {
        setHorarios(hList);
        setRutina(rData);
        setMisTurnos(tList);
      }
    } catch (e) {
      if (requestId === loadRequestId.current) {
        avisar('No se pudieron cargar tus datos', mensajeDeError(e, 'Comprobá la conexión e intentá de nuevo.'));
      }
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const handleReservar = async (horario) => {
    setSavingHorarioId(horario.id);
    try {
      const booking = await gymService.reservarTurno(horario);
      const turno = Array.isArray(booking) ? booking[0] : booking;
      let reminderWarning = null;
      try {
        if (user?.notificaciones_activas !== false) {
          reminderWarning = await gymService.programarRecordatorio(turno, horario, user?.recordatorio_minutos || 60);
          await clienteService.notificarConfirmacion(horario, turno.fecha_turno);
        }
      } catch (reminderError) {
        console.error('La reserva se guardó, pero no se pudo programar el recordatorio:', reminderError);
        reminderWarning = 'La reserva quedó guardada, pero no se pudo programar el recordatorio en este dispositivo.';
      }
      await loadData();
      avisar(
        'Turno reservado',
        `${DIA_LABEL[horario.dia]} ${formatearFecha(turno.fecha_turno)} a las ${horario.hora_inicio.slice(0, 5)} hs. `
          + (reminderWarning || (user?.notificaciones_activas === false
            ? 'Tenés los recordatorios desactivados.'
            : 'Te vamos a avisar antes del turno.'))
      );
    } catch (err) {
      if (String(err.message).includes('YA_RESERVADO')) {
        avisar('No se pudo reservar', 'Ya tenés un turno reservado en ese horario.');
      } else {
        avisar('No se pudo reservar', mensajeDeError(err, 'No se pudo reservar el turno.'));
      }
      loadData();
    } finally {
      setSavingHorarioId(null);
    }
  };

  const handleCancelTurno = async (turnoId) => {
    const ok = await confirmar('Cancelar turno', '¿Querés liberar este lugar para otra persona?', 'Cancelar turno');
    if (!ok) return;
    try {
      const reminderWarning = await gymService.cancelarTurno(turnoId);
      await loadData();
      avisar('Turno cancelado', reminderWarning || 'El lugar quedó disponible nuevamente.');
    } catch (error) {
      avisar('No se pudo cancelar', mensajeDeError(error, 'Intentá de nuevo.'));
    }
  };

  const handleCambiarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        avisar('Permiso necesario', 'Habilitá el acceso a tus fotos para elegir una imagen de perfil.');
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      setSubiendoFoto(true);
      const url = await clienteService.subirAvatar(user.id, user.authId, resultado.assets[0]);
      patchUser({ avatar_url: url });
      avisar('Foto actualizada', 'Tu nueva foto de perfil ya está guardada.');
    } catch (error) {
      avisar('No se pudo cambiar la foto', mensajeDeError(error));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleNotificacionesActivas = async (valor) => {
    patchUser({ notificaciones_activas: valor });
    try {
      await clienteService.guardarPreferencias(user.id, { notificaciones_activas: valor });
    } catch (error) {
      patchUser({ notificaciones_activas: !valor });
      avisar('No se pudo guardar la preferencia', mensajeDeError(error));
    }
  };

  const handleRecordatorioMinutos = async (minutos) => {
    const anterior = user?.recordatorio_minutos;
    patchUser({ recordatorio_minutos: minutos });
    try {
      await clienteService.guardarPreferencias(user.id, { recordatorio_minutos: minutos });
    } catch (error) {
      patchUser({ recordatorio_minutos: anterior });
      avisar('No se pudo guardar la preferencia', mensajeDeError(error));
    }
  };

  const renderAvatar = (size, textStyle) => (
    user?.avatar_url
      ? <Image source={{ uri: user.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel="Foto de perfil" />
      : <Text style={textStyle}>{(user?.nombre?.[0] || user?.email?.[0] || 'C').toUpperCase()}</Text>
  );

  const openProfileEditor = () => {
    setProfileName(user?.nombre || '');
    setProfileSurname(user?.apellido || '');
    setProfilePhone(user?.telefono || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !profileSurname.trim()) {
      avisar('Datos incompletos', 'El nombre y el apellido son obligatorios.');
      return;
    }
    if (profileName.trim().length > 100 || profileSurname.trim().length > 100 || profilePhone.trim().length > 20) {
      avisar('Datos demasiado largos', 'Usá hasta 100 caracteres para nombre/apellido y 20 para teléfono.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ nombre: profileName, apellido: profileSurname, telefono: profilePhone });
      setShowProfileModal(false);
      avisar('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (error) {
      avisar('No se pudo actualizar el perfil', mensajeDeError(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      avisar('Contraseña inválida', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      avisar('Las contraseñas no coinciden', 'Volvé a escribir la nueva contraseña.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordModal(false);
      avisar('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    } catch (error) {
      avisar('No se pudo cambiar la contraseña', mensajeDeError(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleExercise = (index) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Filtrar horarios por día
  const filteredHorarios = horarios.filter((h) => h.dia === selectedDay);

  // Ejercicios de la rutina
  const exerciseList = rutina?.ejercicios || [];

  const completedCount = Object.values(completedExercises).filter(Boolean).length;
  const progressPct = exerciseList.length
    ? Math.round((completedCount / exerciseList.length) * 100)
    : 0;
  const nextTurno = misTurnos[0];

  return (
    <View style={styles.container}>
      {/* HEADER SUPERIOR FITTIME */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            Fit<Text style={styles.brandAccent}>Time</Text>
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Hola, {user?.nombre || user?.email?.split('@')[0] || 'Atleta'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setShowNotificaciones(true)}
            accessibilityLabel={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}
          >
            <Ionicons name={noLeidas ? 'notifications' : 'notifications-outline'} size={22} color={theme.colors.textPrimary} />
            {noLeidas > 0 && (
              <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{noLeidas > 9 ? '9+' : noLeidas}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton} onPress={() => setActiveTab('perfil')}>
            {renderAvatar(42, styles.avatarText)}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={theme.colors.primaryLight} style={styles.loadingIndicator} />}
        {/* PESTAÑA 1: INICIO */}
        {activeTab === 'inicio' && (
          <View>
            {/* PRÓXIMO TURNO */}
            {nextTurno ? <View style={styles.cardHighlight}>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeText}>PRÓXIMO TURNO</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>Confirmado</Text>
                </View>
              </View>
              <Text style={styles.turnDayText}>
                {DIA_LABEL[nextTurno.horarios?.dia]} · {nextTurno.horarios?.hora_inicio?.slice(0, 5)} a {nextTurno.horarios?.hora_fin?.slice(0, 5)} hs
              </Text>
              <Text style={styles.turnMetaText}>{formatearFecha(nextTurno.fecha_turno)}</Text>
              <View style={styles.turnActionRow}>
                <TouchableOpacity
                  style={styles.btnSmallOutline}
                  onPress={() => handleCancelTurno(nextTurno.id)}
                >
                  <Text style={styles.btnSmallOutlineText}>Liberar lugar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSmallPrimary} onPress={() => setShowQrModal(true)}>
                  <Ionicons name="qr-code-outline" size={16} color="#FFF" />
                  <Text style={styles.btnSmallPrimaryText}>Pase QR</Text>
                </TouchableOpacity>
              </View>
            </View> : (
              <View style={styles.cardHighlight}>
                <Text style={styles.badgeText}>SIN TURNOS RESERVADOS</Text>
                <Text style={styles.turnMetaText}>Reservá un horario para verlo acá.</Text>
                <TouchableOpacity style={styles.btnSmallPrimary} onPress={() => setActiveTab('turnos')}>
                  <Text style={styles.btnSmallPrimaryText}>Buscar turnos</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* RUTINA ACTIVA */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>RUTINA DEL DÍA</Text>
                {rutina?.nivel ? <Text style={styles.levelBadge}>{NIVEL_LABEL[rutina.nivel] || rutina.nivel}</Text> : null}
              </View>
              <Text style={styles.routineTitle}>{rutina?.nombre || 'Todavía no tienes una rutina asignada'}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {completedCount} de {exerciseList.length} completados
                </Text>
                <Text style={styles.progressPercent}>{progressPct}%</Text>
              </View>
            </View>

            {/* ACCESOS RÁPIDOS */}
            <Text style={styles.sectionHeading}>Accesos Rápidos</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickCard} onPress={() => setActiveTab('turnos')}>
                <Ionicons name="calendar" size={24} color={theme.colors.primaryLight} />
                <Text style={styles.quickCardTitle}>Ver Turnos</Text>
                <Text style={styles.quickCardSub}>Cupos en vivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickCard} onPress={() => setActiveTab('rutina')}>
                <Ionicons name="barbell" size={24} color={theme.colors.primaryLight} />
                <Text style={styles.quickCardTitle}>Rutinas</Text>
                <Text style={styles.quickCardSub}>Tu plan y el catálogo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PESTAÑA 2: TURNOS */}
        {activeTab === 'turnos' && (
          <View>
            <Text style={styles.screenHeading}>Reservar turno</Text>
            <Text style={styles.screenSub}>Elegí el día y mirá cuántos lugares quedan</Text>

            {/* SELECTOR DE DÍAS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
              {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map((dia) => (
                <TouchableOpacity
                  key={dia}
                  style={[styles.dayChip, selectedDay === dia && styles.dayChipActive]}
                  onPress={() => setSelectedDay(dia)}
                >
                  <Text style={[styles.dayChipText, selectedDay === dia && styles.dayChipTextActive]}>
                    {DIA_LABEL[dia].substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* LISTA DE HORARIOS */}
            {filteredHorarios.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No hay turnos disponibles para este día.</Text>
              </View>
            ) : (
              filteredHorarios.map((h) => {
                const libres = h.cupo_maximo - h.cupo_actual;
                const isFull = libres <= 0;
                const isSaving = savingHorarioId === h.id;
                return (
                  <View key={h.id} style={styles.turnoRowCard}>
                    <View>
                      <Text style={styles.turnoTime}>
                        {h.hora_inicio.substring(0, 5)} - {h.hora_fin.substring(0, 5)} hs
                      </Text>
                      <Text style={styles.turnoCupo}>
                        Cupos: <Text style={isFull ? styles.cupoLleno : styles.cupoLibre}>{h.cupo_actual}/{h.cupo_maximo}</Text>{' '}
                        {isFull ? '(AGOTADO)' : `(${libres} libres)`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={isFull || savingHorarioId !== null}
                      style={[styles.btnReservar, (isFull || isSaving) && styles.btnReservarDisabled]}
                      onPress={() => handleReservar(h)}
                    >
                      {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : (
                        <Text style={styles.btnReservarText}>{isFull ? 'Agotado' : 'Reservar'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* PESTAÑA 3: RUTINA */}
        {activeTab === 'rutina' && (
          <View>
            <View style={styles.segment}>
              {[['mia', 'Mi rutina'], ['catalogo', 'Catálogo'], ['guardadas', 'Guardadas']].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.segmentItem, rutinaVista === key && styles.segmentItemActive]}
                  onPress={() => setRutinaVista(key)}
                >
                  <Text style={[styles.segmentText, rutinaVista === key && styles.segmentTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {activeTab === 'rutina' && rutinaVista === 'catalogo' && <RutinasCatalogo />}
        {activeTab === 'rutina' && rutinaVista === 'guardadas' && <RutinasCatalogo soloGuardadas />}
        {activeTab === 'rutina' && rutinaVista === 'mia' && (
          <View>
            <Text style={styles.screenHeading}>{rutina?.nombre || 'Plan de entrenamiento'}</Text>
            <Text style={styles.screenSub}>Objetivo: {rutina?.objetivo || 'Consultá con tu entrenador para recibir un plan, o elegí una del catálogo.'}</Text>

            <View style={styles.routineMetaCard}>
              <Text style={styles.routineMetaText}>Nivel: {NIVEL_LABEL[rutina?.nivel] || 'Sin asignar'}</Text>
            </View>

            {exerciseList.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Todavía no hay ejercicios asignados a tu rutina.</Text>
              </View>
            )}
            {exerciseList.map((ex, idx) => {
              const isChecked = !!completedExercises[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.exerciseCard, isChecked && styles.exerciseCardDone]}
                  onPress={() => toggleExercise(idx)}
                >
                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={isChecked ? theme.colors.success : theme.colors.primaryLight}
                  />
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, isChecked && styles.exerciseNameDone]}>
                      {ex.nombre}
                    </Text>
                    <Text style={styles.exerciseSub}>
                      {ex.grupo} · {ex.series} series x {ex.repeticiones} reps
                    </Text>
                  </View>
                  <Text style={styles.restText}>{ex.descanso || 60}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* PESTAÑA 4: PERFIL */}
        {activeTab === 'perfil' && (
          <View>
            <View style={styles.profileBox}>
              <TouchableOpacity style={styles.avatarLg} onPress={handleCambiarFoto} disabled={subiendoFoto} accessibilityLabel="Cambiar foto de perfil">
                {subiendoFoto ? <ActivityIndicator color={theme.colors.primaryLight} /> : renderAvatar(72, styles.avatarLgText)}
                <View style={styles.cameraBadge}><Ionicons name="camera" size={14} color="#FFF" /></View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{user?.nombre || 'Socio'} {user?.apellido && user.apellido !== '-' ? user.apellido : ''}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user?.rol === 'ADMIN' ? 'ADMINISTRADOR' : 'CLIENTE'}</Text>
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>Recordatorios de turnos</Text>
                <Switch
                  value={user?.notificaciones_activas !== false}
                  onValueChange={handleNotificacionesActivas}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
              {user?.notificaciones_activas !== false && (
                <View style={styles.reminderRow}>
                  <Text style={styles.reminderLabel}>Avisarme antes:</Text>
                  {[30, 60, 120].map((min) => {
                    const activo = (user?.recordatorio_minutos || 60) === min;
                    return (
                      <TouchableOpacity key={min} onPress={() => handleRecordatorioMinutos(min)} style={[styles.reminderChip, activo && styles.reminderChipActive]}>
                        <Text style={[styles.reminderChipText, activo && { color: '#FFF' }]}>{min < 60 ? `${min} min` : `${min / 60} h`}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity style={styles.settingItem} onPress={() => setShowNotificaciones(true)}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>Historial de notificaciones</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <TouchableOpacity style={styles.settingItem} onPress={() => setShowQrModal(true)}>
                <Ionicons name="qr-code-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>Mi Pase QR de Acceso</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={handleCambiarFoto} disabled={subiendoFoto}>
                <Ionicons name="image-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>{subiendoFoto ? 'Subiendo foto…' : 'Cambiar foto de perfil'}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={openProfileEditor}>
                <Ionicons name="person-circle-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>Editar mis datos</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={() => setShowPasswordModal(true)}>
                <Ionicons name="key-outline" size={20} color={theme.colors.primaryLight} />
                <Text style={styles.settingItemText}>Cambiar contraseña</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => toggleTheme().catch((error) => avisar('No se pudo guardar el tema', mensajeDeError(error)))}
              >
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={20}
                  color={theme.colors.primaryLight}
                />
                <Text style={styles.settingItemText}>{isDark ? 'Activar tema claro' : 'Activar tema oscuro'}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => logout().catch((error) => avisar('No se pudo cerrar sesión', mensajeDeError(error)))}
              >
                <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
                <Text style={[styles.settingItemText, { color: theme.colors.danger }]}>Cerrar Sesión</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('inicio')}>
          <Ionicons
            name={activeTab === 'inicio' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'inicio' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navText, activeTab === 'inicio' && styles.navTextActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('turnos')}>
          <Ionicons
            name={activeTab === 'turnos' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'turnos' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navText, activeTab === 'turnos' && styles.navTextActive]}>Turnos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('rutina')}>
          <Ionicons
            name={activeTab === 'rutina' ? 'barbell' : 'barbell-outline'}
            size={22}
            color={activeTab === 'rutina' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navText, activeTab === 'rutina' && styles.navTextActive]}>Rutina</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('perfil')}>
          <Ionicons
            name={activeTab === 'perfil' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'perfil' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text style={[styles.navText, activeTab === 'perfil' && styles.navTextActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>

      <NotificacionesModal
        visible={showNotificaciones}
        onClose={() => setShowNotificaciones(false)}
        onLeidas={() => setNoLeidas(0)}
      />

      {/* MODAL PASE QR */}
      <Modal visible={showQrModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pase de Acceso Gimnasio</Text>
            <Text style={styles.modalSub}>Vista gráfica de demostración; no valida el ingreso al gimnasio.</Text>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={140} color="#000" />
            </View>
            <Text style={styles.qrUserText}>{user?.nombre || user?.email || 'Socio Activo'}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQrModal(false)}>
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar mis datos</Text>
            <TextInput
              style={styles.profileInput}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Nombre"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={100}
              accessibilityLabel="Nombre"
            />
            <TextInput
              style={styles.profileInput}
              value={profileSurname}
              onChangeText={setProfileSurname}
              placeholder="Apellido"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={100}
              accessibilityLabel="Apellido"
            />
            <TextInput
              style={styles.profileInput}
              value={profilePhone}
              onChangeText={setProfilePhone}
              placeholder="Teléfono (opcional)"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
              accessibilityLabel="Teléfono"
            />
            <TouchableOpacity
              style={[styles.modalCloseBtn, savingProfile && styles.btnReservarDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.modalCloseBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalSub}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar contraseña</Text>
            <TextInput
              style={styles.profileInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña (8 caracteres mínimo)"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              accessibilityLabel="Nueva contraseña"
            />
            <TextInput
              style={styles.profileInput}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              accessibilityLabel="Confirmar nueva contraseña"
            />
            <TouchableOpacity
              style={[styles.modalCloseBtn, savingPassword && styles.btnReservarDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.modalCloseBtnText}>Actualizar contraseña</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.modalSub}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellButton: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.colors.background,
  },
  segment: {
    flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 14, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentItemActive: { backgroundColor: theme.colors.primary },
  segmentText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#FFFFFF' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
  reminderLabel: { color: theme.colors.textSecondary, fontSize: 13 },
  reminderChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border },
  reminderChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  reminderChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  brandAccent: {
    color: theme.colors.primaryLight,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingIndicator: {
    marginVertical: 8,
  },
  cardHighlight: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeText: {
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: 'bold',
  },
  turnDayText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  turnMetaText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  turnActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSmallOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSmallOutlineText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
    fontSize: 12,
  },
  btnSmallPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnSmallPrimaryText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  levelBadge: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  routineTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 999,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  progressPercent: {
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  quickCardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
  quickCardSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  screenHeading: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  screenSub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  daysScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  dayChipText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  dayChipTextActive: {
    color: theme.colors.textPrimary,
  },
  turnoRowCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  turnoTime: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  turnoCupo: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  cupoLibre: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  cupoLleno: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  btnReservar: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnReservarDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  btnReservarText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  routineMetaCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    gap: 4,
  },
  routineMetaText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  exerciseCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  exerciseCardDone: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  exerciseNameDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  exerciseSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  restText: {
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
    fontSize: 12,
  },
  profileBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLgText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  roleBadgeText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingsGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  settingItemText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  navTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  qrPlaceholder: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  qrUserText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalCloseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  profileInput: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
