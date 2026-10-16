import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import {
  avisar, confirmar, CATEGORIAS, CATEGORIA_LABEL, NIVELES, NIVEL_LABEL,
} from '../../utils/dialogos';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import {
  ScreenHeader, LoadingState, ErrorState, EmptyState, Card, Badge, IconButton,
  ChipSelector, FieldLabel, FormModal,
} from '../../components/admin/AdminUI';

const VACIA = {
  id: null, nombre: '', objetivo: '', descripcion: '', nivel: 'PRINCIPIANTE', categoria: 'FUERZA', duracion_minutos: '',
};
const DETALLE_VACIO = { ejercicio_id: null, series: '3', repeticiones: '12', descanso_segundos: '60' };

export const RutinasAdmin = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = createStyles(theme);
  const [rutinas, setRutinas] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODAS');
  const [abierta, setAbierta] = useState(null);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [detalle, setDetalle] = useState(null); // { rutina, ...DETALLE_VACIO }
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e] = await Promise.all([adminService.listarRutinas(), adminService.listarEjercicios()]);
      setRutinas(r);
      setEjercicios(e.filter((x) => x.activo));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las rutinas.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirForm = (r) => {
    setErrores({});
    setForm(r ? {
      ...VACIA, ...r, descripcion: r.descripcion || '', duracion_minutos: r.duracion_minutos ? String(r.duracion_minutos) : '',
    } : { ...VACIA });
  };

  const guardar = async () => {
    const e = {};
    if (form.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres';
    if (form.objetivo.trim().length < 3) e.objetivo = 'Indicá el objetivo';
    const dur = form.duracion_minutos ? Number(form.duracion_minutos) : null;
    if (dur !== null && (!Number.isInteger(dur) || dur < 5 || dur > 240)) e.duracion_minutos = 'Entre 5 y 240 minutos';
    setErrores(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await adminService.guardarRutina(form, user.id);
      setForm(null);
      await cargar();
    } catch (err) {
      avisar('No se pudo guardar', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const alternar = async (r) => {
    try {
      await adminService.cambiarActivaRutina(r.id, !r.activa);
      await cargar();
    } catch (err) {
      avisar('No se pudo actualizar', mensajeDeError(err));
    }
  };

  const eliminar = async (r) => {
    if (!(await confirmar('Eliminar rutina', `¿Eliminar "${r.nombre}"? Si está asignada a algún cliente no se podrá borrar; en ese caso desactivala.`, 'Eliminar'))) return;
    try {
      await adminService.eliminarRutina(r.id);
      await cargar();
    } catch (err) {
      avisar('No se pudo eliminar', mensajeDeError(err));
    }
  };

  const agregarEjercicio = async () => {
    const { rutina, ejercicio_id, series, repeticiones, descanso_segundos } = detalle;
    if (!ejercicio_id) { avisar('Falta el ejercicio', 'Elegí un ejercicio de la lista.'); return; }
    if (!(Number(series) > 0 && Number(repeticiones) > 0)) { avisar('Datos inválidos', 'Series y repeticiones deben ser mayores a 0.'); return; }
    setSaving(true);
    try {
      await adminService.agregarEjercicioARutina({
        rutina_id: rutina.id, ejercicio_id, series, repeticiones, descanso_segundos,
        orden: (rutina.rutina_detalle?.length || 0) + 1,
      });
      setDetalle(null);
      await cargar();
    } catch (err) {
      avisar('No se pudo agregar', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const quitarEjercicio = async (d) => {
    if (!(await confirmar('Quitar ejercicio', `¿Quitar "${d.ejercicios?.nombre}" de la rutina?`, 'Quitar'))) return;
    try {
      await adminService.quitarEjercicioDeRutina(d.id);
      await cargar();
    } catch (err) {
      avisar('No se pudo quitar', mensajeDeError(err));
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  const visibles = rutinas.filter((r) => filtro === 'TODAS' || r.categoria === filtro);

  return (
    <View>
      <ScreenHeader title="Rutinas" subtitle="Plantillas por categoría con sus ejercicios" actionLabel="Nueva rutina" onAction={() => abrirForm(null)} />
      <ChipSelector
        options={['TODAS', ...CATEGORIAS]}
        labels={{ TODAS: 'Todas', ...CATEGORIA_LABEL }}
        value={filtro}
        onChange={setFiltro}
      />

      {visibles.length === 0 && <EmptyState icon="barbell-outline" text="No hay rutinas en esta categoría." />}

      {visibles.map((r) => {
        const ejerciciosRutina = [...(r.rutina_detalle || [])].sort((a, b) => a.orden - b.orden);
        const expandida = abierta === r.id;
        return (
          <Card key={r.id} muted={!r.activa}>
            <TouchableOpacity onPress={() => setAbierta(expandida ? null : r.id)} style={s.head}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={s.name}>{r.nombre}</Text>
                <Text style={s.meta}>{r.objetivo}</Text>
                <View style={s.badges}>
                  <Badge text={CATEGORIA_LABEL[r.categoria]} tone="primary" />
                  <Badge text={NIVEL_LABEL[r.nivel]} />
                  {r.duracion_minutos ? <Badge text={`${r.duracion_minutos} min`} /> : null}
                  <Badge text={`${ejerciciosRutina.length} ejercicios`} />
                  {!r.activa && <Badge text="Inactiva" tone="warning" />}
                </View>
              </View>
              <View style={s.actions}>
                <IconButton icon="create-outline" label="Editar" tone="primary" onPress={() => abrirForm(r)} />
                <IconButton icon={r.activa ? 'eye-off-outline' : 'eye-outline'} label={r.activa ? 'Ocultar' : 'Mostrar'} onPress={() => alternar(r)} />
                <IconButton icon="trash-outline" tone="danger" onPress={() => eliminar(r)} />
              </View>
            </TouchableOpacity>

            {expandida && (
              <View style={s.detail}>
                {ejerciciosRutina.length === 0 && <Text style={s.meta}>Esta rutina todavía no tiene ejercicios.</Text>}
                {ejerciciosRutina.map((d, i) => (
                  <View key={d.id} style={s.exRow}>
                    <Text style={s.exNum}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exName}>{d.ejercicios?.nombre}</Text>
                      <Text style={s.meta}>{d.series} × {d.repeticiones} · descanso {d.descanso_segundos}s</Text>
                    </View>
                    <IconButton icon="close-circle-outline" tone="danger" onPress={() => quitarEjercicio(d)} />
                  </View>
                ))}
                <CustomButton
                  title="Agregar ejercicio"
                  variant="outline"
                  size="sm"
                  iconName="add"
                  style={{ marginTop: theme.spacing.sm }}
                  onPress={() => setDetalle({ rutina: r, ...DETALLE_VACIO })}
                />
              </View>
            )}
            {!expandida && <Text style={s.hint}>Tocá para ver y editar los ejercicios</Text>}
          </Card>
        );
      })}

      <FormModal visible={!!form} title={form?.id ? 'Editar rutina' : 'Nueva rutina'} onClose={() => setForm(null)} onSubmit={guardar} saving={saving}>
        {form && (
          <>
            <CustomInput label="Nombre" placeholder="Ej. Fuerza Base 5x5" value={form.nombre} error={errores.nombre}
              onChangeText={(v) => setForm({ ...form, nombre: v })} autoCapitalize="sentences" />
            <CustomInput label="Objetivo" placeholder="Ej. Aumentar la fuerza máxima" value={form.objetivo} error={errores.objetivo}
              onChangeText={(v) => setForm({ ...form, objetivo: v })} autoCapitalize="sentences" />
            <CustomInput label="Descripción (opcional)" value={form.descripcion}
              onChangeText={(v) => setForm({ ...form, descripcion: v })} autoCapitalize="sentences" />
            <FieldLabel>Categoría</FieldLabel>
            <ChipSelector options={CATEGORIAS} labels={CATEGORIA_LABEL} value={form.categoria} onChange={(categoria) => setForm({ ...form, categoria })} />
            <FieldLabel>Nivel</FieldLabel>
            <ChipSelector options={NIVELES} labels={NIVEL_LABEL} value={form.nivel} onChange={(nivel) => setForm({ ...form, nivel })} />
            <CustomInput label="Duración en minutos (opcional)" placeholder="45" value={form.duracion_minutos} error={errores.duracion_minutos}
              onChangeText={(v) => setForm({ ...form, duracion_minutos: v.replace(/\D/g, '') })} keyboardType="number-pad" />
          </>
        )}
      </FormModal>

      <FormModal
        visible={!!detalle}
        title={detalle ? `Agregar a "${detalle.rutina.nombre}"` : ''}
        onClose={() => setDetalle(null)}
        onSubmit={agregarEjercicio}
        submitLabel="Agregar"
        saving={saving}
      >
        {detalle && (
          <>
            <FieldLabel>Ejercicio</FieldLabel>
            <View style={s.exPicker}>
              {ejercicios
                .filter((e) => !(detalle.rutina.rutina_detalle || []).some((d) => d.ejercicio_id === e.id))
                .map((e) => {
                  const activo = detalle.ejercicio_id === e.id;
                  return (
                    <TouchableOpacity key={e.id} onPress={() => setDetalle({ ...detalle, ejercicio_id: e.id })} style={[s.exOption, activo && s.exOptionActive]}>
                      <Text style={[s.exName, activo && { color: '#FFFFFF' }]}>{e.nombre}</Text>
                      <Text style={[s.meta, activo && { color: '#E0F2FE' }]}>{e.grupo_muscular}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
            <View style={s.threeFields}>
              <View style={{ flex: 1 }}>
                <CustomInput label="Series" value={detalle.series} keyboardType="number-pad"
                  onChangeText={(v) => setDetalle({ ...detalle, series: v.replace(/\D/g, '') })} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput label="Reps" value={detalle.repeticiones} keyboardType="number-pad"
                  onChangeText={(v) => setDetalle({ ...detalle, repeticiones: v.replace(/\D/g, '') })} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput label="Descanso (s)" value={detalle.descanso_segundos} keyboardType="number-pad"
                  onChangeText={(v) => setDetalle({ ...detalle, descanso_segundos: v.replace(/\D/g, '') })} />
              </View>
            </View>
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, flexWrap: 'wrap' },
  name: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: theme.typography.sizes.lg },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
  detail: { marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  exNum: {
    width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, overflow: 'hidden',
    backgroundColor: `${theme.colors.primary}33`, color: theme.colors.primaryLight, fontWeight: '800',
  },
  exName: { color: theme.colors.textPrimary, fontWeight: '600' },
  exPicker: { gap: 6, marginBottom: theme.spacing.md },
  exOption: {
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
  },
  exOptionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  threeFields: { flexDirection: 'row', gap: theme.spacing.sm },
});
