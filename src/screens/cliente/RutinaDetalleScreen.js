import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, ProgressBar, Loading, ErrorBox, Empty, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { avisar, CATEGORIA_LABEL, NIVEL_LABEL } from '../../utils/dialogos';

// 3A · Detalle de rutina: progreso del día, lista de ejercicios (con check) y ⭐ guardar.
export const RutinaDetalleScreen = ({ navigation, route }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { user } = useAuth();
  const { rutinaId } = route.params;
  const [rutina, setRutina] = useState(null);
  const [hechos, setHechos] = useState([]);
  const [favorita, setFavorita] = useState(false);
  const [asignacion, setAsignacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c, f, a] = await Promise.all([
        clienteService.rutina(rutinaId), clienteService.completadosHoy(), clienteService.listarFavoritas(),
        clienteService.miRutinaAsignada(user.id),
      ]);
      setRutina(r);
      setHechos(c);
      setFavorita(f.includes(rutinaId));
      setAsignacion(a?.rutina_id === rutinaId ? a : null);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar la rutina.'));
    } finally {
      setLoading(false);
    }
  }, [rutinaId, user.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const ejercicios = useMemo(() => [...(rutina?.rutina_detalle || [])].sort((a, c) => a.orden - c.orden), [rutina]);
  const completados = ejercicios.filter((e) => hechos.includes(e.id)).length;

  const alternar = async (detalleId) => {
    const hecho = hechos.includes(detalleId);
    setHechos((prev) => (hecho ? prev.filter((x) => x !== detalleId) : [...prev, detalleId]));
    try {
      await clienteService.marcarCompletado(detalleId, !hecho);
    } catch (e) {
      setHechos((prev) => (hecho ? [...prev, detalleId] : prev.filter((x) => x !== detalleId)));
      avisar('No se pudo guardar', mensajeDeError(e));
    }
  };

  const alternarFavorita = async () => {
    const era = favorita;
    setFavorita(!era);
    try {
      if (era) await clienteService.quitarFavorita(rutinaId);
      else await clienteService.guardarFavorita(rutinaId);
    } catch (e) {
      setFavorita(era);
      avisar('No se pudo guardar', mensajeDeError(e));
    }
  };

  const estrella = (
    <TouchableOpacity onPress={alternarFavorita} accessibilityLabel={favorita ? 'Quitar de guardadas' : 'Guardar rutina'} style={{ padding: 4 }}>
      <Ionicons name={favorita ? 'star' : 'star-outline'} size={24} color={favorita ? b.warning : b.textSoft} />
    </TouchableOpacity>
  );

  return (
    <Screen title={rutina?.nombre || 'Rutina'} onBack={navigation.goBack} right={rutina ? estrella : null} contentStyle={{ paddingTop: 0 }}>
      {loading && <Loading />}
      {!loading && error && <View style={{ paddingTop: 16 }}><ErrorBox message={error} onRetry={cargar} /></View>}
      {!loading && !error && rutina && (
        <>
          <View style={s.top}>
            <Text style={s.title}>{rutina.nombre}</Text>
            <Text style={s.meta}>
              {NIVEL_LABEL[rutina.nivel]}  •  {CATEGORIA_LABEL[rutina.categoria]}  •  {ejercicios.length} ejercicios
              {rutina.duracion_minutos ? `  •  ${rutina.duracion_minutos} min` : ''}
            </Text>
            <ProgressBar value={ejercicios.length ? (completados / ejercicios.length) * 100 : 0} style={{ marginTop: 12 }} />
            <Text style={s.progress}>{completados}/{ejercicios.length} completados hoy</Text>
            {asignacion?.observaciones ? (
              <View style={s.note}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={b.primary} />
                <Text style={s.noteText}>Tu entrenador: “{asignacion.observaciones}”</Text>
              </View>
            ) : null}
          </View>

          {ejercicios.length === 0 && <Empty icon="barbell-outline" text="Esta rutina todavía no tiene ejercicios." />}
          {ejercicios.map((d, i) => {
            const hecho = hechos.includes(d.id);
            return (
              <Card key={d.id} muted={hecho} style={s.item}
                onPress={() => navigation.navigate('EjercicioDetalle', { detalle: d, rutinaNombre: rutina.nombre })}>
                <TouchableOpacity onPress={() => alternar(d.id)} accessibilityRole="checkbox" accessibilityState={{ checked: hecho }}
                  accessibilityLabel={`${hecho ? 'Desmarcar' : 'Marcar'} ${d.ejercicios?.nombre} como completado`}
                  style={[s.circle, hecho && { backgroundColor: b.check }]}>
                  {hecho ? <Ionicons name="checkmark" size={18} color="#FFF" /> : <Text style={s.num}>{i + 1}</Text>}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, hecho && { fontWeight: '500', color: b.textSoft }]}>{d.ejercicios?.nombre}</Text>
                  <Text style={s.sets}>{d.series} series × {d.repeticiones} reps</Text>
                </View>
                <View style={s.chev}><Ionicons name="chevron-forward" size={16} color={b.textSoft} /></View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  top: { backgroundColor: b.card, marginHorizontal: -16, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 16 },
  title: { color: b.text, fontSize: 22, fontWeight: '800' },
  meta: { color: b.textSoft, fontSize: 13, marginTop: 4 },
  progress: { color: b.textSoft, fontSize: 12, marginTop: 6 },
  note: { flexDirection: 'row', gap: 8, backgroundColor: b.cardSoft, borderRadius: 10, padding: 10, marginTop: 12 },
  noteText: { color: b.text, fontSize: 13, flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
  num: { color: b.text, fontWeight: '800' },
  name: { color: b.text, fontWeight: '800', fontSize: 15 },
  sets: { color: b.textSoft, fontSize: 12 },
  chev: { width: 28, height: 28, borderRadius: 6, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
});
