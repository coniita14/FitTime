import { supabase, supabaseConfigError } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_IDS_KEY = '@fittime_turno_reminders';

const ensureSupabaseConfigured = () => {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
};

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const nextDateForSchedule = (dayName, startTime) => {
  const weekdays = {
    DOMINGO: 0,
    LUNES: 1,
    MARTES: 2,
    MIERCOLES: 3,
    JUEVES: 4,
    VIERNES: 5,
    SABADO: 6,
  };
  const targetDay = weekdays[dayName];
  if (targetDay === undefined) throw new Error('El día seleccionado no es válido.');

  const date = new Date();
  const today = date.getDay();
  let daysUntil = (targetDay - today + 7) % 7;
  const [hours, minutes] = startTime.split(':').map(Number);
  const isTimeStillAhead = hours * 60 + minutes > date.getHours() * 60 + date.getMinutes();
  if (daysUntil === 0 && !isTimeStillAhead) daysUntil = 7;
  date.setDate(date.getDate() + daysUntil);
  return localDate(date);
};

export const gymService = {
  async getHorarios(dia) {
    ensureSupabaseConfigured();
    const now = new Date();
    const { data, error } = await supabase.rpc('obtener_horarios_disponibles', {
      p_dia: dia,
      p_fecha_actual: localDate(now),
      p_hora_actual: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
    });
    if (error) throw error;
    return data;
  },

  async reservarTurno(horario) {
    ensureSupabaseConfigured();
    const fechaTurno = nextDateForSchedule(horario.dia, horario.hora_inicio);
    const { data, error } = await supabase.rpc('reservar_turno', {
      p_horario_id: horario.id,
      p_fecha_turno: fechaTurno,
    });
    if (error) throw error;
    return data;
  },

  async cancelarTurno(turnoId) {
    ensureSupabaseConfigured();
    const { error } = await supabase.rpc('cancelar_turno', {
      p_turno_id: turnoId,
    });
    if (error) throw error;
    try {
      const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
      const reminderIds = storedIds ? JSON.parse(storedIds) : {};
      if (reminderIds[turnoId]) {
        await Notifications.cancelScheduledNotificationAsync(reminderIds[turnoId]);
        delete reminderIds[turnoId];
        await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(reminderIds));
      }
      return null;
    } catch (reminderError) {
      console.error('El turno se canceló, pero no se pudo borrar su recordatorio local:', reminderError);
      return 'El turno se canceló, pero no se pudo borrar el recordatorio local del dispositivo.';
    }
  },

  async programarRecordatorio(turno, horario, minutosAntes = 60) {
    if (Platform.OS === 'web') {
      return 'Los recordatorios locales están disponibles en Android e iOS, no en el navegador.';
    }

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== 'granted') {
      return 'No se habilitaron las notificaciones; la reserva sí quedó confirmada.';
    }

    await Notifications.setNotificationChannelAsync('reservas', {
      name: 'Recordatorios de turnos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    const [year, month, day] = turno.fecha_turno.split('-').map(Number);
    const [hours, minutes] = horario.hora_inicio.split(':').map(Number);
    const startsAt = new Date(year, month - 1, day, hours, minutes);
    const reminderAt = new Date(startsAt.getTime() - minutosAntes * 60 * 1000);
    if (reminderAt <= new Date()) {
      return 'La reserva quedó confirmada. Falta poco para el turno, así que no se programó un recordatorio.';
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: minutosAntes >= 60 ? `Tu turno en FitTime es en ${Math.round(minutosAntes / 60)} h` : `Tu turno en FitTime es en ${minutosAntes} min`,
        body: `${horario.dia}, ${horario.hora_inicio.slice(0, 5)} hs`,
        data: { turnoId: turno.id },
      },
      trigger: reminderAt,
    });
    const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
    const reminderIds = storedIds ? JSON.parse(storedIds) : {};
    reminderIds[turno.id] = notificationId;
    await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(reminderIds));
    return null;
  },

  async getMisTurnos() {
    ensureSupabaseConfigured();
    const { data, error } = await supabase
      .from('turnos')
      .select('id, horario_id, fecha_turno, estado, horarios(dia, hora_inicio, hora_fin)')
      .eq('estado', 'CONFIRMADO')
      .gte('fecha_turno', localDate(new Date()))
      .order('fecha_turno')
      .order('horario_id');
    if (error) throw error;
    const now = new Date();
    const today = localDate(now);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return data.filter((booking) =>
      booking.fecha_turno > today ||
      (booking.fecha_turno === today && booking.horarios?.hora_inicio?.slice(0, 5) > currentTime)
    );
  },

  async getMiRutina(usuarioId) {
    ensureSupabaseConfigured();
    const { data, error } = await supabase
      .from('rutina_asignada')
      .select('*, rutinas(nombre, objetivo, nivel, rutina_detalle(orden, series, repeticiones, descanso_segundos, ejercicios(nombre, grupo_muscular)))')
      .eq('usuario_id', usuarioId)
      .eq('activa', true)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const assignedRoutine = data.rutinas;
    return {
      ...assignedRoutine,
      ejercicios: (assignedRoutine?.rutina_detalle || [])
        .sort((first, second) => first.orden - second.orden)
        .map((detail) => ({
          ...detail.ejercicios,
          grupo: detail.ejercicios?.grupo_muscular,
          series: detail.series,
          repeticiones: detail.repeticiones,
          descanso: detail.descanso_segundos,
        })),
    };
  },
};
