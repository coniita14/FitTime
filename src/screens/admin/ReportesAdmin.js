import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { DIA_LABEL, CATEGORIA_LABEL, ESTADO_LABEL, ROL_LABEL, avisar, fechaLocal } from '../../utils/dialogos';
import { exportarCSV } from '../../utils/exportar';
import {
  ScreenHeader, Toolbar, Select, DataTable, CellText, Badge, Card, PrimaryButton, EmptyState,
} from '../../components/admin/AdminUI';
import { nombrePersona } from './HorariosAdmin';

const PERIODOS = {
  SEMANA: { label: 'Últimos 7 días', rango: () => { const h = new Date(); const d = new Date(); d.setDate(h.getDate() - 6); return [fechaLocal(d), fechaLocal(h)]; } },
  MES: { label: 'Este mes', rango: () => { const h = new Date(); return [fechaLocal(new Date(h.getFullYear(), h.getMonth(), 1)), fechaLocal(new Date(h.getFullYear(), h.getMonth() + 1, 0))]; } },
  MES_ANTERIOR: { label: 'Mes anterior', rango: () => { const h = new Date(); return [fechaLocal(new Date(h.getFullYear(), h.getMonth() - 1, 1)), fechaLocal(new Date(h.getFullYear(), h.getMonth(), 0))]; } },
  PROXIMOS: { label: 'Próximos 30 días', rango: () => { const h = new Date(); const d = new Date(); d.setDate(h.getDate() + 30); return [fechaLocal(h), fechaLocal(d)]; } },
};
const TONO_ESTADO = { CONFIRMADO: 'primary', COMPLETADO: 'success', CANCELADO: 'danger', AUSENTE: 'warning' };

// Reportes: turnos por período (con resumen por estado y por instructor), ranking de
// rutinas y exportación a CSV (se abre en Excel).
export const ReportesAdmin = () => {
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [periodo, setPeriodo] = useState('MES');
  const [estado, setEstado] = useState('TODOS');
  const [turnos, setTurnos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(null);

  const [desde, hasta] = PERIODOS[periodo].rango();

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, st] = await Promise.all([adminService.reporteTurnos(desde, hasta), adminService.estadisticas()]);
      setTurnos(t);
      setStats(st);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo generar el reporte.'));
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);
  useEffect(() => { cargar(); }, [cargar]);

  const filas = turnos.filter((t) => estado === 'TODOS' || t.estado === estado);
  const porEstado = turnos.reduce((acc, t) => ({ ...acc, [t.estado]: (acc[t.estado] || 0) + 1 }), {});
  const porInstructor = Object.entries(turnos.reduce((acc, t) => {
    const k = nombrePersona(t.horarios?.usuarios) || 'Sin asignar';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const asistidos = porEstado.COMPLETADO || 0;
  const cerrados = asistidos + (porEstado.AUSENTE || 0);

  const exportarTurnos = async () => {
    if (!filas.length) { avisar('Sin datos', 'No hay turnos para exportar con esos filtros.'); return; }
    setExportando('turnos');
    try {
      await exportarCSV(`fittime_turnos_${desde}_a_${hasta}.csv`, [
        { titulo: 'Turno', valor: (t) => t.id },
        { titulo: 'Fecha', valor: (t) => t.fecha_turno },
        { titulo: 'Día', valor: (t) => DIA_LABEL[t.horarios?.dia] },
        { titulo: 'Horario', valor: (t) => `${t.horarios?.hora_inicio?.slice(0, 5)}-${t.horarios?.hora_fin?.slice(0, 5)}` },
        { titulo: 'Cliente', valor: (t) => nombrePersona(t.usuarios) },
        { titulo: 'Email', valor: (t) => t.usuarios?.email },
        { titulo: 'Instructor', valor: (t) => nombrePersona(t.horarios?.usuarios) || 'Sin asignar' },
        { titulo: 'Estado', valor: (t) => ESTADO_LABEL[t.estado] },
        { titulo: 'Reservado el', valor: (t) => t.creado_en?.slice(0, 16).replace('T', ' ') },
      ], filas);
    } catch (e) {
      avisar('No se pudo exportar', mensajeDeError(e));
    } finally {
      setExportando(null);
    }
  };

  const exportarUsuarios = async () => {
    setExportando('usuarios');
    try {
      const u = await adminService.reporteUsuarios();
      await exportarCSV(`fittime_usuarios_${fechaLocal()}.csv`, [
        { titulo: 'Nombre', valor: nombrePersona },
        { titulo: 'Email', valor: (x) => x.email },
        { titulo: 'Teléfono', valor: (x) => x.telefono },
        { titulo: 'Rol', valor: (x) => ROL_LABEL[x.rol] },
        { titulo: 'Activo', valor: (x) => (x.activo ? 'Sí' : 'No') },
        { titulo: 'Rutina activa', valor: (x) => (x.rutina_asignada || []).find((r) => r.activa)?.rutinas?.nombre || '' },
        { titulo: 'Alta', valor: (x) => x.creado_en?.slice(0, 10) },
      ], u);
    } catch (e) {
      avisar('No se pudo exportar', mensajeDeError(e));
    } finally {
      setExportando(null);
    }
  };

  const columnas = [
    { key: 'fecha', title: 'Fecha', flex: 1, render: (t) => <CellText bold>{t.fecha_turno.split('-').reverse().join('/')}</CellText> },
    { key: 'hora', title: 'Clase', flex: 1.2, render: (t) => <CellText>{DIA_LABEL[t.horarios?.dia]} {t.horarios?.hora_inicio?.slice(0, 5)}</CellText> },
    { key: 'cli', title: 'Cliente', flex: 1.6, render: (t) => <CellText>{nombrePersona(t.usuarios)}</CellText> },
    { key: 'inst', title: 'Instructor', flex: 1.4, render: (t) => <CellText muted>{nombrePersona(t.horarios?.usuarios) || 'Sin asignar'}</CellText> },
    { key: 'est', title: 'Estado', flex: 1, render: (t) => <Badge text={ESTADO_LABEL[t.estado]} tone={TONO_ESTADO[t.estado]} /> },
  ];

  const resumen = [
    ['Turnos en el período', turnos.length],
    ['Asistencias', asistidos],
    ['Cancelaciones', porEstado.CANCELADO || 0],
    ['Ausencias', porEstado.AUSENTE || 0],
    ['Tasa de asistencia', cerrados ? `${Math.round((asistidos / cerrados) * 100)}%` : '—'],
  ];

  return (
    <View>
      <ScreenHeader title="Reportes" subtitle={`Del ${desde.split('-').reverse().join('/')} al ${hasta.split('-').reverse().join('/')}`}
        actionLabel="Exportar turnos (CSV)" actionIcon="download-outline" onAction={exportarTurnos}>
        <PrimaryButton title="Exportar usuarios" icon="people-outline" variant="outline" onPress={exportarUsuarios} loading={exportando === 'usuarios'} />
      </ScreenHeader>
      <Toolbar>
        <Select label="Período" value={periodo} onChange={setPeriodo}
          options={Object.entries(PERIODOS).map(([value, p]) => ({ value, label: p.label }))} />
        <Select label="Estado" value={estado} onChange={setEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, ...Object.keys(ESTADO_LABEL).map((k) => ({ value: k, label: ESTADO_LABEL[k] }))]} />
      </Toolbar>

      {!loading && !error && (
        <>
          <View style={s.kpis}>
            {resumen.map(([label, valor]) => (
              <Card key={label} style={s.kpi}>
                <Text style={s.kpiValue}>{valor}</Text>
                <Text style={s.kpiLabel}>{label}</Text>
              </Card>
            ))}
          </View>
          <View style={s.cols}>
            <Card style={s.col}>
              <Text style={s.cardTitle}>Turnos por instructor</Text>
              {porInstructor.length ? porInstructor.map(([n, c]) => (
                <View key={n} style={s.row}>
                  <Text style={s.rowLabel} numberOfLines={1}>{n}</Text>
                  <View style={s.track}><View style={[s.fill, { width: `${(c / porInstructor[0][1]) * 100}%` }]} /></View>
                  <Text style={s.rowValue}>{c}</Text>
                </View>
              )) : <EmptyState icon="medal-outline" text="Sin turnos en el período." />}
            </Card>
            <Card style={s.col}>
              <Text style={s.cardTitle}>Rutinas más usadas</Text>
              {stats?.rutinas_mas_usadas?.length ? stats.rutinas_mas_usadas.map((r, i) => (
                <View key={r.id} style={s.row}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName}>{r.nombre}</Text>
                    <Text style={s.kpiLabel}>{CATEGORIA_LABEL[r.categoria] || r.categoria} · {r.asignada} asignadas · {r.guardada} guardadas</Text>
                  </View>
                </View>
              )) : <EmptyState icon="barbell-outline" text="Todavía no hay rutinas asignadas ni guardadas." />}
            </Card>
          </View>
          <Text style={s.cardTitle}>Detalle de turnos</Text>
        </>
      )}
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar} pageSize={10}
        emptyIcon="calendar-outline" emptyText="No hay turnos en este período." />
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  kpi: { flexGrow: 1, flexBasis: 150, marginBottom: 0 },
  kpiValue: { fontSize: 26, fontWeight: '900', color: theme.colors.textPrimary },
  kpiLabel: { color: theme.colors.textSecondary, fontSize: 12 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  col: { flexGrow: 1, flexBasis: 320 },
  cardTitle: { color: theme.colors.textPrimary, fontWeight: '800', marginBottom: 10, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  rowLabel: { width: 130, color: theme.colors.textPrimary, fontSize: 13 },
  rowName: { color: theme.colors.textPrimary, fontWeight: '700' },
  rowValue: { width: 34, textAlign: 'right', color: theme.colors.textSecondary, fontSize: 13 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.inputBackground, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  rank: {
    width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, overflow: 'hidden',
    backgroundColor: `${theme.colors.primary}22`, color: theme.colors.primary, fontWeight: '800',
  },
});
