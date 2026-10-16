import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, fechaLocal, ESTADO_LABEL } from '../../utils/dialogos';
import { CustomInput } from '../../components/CustomInput';
import {
  ScreenHeader, LoadingState, ErrorState, EmptyState, Card, Badge, IconButton, FieldLabel, FormModal, ChipSelector,
} from '../../components/admin/AdminUI';

const TONO = { CONFIRMADO: 'primary', COMPLETADO: 'success', AUSENTE: 'warning', CANCELADO: 'danger' };
const ACCIONES = ['COMPLETADO', 'AUSENTE', 'CANCELADO', 'CONFIRMADO'];

const formatearFecha = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  const texto = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const TurnosAdmin = () => {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [fecha, setFecha] = useState(fechaLocal());
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  useEffect(() => { cargar(); }, [cargar]);

  const moverDia = (delta) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setFecha(fechaLocal(d));
  };

  const guardar = async () => {
    if ((gestion.motivo || '').trim().length < 3) { avisar('Falta el motivo', 'Escribí un motivo de al menos 3 caracteres.'); return; }
    setSaving(true);
    try {
      await adminService.gestionarTurno(gestion.turno.id, gestion.estado, gestion.motivo.trim());
      setGestion(null);
      await cargar();
    } catch (err) {
      avisar('No se pudo actualizar el turno', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  // Agrupa por franja horaria para ver la ocupación de cada clase
  const grupos = turnos.reduce((acc, t) => {
    const key = t.horario_id;
    if (!acc[key]) acc[key] = { horario: t.horarios, items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});
  const ordenados = Object.values(grupos).sort((a, b) => a.horario.hora_inicio.localeCompare(b.horario.hora_inicio));

  return (
    <View>
      <ScreenHeader title="Turnos" subtitle="Reservas por día; marcá asistencia o cancelá con motivo" actionLabel="Actualizar" actionIcon="refresh" onAction={cargar} />

      <View style={s.dateBar}>
        <TouchableOpacity onPress={() => moverDia(-1)} style={s.dateBtn} accessibilityLabel="Día anterior">
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.dateText}>{formatearFecha(fecha)}</Text>
          {fecha !== fechaLocal() && (
            <TouchableOpacity onPress={() => setFecha(fechaLocal())}><Text style={s.todayLink}>Volver a hoy</Text></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => moverDia(1)} style={s.dateBtn} accessibilityLabel="Día siguiente">
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={cargar} />}
      {!loading && !error && ordenados.length === 0 && <EmptyState icon="calendar-outline" text="No hay turnos reservados para este día." />}

      {!loading && !error && ordenados.map(({ horario, items }) => {
        const confirmados = items.filter((t) => t.estado === 'CONFIRMADO' || t.estado === 'COMPLETADO').length;
        return (
          <Card key={horario.hora_inicio}>
            <View style={s.groupHead}>
              <Text style={s.groupTitle}>{horario.hora_inicio.slice(0, 5)} – {horario.hora_fin.slice(0, 5)}</Text>
              <Badge text={`${confirmados}/${horario.cupo_maximo} lugares`} tone={confirmados >= horario.cupo_maximo ? 'danger' : 'success'} />
            </View>
            {items.map((t) => (
              <View key={t.id} style={s.turnoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{t.usuarios?.nombre} {t.usuarios?.apellido !== '-' ? t.usuarios?.apellido : ''}</Text>
                  <Text style={s.meta}>{t.usuarios?.email}</Text>
                </View>
                <Badge text={ESTADO_LABEL[t.estado]} tone={TONO[t.estado]} />
                <IconButton icon="ellipsis-horizontal-circle-outline" label="Gestionar" tone="primary"
                  onPress={() => setGestion({ turno: t, estado: t.estado === 'CONFIRMADO' ? 'COMPLETADO' : 'CONFIRMADO', motivo: '' })} />
              </View>
            ))}
          </Card>
        );
      })}

      <FormModal visible={!!gestion} title="Gestionar turno" onClose={() => setGestion(null)} onSubmit={guardar} saving={saving}>
        {gestion && (
          <>
            <Text style={[s.name, { marginBottom: theme.spacing.md }]}>
              {gestion.turno.usuarios?.nombre} · {gestion.turno.horarios.hora_inicio.slice(0, 5)} hs · estado actual: {ESTADO_LABEL[gestion.turno.estado]}
            </Text>
            <FieldLabel>Nuevo estado</FieldLabel>
            <ChipSelector
              options={ACCIONES.filter((a) => a !== gestion.turno.estado)}
              labels={{ ...ESTADO_LABEL, CONFIRMADO: 'Reactivar' }}
              value={gestion.estado}
              onChange={(estado) => setGestion({ ...gestion, estado })}
            />
            <CustomInput label="Motivo (queda registrado)" placeholder="Ej. Asistió a la clase / Clase suspendida"
              value={gestion.motivo} onChangeText={(motivo) => setGestion({ ...gestion, motivo })} autoCapitalize="sentences" />
            {gestion.estado === 'CANCELADO' && (
              <Text style={s.meta}>El cupo se libera y el cliente recibe una notificación de cancelación.</Text>
            )}
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  dateBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.cardBackground, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.sm, marginBottom: theme.spacing.lg,
  },
  dateBtn: { padding: theme.spacing.sm },
  dateText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.sizes.md },
  todayLink: { color: theme.colors.primaryLight, fontSize: theme.typography.sizes.sm, marginTop: 2 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  groupTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.sizes.lg, fontWeight: '800' },
  turnoRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.border, flexWrap: 'wrap',
  },
  name: { color: theme.colors.textPrimary, fontWeight: '600' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
});
