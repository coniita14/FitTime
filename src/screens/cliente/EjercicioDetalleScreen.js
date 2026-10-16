import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, SectionTitle, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar } from '../../utils/dialogos';

// 3B · Detalle del ejercicio: video, series/reps/descanso, descripción,
// músculos involucrados, consejos del entrenador y "Marcar como completado".
export const EjercicioDetalleScreen = ({ navigation, route }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { detalle } = route.params;
  const ej = detalle.ejercicios || {};
  const [hecho, setHecho] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    clienteService.completadosHoy().then((ids) => setHecho(ids.includes(detalle.id))).catch(() => {});
  }, [detalle.id]);

  const alternar = async () => {
    setGuardando(true);
    try {
      await clienteService.marcarCompletado(detalle.id, !hecho);
      setHecho(!hecho);
      if (!hecho) navigation.goBack();
    } catch (e) {
      avisar('No se pudo guardar', mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const verVideo = () => {
    if (ej.video_url) Linking.openURL(ej.video_url).catch(() => avisar('No se pudo abrir el video', 'Revisá tu conexión.'));
    else Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${ej.nombre} técnica ejercicio`)}`).catch(() => {});
  };

  const descanso = detalle.descanso_segundos ?? 60;

  return (
    <Screen title={ej.nombre || 'Ejercicio'} onBack={navigation.goBack} contentStyle={{ paddingTop: 0 }}>
      <TouchableOpacity onPress={verVideo} style={s.video} accessibilityRole="button"
        accessibilityLabel={ej.video_url ? 'Ver video del ejercicio' : 'Buscar video del ejercicio'}>
        <View style={s.play}><Ionicons name="play" size={30} color={b.card} /></View>
        <Text style={s.videoText}>{ej.video_url ? 'Ver video del ejercicio' : '[ Video / Animación ] · Buscar ejemplo'}</Text>
      </TouchableOpacity>

      <View style={s.tiles}>
        {[[detalle.series, 'Series'], [detalle.repeticiones, 'Reps'], [`${descanso}s`, 'Descanso']].map(([v, l]) => (
          <View key={l} style={s.tile}>
            <Text style={s.tileValue}>{v}</Text>
            <Text style={s.tileLabel}>{l}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>Descripción</SectionTitle>
      <Card><Text style={s.body}>{ej.descripcion || 'Sin descripción cargada.'}</Text></Card>

      <SectionTitle>Músculos involucrados</SectionTitle>
      <View style={s.muscles}>
        {(ej.musculos?.length ? ej.musculos : [ej.grupo_muscular].filter(Boolean)).map((m) => (
          <View key={m} style={s.muscle}><View style={s.dot} /><Text style={s.muscleText}>{m}</Text></View>
        ))}
      </View>

      <SectionTitle>Consejos del entrenador</SectionTitle>
      <Card style={{ flexDirection: 'row', gap: 8 }}>
        <Ionicons name="warning" size={16} color={b.warning} style={{ marginTop: 2 }} />
        <Text style={[s.body, { flex: 1 }]}>{ej.consejos || 'Mantené una técnica controlada y consultá a tu entrenador ante cualquier duda.'}</Text>
      </Card>

      <Button
        title={hecho ? 'Completado ✓  (tocar para desmarcar)' : 'Marcar como completado'}
        variant={hecho ? 'white' : 'primary'}
        onPress={alternar}
        loading={guardando}
        style={{ marginTop: 6 }}
      />
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  video: {
    backgroundColor: b.cardSoft, marginHorizontal: -16, height: 200, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16,
  },
  play: { width: 64, height: 64, borderRadius: 32, backgroundColor: b.textMuted, alignItems: 'center', justifyContent: 'center' },
  videoText: { color: b.textSoft, fontSize: 12 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  tile: { flex: 1, backgroundColor: b.card, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  tileValue: { color: b.text, fontSize: 24, fontWeight: '900' },
  tileLabel: { color: b.textSoft, fontSize: 12 },
  body: { color: b.text, fontSize: 14, lineHeight: 20 },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  muscle: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: b.onBg },
  muscleText: { color: b.onBg, fontSize: 14 },
});
