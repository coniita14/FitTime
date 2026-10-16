import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, DIAS, DIA_LABEL } from '../../utils/dialogos';
import { CustomInput } from '../../components/CustomInput';
import {
  ScreenHeader, LoadingState, ErrorState, EmptyState, Card, Badge, IconButton,
  ChipSelector, FieldLabel, FormModal,
} from '../../components/admin/AdminUI';

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VACIO = { id: null, dia: 'LUNES', hora_inicio: '', hora_fin: '', cupo_maximo: '15' };

export const HorariosAdmin = () => {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHorarios(await adminService.listarHorarios());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (h) => {
    setErrores({});
    setForm(h ? {
      ...h, hora_inicio: h.hora_inicio.slice(0, 5), hora_fin: h.hora_fin.slice(0, 5), cupo_maximo: String(h.cupo_maximo),
    } : { ...VACIO });
  };

  const validar = () => {
    const e = {};
    if (!HORA_RE.test(form.hora_inicio)) e.hora_inicio = 'Formato HH:MM (ej. 08:00)';
    if (!HORA_RE.test(form.hora_fin)) e.hora_fin = 'Formato HH:MM (ej. 09:00)';
    if (!e.hora_inicio && !e.hora_fin && form.hora_fin <= form.hora_inicio) e.hora_fin = 'Debe ser posterior al inicio';
    const cupo = Number(form.cupo_maximo);
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 200) e.cupo_maximo = 'Número entre 1 y 200';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      await adminService.guardarHorario(form);
      setForm(null);
      await cargar();
    } catch (e) {
      avisar('No se pudo guardar', mensajeDeError(e));
    } finally {
      setSaving(false);
    }
  };

  const alternar = async (h) => {
    try {
      await adminService.cambiarActivoHorario(h.id, !h.activo);
      await cargar();
    } catch (e) {
      avisar('No se pudo actualizar', mensajeDeError(e));
    }
  };

  const eliminar = async (h) => {
    const ok = await confirmar(
      'Eliminar horario',
      `¿Eliminar ${DIA_LABEL[h.dia]} ${h.hora_inicio.slice(0, 5)}? Si tiene turnos registrados no se podrá borrar; en ese caso desactivalo.`,
      'Eliminar',
    );
    if (!ok) return;
    try {
      await adminService.eliminarHorario(h.id);
      await cargar();
    } catch (e) {
      avisar('No se pudo eliminar', mensajeDeError(e));
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  return (
    <View>
      <ScreenHeader
        title="Horarios"
        subtitle="Franjas disponibles para reservar y su cupo máximo"
        actionLabel="Nuevo horario"
        onAction={() => abrir(null)}
      />

      {horarios.length === 0 && <EmptyState icon="time-outline" text="Todavía no cargaste horarios." />}

      {DIAS.map((dia) => {
        const delDia = horarios.filter((h) => h.dia === dia);
        if (!delDia.length) return null;
        return (
          <View key={dia} style={{ marginBottom: theme.spacing.md }}>
            <Text style={s.dayTitle}>{DIA_LABEL[dia]}</Text>
            {delDia.map((h) => (
              <Card key={h.id} muted={!h.activo} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.time}>{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</Text>
                  <Text style={s.meta}>Cupo máximo: {h.cupo_maximo} personas</Text>
                </View>
                <Badge text={h.activo ? 'Activo' : 'Pausado'} tone={h.activo ? 'success' : 'neutral'} />
                <View style={s.actions}>
                  <IconButton icon="create-outline" onPress={() => abrir(h)} label="Editar" tone="primary" />
                  <IconButton icon={h.activo ? 'pause-outline' : 'play-outline'} onPress={() => alternar(h)} label={h.activo ? 'Pausar' : 'Activar'} />
                  <IconButton icon="trash-outline" onPress={() => eliminar(h)} tone="danger" />
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      <FormModal
        visible={!!form}
        title={form?.id ? 'Editar horario' : 'Nuevo horario'}
        onClose={() => setForm(null)}
        onSubmit={guardar}
        saving={saving}
      >
        {form && (
          <>
            <FieldLabel>Día</FieldLabel>
            <ChipSelector options={DIAS} value={form.dia} labels={DIA_LABEL} onChange={(dia) => setForm({ ...form, dia })} />
            <View style={s.twoFields}>
              <View style={{ flex: 1 }}>
                <CustomInput label="Desde" placeholder="08:00" value={form.hora_inicio} error={errores.hora_inicio}
                  onChangeText={(v) => setForm({ ...form, hora_inicio: v })} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput label="Hasta" placeholder="09:00" value={form.hora_fin} error={errores.hora_fin}
                  onChangeText={(v) => setForm({ ...form, hora_fin: v })} keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            <CustomInput label="Cupo máximo" placeholder="15" value={form.cupo_maximo} error={errores.cupo_maximo}
              onChangeText={(v) => setForm({ ...form, cupo_maximo: v.replace(/\D/g, '') })} keyboardType="number-pad" />
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  dayTitle: { color: theme.colors.textSecondary, fontWeight: '700', marginBottom: theme.spacing.sm, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  time: { color: theme.colors.textPrimary, fontSize: theme.typography.sizes.lg, fontWeight: '700' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
  twoFields: { flexDirection: 'row', gap: theme.spacing.md },
});
