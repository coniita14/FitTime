import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { DIA_LABEL, CATEGORIA_LABEL } from '../../utils/dialogos';
import { CustomButton } from '../../components/CustomButton';
import { ScreenHeader, LoadingState, ErrorState, Card, EmptyState } from '../../components/admin/AdminUI';

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const DashboardAdmin = ({ onNavigate }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = createStyles(theme);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await adminService.estadisticas());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las estadísticas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <LoadingState text="Cargando estadísticas…" />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  const kpis = [
    { label: 'Clientes activos', value: stats.clientes_activos, icon: 'people', hint: `+${stats.clientes_nuevos_mes} este mes` },
    { label: 'Turnos hoy', value: stats.turnos_hoy, icon: 'today' },
    { label: 'Próximos 7 días', value: stats.turnos_proximos_7_dias, icon: 'calendar' },
    { label: 'Cancelaciones del mes', value: stats.cancelaciones_mes, icon: 'close-circle' },
  ];
  const porDia = stats.turnos_por_dia || [];
  const maxDia = Math.max(1, ...porDia.map((d) => d.turnos));
  const accesos = [
    { key: 'turnos', label: 'Ver turnos de hoy', icon: 'calendar-outline' },
    { key: 'horarios', label: 'Nuevo horario', icon: 'time-outline' },
    { key: 'rutinas', label: 'Nueva rutina', icon: 'barbell-outline' },
    { key: 'usuarios', label: 'Nuevo usuario', icon: 'person-add-outline' },
    { key: 'entrenadores', label: 'Entrenadores', icon: 'medal-outline' },
    { key: 'reportes', label: 'Reportes', icon: 'document-text-outline' },
  ];

  return (
    <View>
      <ScreenHeader
        title={`Hola, ${user?.nombre || 'admin'} 👋`}
        subtitle="Resumen general del gimnasio"
        actionLabel="Actualizar"
        actionIcon="refresh"
        onAction={cargar}
      />

      <View style={s.kpiGrid}>
        {kpis.map((k) => (
          <Card key={k.label} style={s.kpi}>
            <Ionicons name={k.icon} size={20} color={theme.colors.primary} />
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
            {k.hint ? <Text style={s.kpiHint}>{k.hint}</Text> : null}
          </Card>
        ))}
      </View>

      <Text style={s.sectionTitle}>Accesos rápidos</Text>
      <View style={s.quickGrid}>
        {accesos.map((a) => (
          <TouchableOpacity key={a.key} style={s.quick} onPress={() => onNavigate(a.key)}>
            <Ionicons name={a.icon} size={22} color={theme.colors.primary} />
            <Text style={s.quickText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.twoCols}>
        <Card style={s.col}>
          <Text style={s.cardTitle}>Turnos reservados · próximos 7 días</Text>
          <View style={s.bars}>
            {porDia.map((d) => {
              const fecha = new Date(`${d.fecha}T12:00:00`);
              return (
                <View key={d.fecha} style={s.barCol}>
                  <Text style={s.barValue}>{d.turnos}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: `${(d.turnos / maxDia) * 100}%` }]} />
                  </View>
                  <Text style={s.barLabel}>{DIAS_CORTOS[fecha.getDay()]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={s.col}>
          <Text style={s.cardTitle}>Horarios más concurridos</Text>
          {stats.horarios_mas_concurridos?.length ? stats.horarios_mas_concurridos.map((h) => (
            <View key={`${h.id}-${h.fecha_turno}`} style={s.occRow}>
              <Text style={s.occLabel}>{DIA_LABEL[h.dia]} {h.hora_inicio}</Text>
              <View style={s.occTrack}>
                <View style={[s.occFill, {
                  width: `${h.ocupacion_pct}%`,
                  backgroundColor: h.ocupacion_pct >= 90 ? theme.colors.danger : h.ocupacion_pct >= 60 ? theme.colors.warning : theme.colors.success,
                }]} />
              </View>
              <Text style={s.occPct}>{h.cupo_actual}/{h.cupo_maximo}</Text>
            </View>
          )) : <EmptyState icon="pulse-outline" text="Todavía no hay reservas esta semana." />}
        </Card>
      </View>

      <View style={s.twoCols}>
        <Card style={s.col}>
          <Text style={s.cardTitle}>Rutinas más usadas</Text>
          {stats.rutinas_mas_usadas?.length ? stats.rutinas_mas_usadas.map((r, i) => (
            <View key={r.id} style={s.rankRow}>
              <Text style={s.rankNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rankName}>{r.nombre}</Text>
                <Text style={s.kpiLabel}>{CATEGORIA_LABEL[r.categoria] || r.categoria} · {r.asignada} asignadas · {r.guardada} guardadas</Text>
              </View>
            </View>
          )) : <EmptyState icon="barbell-outline" text="Todavía no hay rutinas asignadas ni guardadas." />}
        </Card>

        <Card style={s.col}>
          <Text style={s.cardTitle}>Este mes</Text>
          {[
            ['checkmark-circle-outline', `${stats.asistencias_mes} asistencias registradas`],
            ['close-circle-outline', `${stats.cancelaciones_mes} cancelaciones`],
            ['medal-outline', `${stats.entrenadores} entrenadores en el equipo`],
            ['person-add-outline', `${stats.clientes_nuevos_mes} clientes nuevos`],
          ].map(([icon, txt]) => (
            <View key={icon} style={s.monthRow}>
              <Ionicons name={icon} size={18} color={theme.colors.primary} />
              <Text style={s.rankName}>{txt}</Text>
            </View>
          ))}
          <CustomButton title="Ver reportes y exportar" iconName="document-text-outline" variant="outline" size="sm"
            onPress={() => onNavigate('reportes')} style={{ marginTop: 8 }} />
        </Card>
      </View>

      <Card>
        <Text style={s.cardTitle}>Catálogo</Text>
        <Text style={s.kpiLabel}>
          {stats.horarios_activos} horarios activos · {stats.rutinas_activas} rutinas activas
        </Text>
        <View style={s.catRow}>
          {Object.entries(stats.rutinas_por_categoria || {}).map(([cat, n]) => (
            <Text key={cat} style={s.catChip}>{CATEGORIA_LABEL[cat] || cat}: {n}</Text>
          ))}
        </View>
      </Card>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  kpi: { flexGrow: 1, flexBasis: 150, marginBottom: 0, gap: 2 },
  kpiValue: { fontSize: 32, fontWeight: '900', color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  kpiLabel: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  kpiHint: { color: theme.colors.success, fontSize: theme.typography.sizes.xs, fontWeight: '600' },
  sectionTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.sizes.md, marginVertical: theme.spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  quick: {
    flexGrow: 1, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  quickText: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: theme.typography.sizes.sm },
  twoCols: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  col: { flexGrow: 1, flexBasis: 320 },
  cardTitle: { color: theme.colors.textPrimary, fontWeight: '700', marginBottom: theme.spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barValue: { color: theme.colors.textSecondary, fontSize: 11, marginBottom: 2 },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  barFill: { backgroundColor: theme.colors.primary, borderRadius: 4, minHeight: 2 },
  barLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  occRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  occLabel: { width: 110, color: theme.colors.textPrimary, fontSize: theme.typography.sizes.sm },
  occTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.inputBackground, overflow: 'hidden' },
  occFill: { height: '100%', borderRadius: 4 },
  occPct: { width: 44, textAlign: 'right', color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 6 },
  rankNum: {
    width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, overflow: 'hidden',
    backgroundColor: `${theme.colors.primary}22`, color: theme.colors.primaryLight, fontWeight: '800',
  },
  rankName: { color: theme.colors.textPrimary, fontWeight: '700' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  catChip: {
    color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
  },
});
