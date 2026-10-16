import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton, FormModal, FormField, FormRow,
} from '../../components/admin/AdminUI';

const VACIO = { id: null, nombre: '', grupo_muscular: '', descripcion: '', video_url: '', musculos: '', consejos: '' };

// 3D · Gestión de Ejercicios
export const EjerciciosAdmin = ({ busqueda = '', setBusqueda = () => {} }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grupo, setGrupo] = useState('TODOS');
  const [estado, setEstado] = useState('TODOS');
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
    setForm(ej ? {
      ...VACIO, ...ej, descripcion: ej.descripcion || '', video_url: ej.video_url || '',
      musculos: (ej.musculos || []).join(', '), consejos: ej.consejos || '',
    } : { ...VACIO });
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
    if (!(await confirmar('Eliminar ejercicio', `¿Eliminar "${ej.nombre}"? Si forma parte de una rutina no se podrá borrar; en ese caso ocultalo.`, 'Eliminar'))) return;
    try {
      await adminService.eliminarEjercicio(ej.id);
      await cargar();
    } catch (err) {
      avisar('No se pudo eliminar', mensajeDeError(err));
    }
  };

  const grupos = [...new Set(items.map((i) => i.grupo_muscular))].sort();
  const q = busqueda.trim().toLowerCase();
  const filas = items
    .filter((i) => grupo === 'TODOS' || i.grupo_muscular === grupo)
    .filter((i) => estado === 'TODOS' || (estado === 'ACTIVO' ? i.activo : !i.activo))
    .filter((i) => !q || `${i.nombre} ${i.grupo_muscular} ${(i.musculos || []).join(' ')}`.toLowerCase().includes(q));

  const columnas = [
    { key: 'nombre', title: 'Ejercicio', flex: 1.5, render: (e) => <CellText bold>{e.nombre}</CellText> },
    { key: 'grupo', title: 'Grupo muscular', flex: 1.3, render: (e) => <CellText>{e.grupo_muscular}</CellText> },
    { key: 'musc', title: 'Músculos', flex: 1.6, render: (e) => <CellText muted>{e.musculos?.length ? e.musculos.join(', ') : '—'}</CellText> },
    { key: 'cons', title: 'Consejo', flex: 0.9, render: (e) => <Badge text={e.consejos ? 'Cargado' : 'Falta'} tone={e.consejos ? 'success' : 'warning'} /> },
    { key: 'estado', title: 'Estado', flex: 0.9, render: (e) => <Badge text={e.activo ? 'Activo' : 'Oculto'} tone={e.activo ? 'success' : 'neutral'} /> },
    {
      key: 'acc', title: 'Acciones', flex: 1.3, render: (e) => (
        <Actions>
          <IconButton icon="create-outline" label="Editar" tone="primary" onPress={() => abrir(e)} />
          <IconButton icon={e.activo ? 'eye-off-outline' : 'eye-outline'} onPress={() => alternar(e)} />
          <IconButton icon="trash-outline" tone="danger" onPress={() => eliminar(e)} />
        </Actions>
      ),
    },
  ];

  return (
    <View>
      <ScreenHeader title="Gestión de Ejercicios" subtitle={`${items.length} ejercicios en el catálogo del gimnasio`}
        actionLabel="Nuevo Ejercicio" onAction={() => abrir(null)} />
      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder="Buscar ejercicio o músculo..." />
        <Select label="Grupo" value={grupo} onChange={setGrupo}
          options={[{ value: 'TODOS', label: 'Todos' }, ...grupos.map((g) => ({ value: g, label: g }))]} />
        <Select label="Estado" value={estado} onChange={setEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activo' }, { value: 'OCULTO', label: 'Oculto' }]} />
      </Toolbar>
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar}
        emptyIcon="body-outline" emptyText="No hay ejercicios que coincidan." />

      <FormModal visible={!!form} title={form?.id ? 'Editar Ejercicio' : 'Crear nuevo Ejercicio'} onClose={() => setForm(null)}
        onSubmit={guardar} submitLabel="Guardar Ejercicio" saving={saving}>
        {form && (
          <>
            <FormRow>
              <FormField label="Nombre" placeholder="Ej. Remo en máquina" value={form.nombre} error={errores.nombre}
                onChangeText={(v) => setForm({ ...form, nombre: v })} />
              <FormField label="Grupo muscular" placeholder="Ej. Espalda" value={form.grupo_muscular} error={errores.grupo_muscular}
                onChangeText={(v) => setForm({ ...form, grupo_muscular: v })} />
            </FormRow>
            <FormField label="Músculos involucrados (separados por coma)" placeholder="Cuádriceps, Glúteos, Core" value={form.musculos}
              onChangeText={(v) => setForm({ ...form, musculos: v })} />
            <FormField label="Descripción / técnica" placeholder="Indicaciones de ejecución" multiline value={form.descripcion}
              onChangeText={(v) => setForm({ ...form, descripcion: v })} />
            <FormField label="Consejos del entrenador" placeholder="Ej. Evitá que las rodillas sobrepasen la punta de los pies" multiline
              value={form.consejos} onChangeText={(v) => setForm({ ...form, consejos: v })} />
            <FormField label="Video (opcional)" placeholder="https://…" value={form.video_url} error={errores.video_url}
              onChangeText={(v) => setForm({ ...form, video_url: v })} keyboardType="url" autoCapitalize="none" />
          </>
        )}
      </FormModal>
    </View>
  );
};
