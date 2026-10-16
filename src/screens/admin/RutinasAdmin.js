import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, CATEGORIAS, CATEGORIA_LABEL, NIVELES, NIVEL_LABEL } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton,
  FieldLabel, FormModal, FormField, FormRow, PrimaryButton, EmptyState,
} from '../../components/admin/AdminUI';
import { nombrePersona } from './HorariosAdmin';

const VACIA = {
  id: null, nombre: '', objetivo: '', descripcion: '', nivel: 'PRINCIPIANTE', categoria: 'FUERZA', duracion_minutos: '',
};
const DETALLE_VACIO = { ejercicio_id: '', series: '3', repeticiones: '12', descanso_segundos: '60' };

// 3C · Gestión de Rutinas
export const RutinasAdmin = ({ busqueda = '', setBusqueda = () => {} }) => {
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const [rutinas, setRutinas] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoria, setCategoria] = useState('TODAS');
  const [nivel, setNivel] = useState('TODOS');
  const [verId, setVerId] = useState(null); // rutina abierta en el modal de ejercicios
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [nuevo, setNuevo] = useState(DETALLE_VACIO);
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
      const guardada = await adminService.guardarRutina(form, user.id);
      const eraNueva = !form.id;
      setForm(null);
      await cargar();
      if (eraNueva && guardada?.id) { setNuevo(DETALLE_VACIO); setVerId(guardada.id); } // seguir cargando ejercicios
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

  const rutinaAbierta = rutinas.find((r) => r.id === verId);
  const detalleOrdenado = [...(rutinaAbierta?.rutina_detalle || [])].sort((a, b) => a.orden - b.orden);

  const agregarEjercicio = async () => {
    const { ejercicio_id, series, repeticiones, descanso_segundos } = nuevo;
    if (!ejercicio_id) { avisar('Falta el ejercicio', 'Elegí un ejercicio de la lista.'); return; }
    if (!(Number(series) > 0 && Number(repeticiones) > 0)) { avisar('Datos inválidos', 'Series y repeticiones deben ser mayores a 0.'); return; }
    setSaving(true);
    try {
      await adminService.agregarEjercicioARutina({
        rutina_id: rutinaAbierta.id, ejercicio_id: Number(ejercicio_id), series, repeticiones, descanso_segundos,
        orden: (detalleOrdenado.at(-1)?.orden || 0) + 1,
      });
      setNuevo(DETALLE_VACIO);
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

  const q = busqueda.trim().toLowerCase();
  const filas = rutinas
    .filter((r) => categoria === 'TODAS' || r.categoria === categoria)
    .filter((r) => nivel === 'TODOS' || r.nivel === nivel)
    .filter((r) => !q || `${r.nombre} ${r.objetivo} ${nombrePersona(r.creador) || ''}`.toLowerCase().includes(q));

  const columnas = [
    {
      key: 'nombre', title: 'Rutina', flex: 2, render: (r) => (
        <View>
          <CellText bold>{r.nombre}</CellText>
          <CellText muted small>{r.objetivo}</CellText>
        </View>
      ),
    },
    { key: 'cat', title: 'Objetivo', flex: 1.1, render: (r) => <Badge text={CATEGORIA_LABEL[r.categoria]} tone="primary" /> },
    { key: 'nivel', title: 'Nivel', flex: 1, render: (r) => <CellText>{NIVEL_LABEL[r.nivel]}</CellText> },
    { key: 'ej', title: 'Ejercicios', flex: 0.8, render: (r) => <CellText>{r.rutina_detalle?.length || 0}</CellText> },
    {
      key: 'creador', title: 'Creada por', flex: 1.3, render: (r) => (
        <CellText muted={!r.creador}>{r.creador ? `${nombrePersona(r.creador)}${r.creador.rol === 'ENTRENADOR' ? ' (Entr.)' : ''}` : '—'}</CellText>
      ),
    },
    { key: 'estado', title: 'Estado', flex: 0.9, render: (r) => <Badge text={r.activa ? 'Activa' : 'Inactiva'} tone={r.activa ? 'success' : 'neutral'} /> },
    {
      key: 'acc', title: 'Acciones', flex: 2.5, render: (r) => (
        <Actions>
          <IconButton icon="list-outline" label="Ejercicios" tone="primary" onPress={() => { setNuevo(DETALLE_VACIO); setVerId(r.id); }} />
          <IconButton icon="create-outline" onPress={() => abrirForm(r)} label="Editar" />
          <IconButton icon={r.activa ? 'eye-off-outline' : 'eye-outline'} onPress={() => alternar(r)} />
          <IconButton icon="trash-outline" tone="danger" onPress={() => eliminar(r)} />
        </Actions>
      ),
    },
  ];

  const disponibles = ejercicios.filter((e) => !detalleOrdenado.some((d) => d.ejercicio_id === e.id));

  return (
    <View>
      <ScreenHeader title="Gestión de Rutinas" subtitle="Plantillas de entrenamiento con sus ejercicios, series y descansos"
        actionLabel="Nueva Rutina" onAction={() => abrirForm(null)} />
      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder="Buscar rutina..." />
        <Select label="Objetivo" value={categoria} onChange={setCategoria}
          options={[{ value: 'TODAS', label: 'Todos' }, ...CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABEL[c] }))]} />
        <Select label="Nivel" value={nivel} onChange={setNivel}
          options={[{ value: 'TODOS', label: 'Todos' }, ...NIVELES.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))]} />
      </Toolbar>
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar}
        emptyIcon="barbell-outline" emptyText={rutinas.length ? 'No hay rutinas con esos filtros.' : 'Todavía no hay rutinas.'} />

      <FormModal visible={!!form} title={form?.id ? 'Editar Rutina' : 'Crear nueva Rutina'} onClose={() => setForm(null)}
        onSubmit={guardar} submitLabel="Guardar Rutina" saving={saving}>
        {form && (
          <>
            <FormField label="Nombre" placeholder="Ej. Fuerza Base 5x5" value={form.nombre} error={errores.nombre}
              onChangeText={(v) => setForm({ ...form, nombre: v })} />
            <FormField label="Objetivo" placeholder="Ej. Aumentar la fuerza máxima" value={form.objetivo} error={errores.objetivo}
              onChangeText={(v) => setForm({ ...form, objetivo: v })} />
            <FormRow>
              <View style={{ marginBottom: 12 }}>
                <FieldLabel>Categoría</FieldLabel>
                <Select full label="Categoría" value={form.categoria} onChange={(categoria) => setForm({ ...form, categoria })}
                  options={CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABEL[c] }))} />
              </View>
              <View style={{ marginBottom: 12 }}>
                <FieldLabel>Nivel</FieldLabel>
                <Select full label="Nivel" value={form.nivel} onChange={(nivel) => setForm({ ...form, nivel })}
                  options={NIVELES.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))} />
              </View>
            </FormRow>
            <FormField label="Duración (minutos)" placeholder="45" value={form.duracion_minutos} error={errores.duracion_minutos}
              onChangeText={(v) => setForm({ ...form, duracion_minutos: v.replace(/\D/g, '') })} keyboardType="number-pad" />
            <FormField label="Descripción" placeholder="Indicaciones generales (opcional)" multiline value={form.descripcion}
              onChangeText={(v) => setForm({ ...form, descripcion: v })} />
            {!form.id && <Text style={s.hint}>Después de guardar vas a poder agregarle los ejercicios.</Text>}
          </>
        )}
      </FormModal>

      <FormModal visible={!!rutinaAbierta} title={rutinaAbierta ? `Ejercicios de "${rutinaAbierta.nombre}"` : ''} onClose={() => setVerId(null)} wide>
        {rutinaAbierta && (
          <>
            {detalleOrdenado.length === 0 && <EmptyState icon="body-outline" text="Esta rutina todavía no tiene ejercicios." />}
            {detalleOrdenado.map((d, i) => (
              <View key={d.id} style={s.exRow}>
                <Text style={s.exNum}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.exName}>{d.ejercicios?.nombre}</Text>
                  <Text style={s.meta}>{d.ejercicios?.grupo_muscular} · {d.series} × {d.repeticiones} · descanso {d.descanso_segundos}s</Text>
                </View>
                <IconButton icon="trash-outline" tone="danger" onPress={() => quitarEjercicio(d)} />
              </View>
            ))}
            <View style={s.addBox}>
              <Text style={s.addTitle}>Agregar ejercicio</Text>
              <Select full label="Ejercicio" placeholder="Elegí un ejercicio" value={nuevo.ejercicio_id}
                onChange={(v) => setNuevo({ ...nuevo, ejercicio_id: v })} style={{ marginBottom: 12 }}
                options={disponibles.map((e) => ({ value: String(e.id), label: `${e.nombre} · ${e.grupo_muscular}` }))} />
              <FormRow>
                <FormField label="Series" value={nuevo.series} keyboardType="number-pad" onChangeText={(v) => setNuevo({ ...nuevo, series: v.replace(/\D/g, '') })} />
                <FormField label="Repeticiones" value={nuevo.repeticiones} keyboardType="number-pad" onChangeText={(v) => setNuevo({ ...nuevo, repeticiones: v.replace(/\D/g, '') })} />
                <FormField label="Descanso (s)" value={nuevo.descanso_segundos} keyboardType="number-pad" onChangeText={(v) => setNuevo({ ...nuevo, descanso_segundos: v.replace(/\D/g, '') })} />
              </FormRow>
              <PrimaryButton title="Agregar a la rutina" icon="add" onPress={agregarEjercicio} loading={saving} style={{ alignSelf: 'flex-start' }} />
            </View>
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  hint: { color: theme.colors.textMuted, fontSize: 12 },
  meta: { color: theme.colors.textSecondary, fontSize: 12 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  exNum: {
    width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, overflow: 'hidden',
    backgroundColor: `${theme.colors.primary}22`, color: theme.colors.primary, fontWeight: '800',
  },
  exName: { color: theme.colors.textPrimary, fontWeight: '700' },
  addBox: { marginTop: 16, padding: 14, borderRadius: 8, backgroundColor: theme.colors.inputBackground },
  addTitle: { color: theme.colors.textPrimary, fontWeight: '800', marginBottom: 10 },
});
