import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, DIAS, DIA_LABEL } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton,
  FieldLabel, FormModal, FormField, FormRow, SegmentToggle,
} from '../../components/admin/AdminUI';

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VACIO = { id: null, dia: 'LUNES', hora_inicio: '', hora_fin: '', cupo_maximo: '15', entrenador_id: null, activo: true, observaciones: '' };
export const nombrePersona = (u) => (u ? `${u.nombre} ${u.apellido && u.apellido !== '-' ? u.apellido : ''}`.trim() : null);

// 3B · Gestión de Horarios
export const HorariosAdmin = ({ busqueda = '', setBusqueda = () => {} }) => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [saving, setSaving] = useState(false);
  const [entrenadores, setEntrenadores] = useState([]);
  const [filtroDia, setFiltroDia] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, e] = await Promise.all([adminService.listarHorarios(), adminService.listarEntrenadores()]);
      setHorarios(h);
      setEntrenadores(e);
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
      entrenador_id: h.entrenador_id || null, observaciones: h.observaciones || '',
    } : { ...VACIO });
  };

  const validar = () => {
    const e = {};
    if (!HORA_RE.test(form.hora_inicio)) e.hora_inicio = 'Formato HH:MM (ej. 08:00)';
    if (!HORA_RE.test(form.hora_fin)) e.hora_fin = 'Formato HH:MM (ej. 09:00)';
    if (!e.hora_inicio && !e.hora_fin && form.hora_fin <= form.hora_inicio) e.hora_fin = 'Debe ser posterior al inicio';
    const cupo = Number(form.cupo_maximo);
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 200) e.cupo_maximo = 'Número entre 1 y 200';
    if ((form.observaciones || '').length > 300) e.observaciones = 'Máximo 300 caracteres';
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
      `¿Eliminar ${DIA_LABEL[h.dia]} ${h.hora_inicio.slice(0, 5)}? Si tiene turnos registrados no se podrá borrar; en ese caso pausalo.`,
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

  const q = busqueda.trim().toLowerCase();
  const filas = horarios
    .filter((h) => filtroDia === 'TODOS' || h.dia === filtroDia)
    .filter((h) => filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVO' ? h.activo : !h.activo))
    .filter((h) => !q || `${DIA_LABEL[h.dia]} ${h.hora_inicio} ${nombrePersona(h.entrenador) || ''} ${h.observaciones || ''}`.toLowerCase().includes(q))
    .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.hora_inicio.localeCompare(b.hora_inicio));

  const columnas = [
    { key: 'dia', title: 'Día', flex: 1, render: (h) => <CellText bold>{DIA_LABEL[h.dia]}</CellText> },
    { key: 'hora', title: 'Horario', flex: 1.1, render: (h) => <CellText>{h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}</CellText> },
    { key: 'cupo', title: 'Cupos', flex: 0.7, render: (h) => <CellText>{h.cupo_maximo}</CellText> },
    { key: 'inst', title: 'Instructor', flex: 1.4, render: (h) => <CellText muted={!h.entrenador}>{nombrePersona(h.entrenador) || 'Sin asignar'}</CellText> },
    { key: 'estado', title: 'Estado', flex: 0.9, render: (h) => <Badge text={h.activo ? 'Activo' : 'Pausado'} tone={h.activo ? 'success' : 'neutral'} /> },
    {
      key: 'acc', title: 'Acciones', flex: 1.4, render: (h) => (
        <Actions>
          <IconButton icon="create-outline" onPress={() => abrir(h)} tone="primary" label="Editar" />
          <IconButton icon={h.activo ? 'pause-outline' : 'play-outline'} onPress={() => alternar(h)} label={h.activo ? 'Pausar' : 'Activar'} />
          <IconButton icon="trash-outline" onPress={() => eliminar(h)} tone="danger" />
        </Actions>
      ),
    },
  ];

  return (
    <View>
      <ScreenHeader title="Gestión de Horarios" subtitle="Administrá los horarios disponibles del gimnasio"
        actionLabel="Nuevo Horario" onAction={() => abrir(null)} />
      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder="Buscar horario o instructor..." />
        <Select label="Día" value={filtroDia} onChange={setFiltroDia}
          options={[{ value: 'TODOS', label: 'Todos' }, ...DIAS.map((d) => ({ value: d, label: DIA_LABEL[d] }))]} />
        <Select label="Estado" value={filtroEstado} onChange={setFiltroEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activo' }, { value: 'PAUSADO', label: 'Pausado' }]} />
      </Toolbar>
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar}
        emptyIcon="time-outline" emptyText={horarios.length ? 'No hay horarios con esos filtros.' : 'Todavía no cargaste horarios.'} />

      <FormModal visible={!!form} title={form?.id ? 'Editar Horario' : 'Crear nuevo Horario'} onClose={() => setForm(null)}
        onSubmit={guardar} submitLabel="Guardar Horario" saving={saving}>
        {form && (
          <>
            <FieldLabel>Día de la semana</FieldLabel>
            <Select full label="Día de la semana" value={form.dia} onChange={(dia) => setForm({ ...form, dia })}
              options={DIAS.map((d) => ({ value: d, label: DIA_LABEL[d] }))} style={{ marginBottom: 12 }} />
            <FormRow>
              <FormField label="Hora inicio" placeholder="08:00" value={form.hora_inicio} error={errores.hora_inicio}
                onChangeText={(v) => setForm({ ...form, hora_inicio: v })} keyboardType="numbers-and-punctuation" />
              <FormField label="Hora fin" placeholder="09:00" value={form.hora_fin} error={errores.hora_fin}
                onChangeText={(v) => setForm({ ...form, hora_fin: v })} keyboardType="numbers-and-punctuation" />
            </FormRow>
            <FormRow>
              <FormField label="Cupos máximos" placeholder="15" value={form.cupo_maximo} error={errores.cupo_maximo}
                onChangeText={(v) => setForm({ ...form, cupo_maximo: v.replace(/\D/g, '') })} keyboardType="number-pad" />
              <View style={{ marginBottom: 12 }}>
                <FieldLabel>Instructor</FieldLabel>
                <Select full label="Instructor" value={form.entrenador_id ? String(form.entrenador_id) : ''}
                  onChange={(v) => setForm({ ...form, entrenador_id: v ? Number(v) : null })}
                  options={[{ value: '', label: 'Sin asignar' }, ...entrenadores.map((e) => ({ value: String(e.id), label: nombrePersona(e) }))]} />
              </View>
            </FormRow>
            <FieldLabel>Estado</FieldLabel>
            <SegmentToggle value={form.activo} onChange={(activo) => setForm({ ...form, activo })} options={[[true, 'Activo'], [false, 'Pausado']]} />
            <FormField label="Observaciones" placeholder="Ej. Traer toalla. Clase apta principiantes." multiline
              value={form.observaciones} error={errores.observaciones} onChangeText={(v) => setForm({ ...form, observaciones: v })} />
          </>
        )}
      </FormModal>
    </View>
  );
};
