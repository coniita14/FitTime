import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, fechaLocal, ESTADO_LABEL } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton, FieldLabel, FormModal, FormField,
  SegmentToggle,
} from '../../components/admin/AdminUI';
import { nombrePersona } from './HorariosAdmin';

const TONO = { CONFIRMADO: 'primary', COMPLETADO: 'success', AUSENTE: 'warning', CANCELADO: 'danger' };
const ACCIONES = ['COMPLETADO', 'AUSENTE', 'CANCELADO', 'CONFIRMADO'];

const formatearFecha = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  const texto = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Turnos (admin) / Mis clases (entrenador): reservas del día, asistencia y cancelaciones.
export const TurnosAdmin = ({ modo = 'ADMIN', busqueda = '', setBusqueda = () => {} }) => {
  const esEntrenador = modo === 'ENTRENADOR';
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [fecha, setFecha] = useState(fechaLocal());
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clase, setClase] = useState('TODAS');
  const [estado, setEstado] = useState('TODOS');
  const [gestion, setGestion] = useState(null); // { turno, estado, motivo }
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTurnos(await adminService.listarTurnosDelDia(fecha));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los turnos.'));
    } finally {
      setLoading(false);
    }
  }, [fecha]);
  useEffect(() => { cargar(); setClase('TODAS'); }, [cargar]);

  const moverDia = (delta) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setFecha(fechaLocal(d));
  };

  const aplicar = async (turno, nuevoEstado, motivo) => {
    await adminService.gestionarTurno(turno.id, nuevoEstado, motivo);
    await cargar();
  };

  // Marcado rápido de asistencia (un toque)
  const marcar = async (t, nuevoEstado) => {
    try {
      await aplicar(t, nuevoEstado, nuevoEstado === 'COMPLETADO' ? 'Asistencia registrada' : 'No asistió a la clase');
    } catch (err) {
      avisar('No se pudo actualizar el turno', mensajeDeError(err));
    }
  };

  const guardar = async () => {
    if ((gestion.motivo || '').trim().length < 3) { avisar('Falta el motivo', 'Escribí un motivo de al menos 3 caracteres.'); return; }
    setSaving(true);
    try {
      await aplicar(gestion.turno, gestion.estado, gestion.motivo.trim());
      setGestion(null);
    } catch (err) {
      avisar('No se pudo actualizar el turno', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const clases = [...new Map(turnos.map((t) => [t.horario_id, t.horarios])).entries()]
    .sort((a, b) => a[1].hora_inicio.localeCompare(b[1].hora_inicio));
  const ocupacion = clases.map(([id, h]) => {
    const n = turnos.filter((t) => t.horario_id === id && (t.estado === 'CONFIRMADO' || t.estado === 'COMPLETADO')).length;
    return { id, h, n };
  });

  const q = busqueda.trim().toLowerCase();
  const filas = turnos
    .filter((t) => clase === 'TODAS' || String(t.horario_id) === clase)
    .filter((t) => estado === 'TODOS' || t.estado === estado)
    .filter((t) => !q || `${t.usuarios?.nombre} ${t.usuarios?.apellido} ${t.usuarios?.email}`.toLowerCase().includes(q))
    .sort((a, b) => a.horarios.hora_inicio.localeCompare(b.horarios.hora_inicio));

  const columnas = [
    { key: 'clase', title: 'Clase', flex: 1, render: (t) => <CellText bold>{t.horarios.hora_inicio.slice(0, 5)} - {t.horarios.hora_fin.slice(0, 5)}</CellText> },
    {
      key: 'cli', title: esEntrenador ? 'Alumno' : 'Cliente', flex: 2, render: (t) => (
        <View>
          <CellText bold>{nombrePersona(t.usuarios)}</CellText>
          <CellText muted small>{t.usuarios?.email}</CellText>
        </View>
      ),
    },
    { key: 'est', title: 'Estado', flex: 1, render: (t) => <Badge text={ESTADO_LABEL[t.estado]} tone={TONO[t.estado]} /> },
    {
      key: 'acc', title: 'Asistencia', flex: 1.8, render: (t) => (
        <Actions>
          {t.estado === 'CONFIRMADO' && <IconButton icon="checkmark-circle-outline" label="Asistió" tone="primary" onPress={() => marcar(t, 'COMPLETADO')} />}
          {t.estado === 'CONFIRMADO' && <IconButton icon="close-circle-outline" label="Ausente" onPress={() => marcar(t, 'AUSENTE')} />}
          <IconButton icon="ellipsis-horizontal" onPress={() => setGestion({ turno: t, estado: ACCIONES.find((a) => a !== t.estado), motivo: '' })} />
        </Actions>
      ),
    },
  ];

  return (
    <View>
      <ScreenHeader
        title={esEntrenador ? 'Mis Clases' : 'Gestión de Turnos'}
        subtitle={esEntrenador ? 'Alumnos anotados en tus clases; marcá la asistencia' : 'Reservas por día; marcá asistencia o cancelá con motivo'}
        actionLabel="Actualizar" actionIcon="refresh" onAction={cargar} />

      <View style={s.dateBar}>
        <TouchableOpacity onPress={() => moverDia(-1)} style={s.dateBtn} accessibilityLabel="Día anterior">
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.dateText}>{formatearFecha(fecha)}</Text>
          {fecha !== fechaLocal() && (
            <TouchableOpacity onPress={() => setFecha(fechaLocal())}><Text style={s.todayLink}>Volver a hoy</Text></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => moverDia(1)} style={s.dateBtn} accessibilityLabel="Día siguiente">
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {!loading && ocupacion.length > 0 && (
        <View style={s.occRow}>
          {ocupacion.map(({ id, h, n }) => (
            <TouchableOpacity key={id} onPress={() => setClase(clase === String(id) ? 'TODAS' : String(id))}
              style={[s.occCard, clase === String(id) && { borderColor: theme.colors.primary }]}>
              <Text style={s.occTime}>{h.hora_inicio.slice(0, 5)}</Text>
              <Text style={[s.occN, { color: n >= h.cupo_maximo ? theme.colors.danger : theme.colors.success }]}>{n}/{h.cupo_maximo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder={esEntrenador ? 'Buscar alumno...' : 'Buscar cliente...'} />
        <Select label="Clase" value={clase} onChange={setClase}
          options={[{ value: 'TODAS', label: 'Todas' }, ...clases.map(([id, h]) => ({ value: String(id), label: `${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}` }))]} />
        <Select label="Estado" value={estado} onChange={setEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, ...ACCIONES.map((k) => ({ value: k, label: ESTADO_LABEL[k] }))]} />
      </Toolbar>

      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar} pageSize={12}
        emptyIcon="calendar-outline" emptyText={esEntrenador ? 'Nadie reservó tus clases para este día.' : 'No hay turnos reservados para este día.'} />

      <FormModal visible={!!gestion} title="Gestionar turno" onClose={() => setGestion(null)} onSubmit={guardar} submitLabel="Guardar cambio" saving={saving}>
        {gestion && (
          <>
            <Text style={[s.name, { marginBottom: 12 }]}>
              {nombrePersona(gestion.turno.usuarios)} · {gestion.turno.horarios.hora_inicio.slice(0, 5)} hs · estado actual: {ESTADO_LABEL[gestion.turno.estado]}
            </Text>
            <FieldLabel>Nuevo estado</FieldLabel>
            <SegmentToggle value={gestion.estado} onChange={(e) => setGestion({ ...gestion, estado: e })}
              options={ACCIONES.filter((a) => a !== gestion.turno.estado).map((a) => [a, a === 'CONFIRMADO' ? 'Reactivar' : ESTADO_LABEL[a]])} />
            <FormField label="Motivo (queda registrado)" placeholder="Ej. Asistió a la clase / Clase suspendida" multiline
              value={gestion.motivo} onChangeText={(motivo) => setGestion({ ...gestion, motivo })} />
            {gestion.estado === 'CANCELADO' && <Text style={s.meta}>El cupo se libera y el cliente recibe una notificación de cancelación.</Text>}
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  dateBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.border, padding: 6, marginBottom: 12,
  },
  dateBtn: { padding: 8 },
  dateText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  todayLink: { color: theme.colors.primary, fontSize: 12, marginTop: 2 },
  occRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  occCard: {
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 76,
  },
  occTime: { color: theme.colors.textPrimary, fontWeight: '800' },
  occN: { fontSize: 12, fontWeight: '700' },
  name: { color: theme.colors.textPrimary, fontWeight: '600' },
  meta: { color: theme.colors.textSecondary, fontSize: 12 },
});
