import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Chip, Pill, Loading, ErrorBox, Empty, SectionTitle, useBrand } from '../../components/cliente/ui';
import { clienteService } from '../../api/cliente.service';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../utils/errores';
import { CATEGORIAS, CATEGORIA_LABEL, NIVELES, NIVEL_LABEL } from '../../utils/dialogos';

export const ICONO_CATEGORIA = {
  FUERZA: 'barbell', CARDIO: 'heart', MOVILIDAD: 'leaf', PERDIDA_PESO: 'flame',
  TREN_SUPERIOR: 'body', TREN_INFERIOR: 'walk', CUERPO_COMPLETO: 'fitness',
};

// 2F · Rutinas: buscador, filtros por Nivel y Objetivo, rutina asignada por el
// entrenador y catálogo del gimnasio.
export const RutinasScreen = ({ navigation, campana }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { user } = useAuth();
  const [rutinas, setRutinas] = useState([]);
  const [favoritas, setFavoritas] = useState([]);
  const [asignada, setAsignada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [nivel, setNivel] = useState('TODOS');
  const [objetivo, setObjetivo] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, f, a] = await Promise.all([
        clienteService.catalogo(), clienteService.listarFavoritas(), clienteService.miRutinaAsignada(user.id),
      ]);
      setRutinas(r);
      setFavoritas(f);
      setAsignada(a);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las rutinas.'));
    } finally {
      setLoading(false);
    }
  }, [user.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const q = busqueda.trim().toLowerCase();
  const visibles = rutinas
    .filter((r) => nivel === 'TODOS' || r.nivel === nivel)
    .filter((r) => objetivo === 'TODOS' || (objetivo === 'GUARDADAS' ? favoritas.includes(r.id) : r.categoria === objetivo))
    .filter((r) => !q || `${r.nombre} ${r.objetivo} ${CATEGORIA_LABEL[r.categoria]}`.toLowerCase().includes(q));

  const asignador = asignada?.asignador
    ? `${asignada.asignador.nombre}${asignada.asignador.apellido && asignada.asignador.apellido !== '-' ? ` ${asignada.asignador.apellido}` : ''}`
    : null;

  return (
    <Screen title="Rutinas" right={campana}>
      <View style={s.search}>
        <Ionicons name="search" size={18} color={b.textMuted} />
        <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar rutina..." placeholderTextColor={b.textMuted}
          style={s.searchInput} accessibilityLabel="Buscar rutina" />
      </View>

      <Text style={s.filterLabel}>Nivel</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['TODOS', ...NIVELES].map((n) => (
          <Chip key={n} label={n === 'TODOS' ? 'Todos' : NIVEL_LABEL[n]} active={nivel === n} onPress={() => setNivel(n)} />
        ))}
      </ScrollView>
      <Text style={s.filterLabel}>Objetivo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {['TODOS', 'GUARDADAS', ...CATEGORIAS].map((c) => (
          <Chip key={c} icon={c === 'GUARDADAS' ? 'star' : undefined}
            label={c === 'TODOS' ? 'Todos' : c === 'GUARDADAS' ? 'Guardadas' : CATEGORIA_LABEL[c]}
            active={objetivo === c} onPress={() => setObjetivo(c)} />
        ))}
      </ScrollView>

      {loading && <Loading />}
      {!loading && error && <ErrorBox message={error} onRetry={cargar} />}

      {!loading && !error && asignada?.rutinas && (
        <>
          <SectionTitle>Tu rutina</SectionTitle>
          <Card onPress={() => navigation.navigate('RutinaDetalle', { rutinaId: asignada.rutinas.id })} style={s.assigned}>
            <View style={[s.thumb, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name={ICONO_CATEGORIA[asignada.rutinas.categoria] || 'barbell'} size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, { color: '#FFF' }]}>{asignada.rutinas.nombre}</Text>
              <Text style={[s.sub, { color: '#E0E7FF' }]}>
                {asignador ? `Asignada por ${asignador}` : 'Asignada por tu entrenador'} · {NIVEL_LABEL[asignada.rutinas.nivel]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </Card>
        </>
      )}

      {!loading && !error && (
        <>
          <SectionTitle>Catálogo</SectionTitle>
          {visibles.length === 0 && (
            <Empty icon={objetivo === 'GUARDADAS' ? 'star-outline' : 'search'}
              text={objetivo === 'GUARDADAS' ? 'Todavía no guardaste rutinas. Abrí una y tocá la ⭐.' : 'No encontramos rutinas con esos filtros.'} />
          )}
          {visibles.map((r) => (
            <Card key={r.id} onPress={() => navigation.navigate('RutinaDetalle', { rutinaId: r.id })} style={s.item}>
              <View style={s.thumb}>
                <Ionicons name={ICONO_CATEGORIA[r.categoria] || 'barbell'} size={24} color={b.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name}>{r.nombre}</Text>
                  {favoritas.includes(r.id) && <Ionicons name="star" size={14} color={b.warning} />}
                </View>
                <Text style={s.sub}>{r.objetivo}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Pill text={NIVEL_LABEL[r.nivel]} tone="neutral" small />
                  <Text style={s.count}>{r.rutina_detalle?.[0]?.count ?? 0} ejercicios</Text>
                </View>
              </View>
              <View style={s.chev}><Ionicons name="chevron-forward" size={16} color={b.textSoft} /></View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: b.card, borderRadius: 999,
    paddingHorizontal: 14, minHeight: 44, marginBottom: 6,
  },
  searchInput: { flex: 1, color: b.text, fontSize: 14, paddingVertical: 8, ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }) },
  filterLabel: { color: b.onBgSoft, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  assigned: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: b.primary },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
  name: { color: b.text, fontWeight: '800', fontSize: 15 },
  sub: { color: b.textSoft, fontSize: 12 },
  count: { color: b.textMuted, fontSize: 11 },
  chev: { width: 28, height: 28, borderRadius: 6, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
});
