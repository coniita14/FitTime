import React, { useMemo, useState } from 'react';
import { View, Text, Linking, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Row, Button, Pill, SectionTitle, useBrand } from '../../components/cliente/ui';
import { gymService } from '../../api/gym.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, DIA_LABEL } from '../../utils/dialogos';
import { fechaLarga, hora, yaPaso, linkGoogleCalendar } from '../../utils/fechas';
import { GIMNASIO } from '../../config/gimnasio';
import { ESTADO_PILL } from './MisTurnosScreen';

// 2E · Detalle del Turno: datos, instructor, información del horario, ubicación,
// "Agregar al Calendario" y "Cancelar Turno".
export const TurnoDetalleScreen = ({ navigation, route }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { turno } = route.params;
  const h = turno.horarios || {};
  const instructor = h.usuarios ? `${h.usuarios.nombre} ${h.usuarios.apellido !== '-' ? h.usuarios.apellido : ''}`.trim() : null;
  const [cancelando, setCancelando] = useState(false);
  const futuro = turno.estado === 'CONFIRMADO' && !yaPaso(turno.fecha_turno, h.hora_inicio);
  const pill = ESTADO_PILL[turno.estado] || ESTADO_PILL.CONFIRMADO;

  const agregarCalendario = () => {
    Linking.openURL(linkGoogleCalendar({
      titulo: `Entrenamiento en ${GIMNASIO.nombre}`,
      fechaIso: turno.fecha_turno,
      inicio: h.hora_inicio,
      fin: h.hora_fin,
      detalle: `Turno #${turno.id}${instructor ? ` · Instructor: ${instructor}` : ''}`,
      lugar: GIMNASIO.direccion,
    })).catch(() => avisar('No se pudo abrir el calendario', 'Intentá de nuevo.'));
  };

  const comoLlegar = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(GIMNASIO.mapsQuery)}`).catch(() => {});

  const cancelar = async () => {
    const ok = await confirmar('Cancelar turno', `¿Querés cancelar el turno del ${fechaLarga(turno.fecha_turno)} a las ${hora(h.hora_inicio)}? El lugar quedará libre para otra persona.`, 'Cancelar turno');
    if (!ok) return;
    setCancelando(true);
    try {
      const aviso = await gymService.cancelarTurno(turno.id);
      avisar('Turno cancelado', aviso || 'El lugar quedó disponible nuevamente.');
      navigation.goBack();
    } catch (e) {
      avisar('No se pudo cancelar', mensajeDeError(e));
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Screen title="Detalle del Turno" onBack={navigation.goBack}>
      <Card>
        <View style={s.titleRow}>
          <Text style={s.title}>Turno #{turno.id}</Text>
          <Pill text={pill.text} tone={pill.tone} small />
        </View>
        <Row label="Estado:" value={pill.text} />
        <Row label="Fecha:" value={fechaLarga(turno.fecha_turno)} />
        <Row label="Hora:" value={`${hora(h.hora_inicio)} - ${hora(h.hora_fin)} hs`} />
        <Row label="Instructor:" value={instructor || '[ Pendiente de asignación ]'} last />
      </Card>

      <SectionTitle>Información del Horario</SectionTitle>
      <Card>
        <Row label="Día:" value={DIA_LABEL[h.dia] || '-'} />
        <Row label="Inicio:" value={`${hora(h.hora_inicio)} hs`} />
        <Row label="Fin:" value={`${hora(h.hora_fin)} hs`} />
        <Row label="Cupos totales:" value={String(h.cupo_maximo ?? '-')} last />
      </Card>

      <TouchableOpacity onPress={comoLlegar} style={s.map} accessibilityRole="button" accessibilityLabel="Ver ubicación en el mapa">
        <Ionicons name="location" size={30} color={b.primary} />
        <Text style={s.mapTitle}>{GIMNASIO.nombre}</Text>
        <Text style={s.mapText}>{GIMNASIO.direccion}</Text>
        <Text style={s.mapLink}>Ver en el mapa · Cómo llegar</Text>
      </TouchableOpacity>

      {futuro && <Button title="Agregar al Calendario" icon="calendar-outline" onPress={agregarCalendario} />}
      {futuro && <Button title="Cancelar Turno" variant="white" onPress={cancelar} loading={cancelando} style={{ marginTop: 10 }} />}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: b.text, fontSize: 18, fontWeight: '800' },
  map: {
    backgroundColor: b.cardSoft, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 4,
    marginBottom: 16, borderWidth: 1, borderColor: b.border, borderStyle: 'dashed',
  },
  mapTitle: { color: b.text, fontWeight: '800' },
  mapText: { color: b.textSoft, fontSize: 13 },
  mapLink: { color: b.primary, fontWeight: '700', fontSize: 13, marginTop: 4 },
});
