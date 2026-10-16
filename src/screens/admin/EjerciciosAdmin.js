import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar } from '../../utils/dialogos';
import { CustomInput } from '../../components/CustomInput';
import {
  ScreenHeader, LoadingState, ErrorState, EmptyState, Card, Badge, IconButton, FormModal,
} from '../../components/admin/AdminUI';

const VACIO = { id: null, nombre: '', grupo_muscular: '', descripcion: '', video_url: '' };

export const EjerciciosAdmin = () => {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminService.listarEjercicios());
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar los ejercicios.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (ej) => {
    setErrores({});
    setForm(ej ? { ...VACIO, ...ej, descripcion: ej.descripcion || '', video_url: ej.video_url || '' } : { ...VACIO });
  };

  const guardar = async () => {
    const e = {};
    if (form.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres';
    if (form.grupo_muscular.trim().length < 3) e.grupo_muscular = 'Indicá el grupo muscular';
    if (form.video_url && !/^https?:\/\//.test(form.video_url.trim())) e.video_url = 'Debe empezar con http:// o https://';
    setErrores(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await adminService.guardarEjercicio(form);
      setForm(null);
      await cargar();
    } catch (err) {
      avisar('No se pudo guardar', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const alternar = async (ej) => {
    try {
      await adminService.cambiarActivoEjercicio(ej.id, !ej.activo);
      await cargar();
    } catch (err) {
      avisar('No se pudo actualizar', mensajeDeError(err));
    }
  };

  const eliminar = async (ej) => {
    if (!(await confirmar('Eliminar ejercicio', `¿Eliminar "${ej.nombre}"?`, 'Eliminar'))) return;
    try {
      await adminService.eliminarEjercicio(ej.id);
      await cargar();
    } catch (err) {
      avisar('No se pudo eliminar', mensajeDeError(err));
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  const q = busqueda.trim().toLowerCase();
  const filtrados = items.filter((i) => !q || i.nombre.toLowerCase().includes(q) || i.grupo_muscular.toLowerCase().includes(q));

  return (
    <View>
      <ScreenHeader title="Ejercicios" subtitle={`${items.length} en el catálogo`} actionLabel="Nuevo ejercicio" onAction={() => abrir(null)} />
      <CustomInput placeholder="Buscar por nombre o grupo muscular" value={busqueda} onChangeText={setBusqueda} iconName="search-outline" />

      {filtrados.length === 0 && <EmptyState icon="body-outline" text="No hay ejercicios que coincidan." />}

      {filtrados.map((ej) => (
        <Card key={ej.id} muted={!ej.activo} style={s.row}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={s.name}>{ej.nombre}</Text>
            <Text style={s.group}>{ej.grupo_muscular}</Text>
            {ej.descripcion ? <Text style={s.desc} numberOfLines={2}>{ej.descripcion}</Text> : null}
          </View>
          {!ej.activo && <Badge text="Inactivo" />}
          <View style={s.actions}>
            <IconButton icon="create-outline" label="Editar" tone="primary" onPress={() => abrir(ej)} />
            <IconButton icon={ej.activo ? 'eye-off-outline' : 'eye-outline'} label={ej.activo ? 'Ocultar' : 'Mostrar'} onPress={() => alternar(ej)} />
            <IconButton icon="trash-outline" tone="danger" onPress={() => eliminar(ej)} />
          </View>
        </Card>
      ))}

      <FormModal visible={!!form} title={form?.id ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose={() => setForm(null)} onSubmit={guardar} saving={saving}>
        {form && (
          <>
            <CustomInput label="Nombre" placeholder="Ej. Remo en máquina" value={form.nombre} error={errores.nombre}
              onChangeText={(v) => setForm({ ...form, nombre: v })} autoCapitalize="sentences" />
            <CustomInput label="Grupo muscular" placeholder="Ej. Espalda / Dorsales" value={form.grupo_muscular} error={errores.grupo_muscular}
              onChangeText={(v) => setForm({ ...form, grupo_muscular: v })} autoCapitalize="sentences" />
            <CustomInput label="Descripción / técnica" placeholder="Indicaciones de ejecución" value={form.descripcion}
              onChangeText={(v) => setForm({ ...form, descripcion: v })} autoCapitalize="sentences" />
            <CustomInput label="Video (opcional)" placeholder="https://…" value={form.video_url} error={errores.video_url}
              onChangeText={(v) => setForm({ ...form, video_url: v })} keyboardType="url" />
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  name: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.sizes.md },
  group: { color: theme.colors.primaryLight, fontSize: theme.typography.sizes.sm },
  desc: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
