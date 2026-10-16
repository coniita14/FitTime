import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Loading, ErrorBox, Empty, ProgressBar, BottomSheet, Button, Row, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { gymService } from '../../api/gym.service';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { fechaCorta, fechaLarga, hora } from '../../utils/fechas';

// 2B · Lista de bloques del día con ocupación + 2C · hoja "Confirmar Reserva".
export const BloquesScreen = ({ navigation, route }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { user } = useAuth();
  const { fecha, horarioId } = route.params;
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [estado, setEstado] = useState('confirmar'); // confirmar | enviando | ok | error
  const [mensaje, setMensaje] = useState('');
  const scrollRef = useRef(null);
  const posiciones = useRef({});
  const yaScrolleo = useRef(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBloques(await clienteService.horariosPorFecha(fecha));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoading(false);
    }
  }, [fecha]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (h) => { setElegido(h); setEstado('confirmar'); setMensaje(''); };

  const confirmar = async () => {
    setEstado('enviando');
    try {
      const turno = await clienteService.reservar(elegido.id, fecha);
      const t = Array.isArray(turno) ? turno[0] : turno;
      if (user?.notificaciones_activas !== false) {
        try {
          await clienteService.notificarConfirmacion(elegido, fecha);
          await gymService.programarRecordatorio(t, elegido, user?.recordatorio_minutos || 60);
        } catch { /* la reserva ya quedó hecha aunque falle la notificación local */ }
      }
      setEstado('ok');
      cargar();
    } catch (e) {
      setMensaje(mensajeDeError(e, 'No se pudo reservar el turno.'));
      setEstado('error');
      cargar();
    }
  };

  const libres = elegido ? elegido.cupo_maximo - elegido.cupo_actual : 0;

  return (
    <Screen title={fechaCorta(fecha)} onBack={navigation.goBack} scroll={false}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}
        onContentSizeChange={() => {
          const y = posiciones.current[horarioId];
          if (!yaScrolleo.current && y !== undefined && scrollRef.current) {
            yaScrolleo.current = true;
            scrollRef.current.scrollTo({ y: Math.max(0, y - 40), animated: false });
          }
        }}>
        <Text style={s.hint}>Seleccioná un horario disponible</Text>
        {loading && <Loading />}
        {!loading && error && <ErrorBox message={error} onRetry={cargar} />}
        {!loading && !error && bloques.length === 0 && <Empty icon="calendar-clear-outline" text="No quedan horarios para este día." />}
        {!loading && !error && bloques.map((h) => {
          const lleno = h.cupo_actual >= h.cupo_maximo;
          const ocupacion = (h.cupo_actual / h.cupo_maximo) * 100;
          const destacado = h.id === horarioId;
          return (
            <View key={h.id} onLayout={(e) => { posiciones.current[h.id] = e.nativeEvent.layout.y; }}>
              <Card muted={lleno && !h.ya_reservado} style={[s.block, destacado && s.blockFocus]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.time}>{hora(h.hora_inicio)} – {hora(h.hora_fin)}</Text>
                  <ProgressBar value={ocupacion} color={lleno ? b.textMuted : b.check} />
                  <Text style={s.meta}>
                    {h.cupo_actual}/{h.cupo_maximo} cupos{lleno ? ' — COMPLETO' : ''}{h.entrenador ? ` · ${h.entrenador}` : ''}
                  </Text>
                </View>
                {h.ya_reservado ? (
                  <View style={s.reserved}><Ionicons name="checkmark-circle" size={16} color={b.success} /><Text style={[s.reservedText, { color: b.success }]}>Reservado</Text></View>
                ) : (
                  <TouchableOpacity disabled={lleno} onPress={() => abrir(h)}
                    style={[s.reservar, { backgroundColor: lleno ? b.track : b.primary }]} accessibilityRole="button"
                    accessibilityLabel={lleno ? `Horario ${hora(h.hora_inicio)} completo` : `Reservar ${hora(h.hora_inicio)}`}>
                    <Text style={[s.reservarText, lleno && { color: b.textMuted }]}>{lleno ? 'Completo' : 'Reservar'}</Text>
                  </TouchableOpacity>
                )}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      <BottomSheet visible={!!elegido} onClose={() => estado !== 'enviando' && setElegido(null)}>
        {elegido && estado !== 'ok' && (
          <>
            <Text style={s.sheetTitle}>Confirmar Reserva</Text>
            <Row label="📅  Fecha" value={fechaLarga(fecha)} />
            <Row label="🕒  Horario" value={`${hora(elegido.hora_inicio)} - ${hora(elegido.hora_fin)} hs`} />
            <Row label="👥  Cupos" value={`${libres}/${elegido.cupo_maximo} disponibles`} />
            <Row label="🏋️  Instructor" value={elegido.entrenador || 'Pendiente de asignación'} />
            <Row label="📍  Estado" value="Pendiente de confirmación" last />
            {estado === 'error' && <Text style={[s.err, { backgroundColor: b.danger }]}>{mensaje}</Text>}
            <Button title="Confirmar Reserva" onPress={confirmar} loading={estado === 'enviando'} style={{ marginTop: 18 }} />
            <Button title="Volver" variant="white" onPress={() => setElegido(null)} disabled={estado === 'enviando'} style={{ marginTop: 10 }} />
          </>
        )}
        {elegido && estado === 'ok' && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={56} color={b.success} />
            <Text style={s.sheetTitle}>¡Turno confirmado!</Text>
            <Text style={[s.meta, { textAlign: 'center' }]}>
              {fechaLarga(fecha)} · {hora(elegido.hora_inicio)} hs.{'\n'}
              {user?.notificaciones_activas !== false ? 'Te vamos a avisar antes de la clase.' : 'Tenés los recordatorios desactivados.'}
            </Text>
            <Button title="Ver mis turnos" onPress={() => { setElegido(null); navigation.resetTo('turnos'); }} style={{ alignSelf: 'stretch', marginTop: 10 }} />
            <Button title="Seguir viendo horarios" variant="white" onPress={() => setElegido(null)} style={{ alignSelf: 'stretch' }} />
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hint: { color: b.onBg, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  block: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  blockFocus: { borderWidth: 2, borderColor: b.primary },
  time: { color: b.text, fontWeight: '800', fontSize: 15 },
  meta: { color: b.textSoft, fontSize: 12 },
  reservar: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  reservarText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  reserved: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reservedText: { fontWeight: '700', fontSize: 12 },
  sheetTitle: { color: b.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  err: { color: '#FFF', fontWeight: '600', padding: 10, borderRadius: 8, marginTop: 12, overflow: 'hidden' },
});
