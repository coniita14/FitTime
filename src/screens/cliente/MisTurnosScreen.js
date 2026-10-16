import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen, Card, UnderlineTabs, Pill, Loading, ErrorBox, Empty, Button, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';
import { fechaMini, hora, yaPaso } from '../../utils/fechas';

export const ESTADO_PILL = {
  CONFIRMADO: { text: 'Confirmado', tone: 'primary' },
  CANCELADO: { text: 'Cancelado', tone: 'danger' },
  COMPLETADO: { text: 'Asistió', tone: 'success' },
  AUSENTE: { text: 'Ausente', tone: 'warning' },
};

// 2D · Mis Turnos: pestañas Próximos / Historial.
export const MisTurnosScreen = ({ navigation, campana }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const [vista, setVista] = useState('proximos');
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTurnos(await clienteService.misTurnos());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar tus turnos.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const { proximos, historial } = useMemo(() => {
    const p = [];
    const h = [];
    turnos.forEach((t) => {
      if (t.estado === 'CONFIRMADO' && !yaPaso(t.fecha_turno, t.horarios?.hora_inicio)) p.push(t);
      else h.push(t);
    });
    p.sort((a, c) => (a.fecha_turno + a.horarios?.hora_inicio).localeCompare(c.fecha_turno + c.horarios?.hora_inicio));
    return { proximos: p, historial: h };
  }, [turnos]);

  const lista = vista === 'proximos' ? proximos : historial;

  return (
    <Screen title="Mis Turnos" right={campana}>
      <UnderlineTabs
        tabs={[['proximos', `Próximos${proximos.length ? ` (${proximos.length})` : ''}`], ['historial', 'Historial']]}
        value={vista}
        onChange={setVista}
      />
      {loading && <Loading />}
      {!loading && error && <ErrorBox message={error} onRetry={cargar} />}
      {!loading && !error && lista.length === 0 && (
        <Empty
          icon={vista === 'proximos' ? 'calendar-outline' : 'time-outline'}
          text={vista === 'proximos' ? 'No tenés turnos reservados.' : 'Todavía no tenés turnos anteriores.'}
          action={vista === 'proximos' ? <Button title="Reservar un turno" small onPress={() => navigation.resetTo('horarios')} /> : null}
        />
      )}
      {!loading && !error && lista.map((t) => {
        const pill = ESTADO_PILL[t.estado] || ESTADO_PILL.CONFIRMADO;
        const vencido = t.estado === 'CONFIRMADO' && vista === 'historial';
        return (
          <Card key={t.id} onPress={() => navigation.navigate('TurnoDetalle', { turno: t })} style={s.card}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.date}>{fechaMini(t.fecha_turno)}</Text>
              <Text style={s.time}>{hora(t.horarios?.hora_inicio)} – {hora(t.horarios?.hora_fin)}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TurnoDetalle', { turno: t })} style={s.detailBtn}>
                <Text style={s.detailText}>Ver detalle</Text>
              </TouchableOpacity>
            </View>
            <Pill text={vencido ? 'Finalizado' : pill.text} tone={vencido ? 'neutral' : pill.tone} />
          </Card>
        );
      })}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 4, borderLeftColor: b.primary },
  date: { color: b.text, fontWeight: '800', fontSize: 15 },
  time: { color: b.textSoft, fontSize: 13 },
  detailBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: b.cardSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  detailText: { color: b.textSoft, fontSize: 11, fontWeight: '700' },
});
