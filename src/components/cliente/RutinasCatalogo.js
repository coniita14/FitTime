import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, CATEGORIAS, CATEGORIA_LABEL, NIVEL_LABEL } from '../../utils/dialogos';

const ICONO_CATEGORIA = {
  FUERZA: 'barbell', CARDIO: 'heart', TREN_SUPERIOR: 'body', TREN_INFERIOR: 'walk',
  CUERPO_COMPLETO: 'fitness', MOVILIDAD: 'leaf',
};

// Catálogo de rutinas del gimnasio, filtrable por categoría, con rutinas guardadas (⭐).
export const RutinasCatalogo = ({ soloGuardadas = false }) => {
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [rutinas, setRutinas] = useState([]);
  const [favoritas, setFavoritas] = useState([]);
  const [categoria, setCategoria] = useState('TODAS');
  const [abierta, setAbierta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, f] = await Promise.all([clienteService.listarRutinas(), clienteService.listarFavoritas()]);
      setRutinas(r);
      setFavoritas(f);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las rutinas.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const alternarFavorita = async (rutinaId) => {
    const esFavorita = favoritas.includes(rutinaId);
    setGuardando(rutinaId);
    try {
      if (esFavorita) await clienteService.quitarFavorita(rutinaId);
      else await clienteService.guardarFavorita(rutinaId);
      setFavoritas((prev) => (esFavorita ? prev.filter((id) => id !== rutinaId) : [...prev, rutinaId]));
    } catch (e) {
      avisar('No se pudo guardar', mensajeDeError(e));
    } finally {
      setGuardando(null);
    }
  };

  if (loading) return <ActivityIndicator color={theme.colors.primaryLight} style={{ marginTop: 32 }} />;
  if (error) {
    return (
      <View style={s.empty}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.danger} />
        <Text style={s.emptyText}>{error}</Text>
        <TouchableOpacity onPress={cargar} style={s.retry}><Text style={s.retryText}>Reintentar</Text></TouchableOpacity>
      </View>
    );
  }

  const visibles = rutinas
    .filter((r) => !soloGuardadas || favoritas.includes(r.id))
    .filter((r) => categoria === 'TODAS' || r.categoria === categoria);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {['TODAS', ...CATEGORIAS].map((c) => {
          const activa = c === categoria;
          return (
            <TouchableOpacity key={c} onPress={() => setCategoria(c)} style={[s.chip, activa && s.chipActive]}>
              <Text style={[s.chipText, activa && s.chipTextActive]}>{c === 'TODAS' ? 'Todas' : CATEGORIA_LABEL[c]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {visibles.length === 0 && (
        <View style={s.empty}>
          <Ionicons name={soloGuardadas ? 'star-outline' : 'barbell-outline'} size={36} color={theme.colors.textMuted} />
          <Text style={s.emptyText}>
            {soloGuardadas ? 'Todavía no guardaste rutinas. Tocá la ⭐ en el catálogo para guardarlas.' : 'No hay rutinas en esta categoría.'}
          </Text>
        </View>
      )}

      {visibles.map((r) => {
        const expandida = abierta === r.id;
        const esFavorita = favoritas.includes(r.id);
        const ejercicios = [...(r.rutina_detalle || [])].sort((a, b) => a.orden - b.orden);
        return (
          <View key={r.id} style={s.card}>
            <TouchableOpacity style={s.head} onPress={() => setAbierta(expandida ? null : r.id)} accessibilityRole="button">
              <View style={s.icon}>
                <Ionicons name={ICONO_CATEGORIA[r.categoria] || 'barbell'} size={22} color={theme.colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.nombre}</Text>
                <Text style={s.meta}>
                  {CATEGORIA_LABEL[r.categoria]} · {NIVEL_LABEL[r.nivel]}{r.duracion_minutos ? ` · ${r.duracion_minutos} min` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => alternarFavorita(r.id)}
                disabled={guardando === r.id}
                accessibilityLabel={esFavorita ? 'Quitar de guardadas' : 'Guardar rutina'}
                style={{ padding: 6 }}
              >
                <Ionicons name={esFavorita ? 'star' : 'star-outline'} size={24} color={esFavorita ? theme.colors.warning : theme.colors.textMuted} />
              </TouchableOpacity>
              <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {expandida && (
              <View style={s.detail}>
                <Text style={s.objective}>{r.objetivo}</Text>
                {r.descripcion ? <Text style={s.meta}>{r.descripcion}</Text> : null}
                {ejercicios.length === 0 && <Text style={s.meta}>Esta rutina todavía no tiene ejercicios.</Text>}
                {ejercicios.map((d, i) => (
                  <View key={d.id} style={s.exRow}>
                    <Text style={s.exNum}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exName}>{d.ejercicios?.nombre}</Text>
                      <Text style={s.meta}>{d.ejercicios?.grupo_muscular}</Text>
                      {d.ejercicios?.descripcion ? <Text style={s.tip}>{d.ejercicios.descripcion}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.sets}>{d.series} × {d.repeticiones}</Text>
                      <Text style={s.meta}>{d.descanso_segundos}s</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: theme.colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border,
    padding: 14, marginBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: `${theme.colors.primary}26`,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 },
  meta: { color: theme.colors.textSecondary, fontSize: 13 },
  objective: { color: theme.colors.textPrimary, fontWeight: '600', marginBottom: 4 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 4 },
  exRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  exNum: {
    width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, overflow: 'hidden',
    backgroundColor: `${theme.colors.primary}33`, color: theme.colors.primaryLight, fontWeight: '800', fontSize: 12,
  },
  exName: { color: theme.colors.textPrimary, fontWeight: '600' },
  tip: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  sets: { color: theme.colors.primaryLight, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center' },
  retry: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  retryText: { color: theme.colors.primaryLight, fontWeight: '600' },
});
