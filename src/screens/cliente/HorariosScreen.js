import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Loading, ErrorBox, Empty, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';
import { MESES, DIA_ENUM, aISO, hoyISO, fechaLarga, hora } from '../../utils/fechas';

const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// 2A · Horarios: selector de fecha (calendario) y bloques disponibles del día.
export const HorariosScreen = ({ navigation, campana }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [seleccion, setSeleccion] = useState(hoy);
  const [diasConClases, setDiasConClases] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    clienteService.diasConClases().then(setDiasConClases).catch(() => setDiasConClases(DIA_ENUM));
  }, []);

  const cargarBloques = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBloques(await clienteService.horariosPorFecha(seleccion));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoading(false);
    }
  }, [seleccion]);
  useEffect(() => { cargarBloques(); }, [cargarBloques]);

  // Celdas del calendario (semana empieza el lunes)
  const celdas = useMemo(() => {
    const primerDia = (mes.getDay() + 6) % 7;
    const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const lista = Array(primerDia).fill(null);
    for (let d = 1; d <= diasMes; d += 1) lista.push(new Date(mes.getFullYear(), mes.getMonth(), d, 12));
    return lista;
  }, [mes]);

  const esMesActual = mes.getFullYear() === new Date().getFullYear() && mes.getMonth() === new Date().getMonth();

  return (
    <Screen title="Horarios" right={campana}>
      <Card style={{ paddingBottom: 8 }}>
        <View style={s.monthRow}>
          <TouchableOpacity disabled={esMesActual} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            style={{ opacity: esMesActual ? 0.3 : 1, padding: 6 }} accessibilityLabel="Mes anterior">
            <Ionicons name="chevron-back" size={18} color={b.text} />
          </TouchableOpacity>
          <Text style={s.month}>{MESES[mes.getMonth()]} {mes.getFullYear()}</Text>
          <TouchableOpacity onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={{ padding: 6 }} accessibilityLabel="Mes siguiente">
            <Ionicons name="chevron-forward" size={18} color={b.text} />
          </TouchableOpacity>
        </View>
        <View style={s.grid}>
          {CABECERA.map((c, i) => <Text key={`h${i}`} style={s.weekday}>{c}</Text>)}
          {celdas.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={s.cell} />;
            const iso = aISO(d);
            const pasado = iso < hoy;
            const tieneClases = diasConClases.includes(DIA_ENUM[d.getDay()]);
            const habilitado = !pasado && tieneClases;
            const sel = iso === seleccion;
            return (
              <View key={iso} style={s.cell}>
                <TouchableOpacity
                  disabled={!habilitado}
                  onPress={() => setSeleccion(iso)}
                  style={[s.day, iso === hoy && s.dayToday, sel && s.daySel, !habilitado && { opacity: 0.35 }]}
                  accessibilityLabel={`${fechaLarga(iso)}${habilitado ? '' : ', sin clases'}`}
                  accessibilityState={{ selected: sel, disabled: !habilitado }}
                >
                  <Text style={[s.dayText, sel && { color: '#FFF', fontWeight: '800' }]}>{d.getDate()}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={s.selected}>
        <Text style={s.selectedText}>Seleccionado: {fechaLarga(seleccion)}</Text>
      </View>

      <SectionTitle>Bloques disponibles</SectionTitle>
      {loading && <Loading />}
      {!loading && error && <ErrorBox message={error} onRetry={cargarBloques} />}
      {!loading && !error && bloques.length === 0 && (
        <Empty icon="calendar-clear-outline" text="No hay clases disponibles para este día. Probá con otra fecha." />
      )}
      {!loading && !error && bloques.map((h) => {
        const lleno = h.cupo_actual >= h.cupo_maximo;
        return (
          <Card key={h.id} style={s.block}>
            <View style={{ flex: 1 }}>
              <Text style={s.blockTime}>{hora(h.hora_inicio)} – {hora(h.hora_fin)}</Text>
              <Text style={s.blockMeta}>
                {h.ya_reservado ? 'Ya reservaste este turno' : lleno ? 'Completo' : `${h.cupo_maximo - h.cupo_actual} lugares libres`}
              </Text>
            </View>
            <Button title="Ver" small onPress={() => navigation.navigate('Bloques', { fecha: seleccion, horarioId: h.id })} />
          </Card>
        );
      })}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  month: { color: b.text, fontWeight: '800', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: b.textSoft, fontWeight: '700', fontSize: 12, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  day: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: b.cardSoft,
  },
  dayToday: { borderWidth: 2, borderColor: b.text },
  daySel: { backgroundColor: b.primary, borderWidth: 0 },
  dayText: { color: b.text, fontSize: 13, fontWeight: '600' },
  selected: { backgroundColor: b.cardSoft, borderRadius: 999, paddingVertical: 9, alignItems: 'center', marginBottom: 6 },
  selectedText: { color: b.text, fontSize: 13, fontWeight: '600' },
  block: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  blockTime: { color: b.text, fontWeight: '800', fontSize: 15 },
  blockMeta: { color: b.textSoft, fontSize: 12, marginTop: 2 },
});
