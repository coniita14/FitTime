import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { ScreenHeader, LoadingState, ErrorState, Card, EmptyState, Badge } from '../../components/admin/AdminUI';

// Inicio del entrenador: sus clases de hoy, reservas y accesos rápidos.
export const DashboardEntrenador = ({ onNavigate }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = createStyles(theme);
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDatos(await adminService.resumenEntrenador());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar tu resumen.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <LoadingState text="Cargando tu resumen…" />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  const kpis = [
    { label: 'Clases por semana', value: datos.clases_semana, icon: 'time' },
    { label: 'Reservas próximos 7 días', value: datos.reservas_7_dias, icon: 'calendar' },
    { label: 'Alumnos con tu rutina', value: datos.alumnos_con_rutina, icon: 'people' },
    { label: 'Rutinas que creaste', value: datos.rutinas_creadas, icon: 'barbell' },
  ];
  const accesos = [
    { key: 'turnos', label: 'Ver mis clases', icon: 'calendar-outline' },
    { key: 'usuarios', label: 'Asignar rutina a un alumno', icon: 'person-add-outline' },
    { key: 'rutinas', label: 'Crear una rutina', icon: 'barbell-outline' },
    { key: 'ejercicios', label: 'Cargar consejos de ejercicios', icon: 'bulb-outline' },
  ];

  return (
    <View>
      <ScreenHeader title={`Hola, ${user?.nombre || 'profe'}`} subtitle="Tu resumen como entrenador/a" actionLabel="Actualizar" actionIcon="refresh" onAction={cargar} />

      <View style={s.kpiGrid}>
        {kpis.map((k) => (
          <Card key={k.label} style={s.kpi}>
            <Ionicons name={k.icon} size={20} color={theme.colors.primary} />
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={s.cardTitle}>Tus clases de hoy</Text>
        {datos.clases_hoy.length === 0 ? (
          <EmptyState icon="cafe-outline" text={datos.clases_semana ? 'Hoy no tenés clases asignadas.' : 'Todavía no tenés clases asignadas. El administrador te asigna horarios desde "Entrenadores".'} />
        ) : datos.clases_hoy.map((c) => {
          const lleno = c.reservas >= c.cupo_maximo;
          return (
            <View key={c.id} style={s.classRow}>
              <Text style={s.classTime}>{c.hora_inicio} – {c.hora_fin}</Text>
              <View style={s.track}><View style={[s.fill, { width: `${(c.reservas / c.cupo_maximo) * 100}%`, backgroundColor: lleno ? theme.colors.danger : theme.colors.primary }]} /></View>
              <Badge text={`${c.reservas}/${c.cupo_maximo}`} tone={lleno ? 'danger' : 'primary'} />
            </View>
          );
        })}
      </Card>

      <Text style={s.sectionTitle}>Accesos rápidos</Text>
      <View style={s.quickGrid}>
        {accesos.map((a) => (
          <TouchableOpacity key={a.key} style={s.quick} onPress={() => onNavigate(a.key)}>
            <Ionicons name={a.icon} size={22} color={theme.colors.primary} />
            <Text style={s.quickText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  kpi: { flexGrow: 1, flexBasis: 150, marginBottom: 0, gap: 2 },
  kpiValue: { fontSize: 30, fontWeight: '900', color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  kpiLabel: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  cardTitle: { color: theme.colors.textPrimary, fontWeight: '700', marginBottom: theme.spacing.md },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  classTime: { width: 110, color: theme.colors.textPrimary, fontWeight: '700' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.inputBackground, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.sizes.md, marginVertical: theme.spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  quick: {
    flexGrow: 1, flexBasis: 200, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  quickText: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: theme.typography.sizes.sm },
});
