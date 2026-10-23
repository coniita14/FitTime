import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, DIAS, DIA_LABEL } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton, FormModal, FieldLabel,
  PrimaryButton, Card,
} from '../../components/admin/AdminUI';
import { NuevoUsuarioModal } from '../../components/admin/NuevoUsuarioModal';
import { nombrePersona } from './HorariosAdmin';

const DIA_CORTO = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };

// Gestión de Entrenadores (sólo admin): equipo, clases a cargo, alumnos y altas.
export const EntrenadoresAdmin = ({ busqueda = '', setBusqueda = () => {} }) => {
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('TODOS');
  const [nuevo, setNuevo] = useState(false);
  const [promover, setPromover] = useState(null); // { usuarioId }
  const [clases, setClases] = useState(null); // { entrenador, ids: Set }
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, h, u] = await Promise.all([adminService.entrenadores(), adminService.listarHorarios(), adminService.listarUsuarios(true)]);
      setItems(e || []);
      setHorarios(h);
      setClientes(u.filter((x) => x.activo));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los entrenadores.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarActivo = async (e) => {
    if (e.activo && !(await confirmar('Dar de baja', `${e.nombre} no podrá ingresar al panel hasta que lo reactives. Sus clases quedan asignadas.`, 'Dar de baja'))) return;
    try {
      await adminService.actualizarUsuario(e.id, { activo: !e.activo });
      await cargar();
    } catch (err) {
      avisar('No se pudo actualizar', mensajeDeError(err));
    }
  };

  const quitarRol = async (e) => {
    const ok = await confirmar('Quitar rol de entrenador',
      `${e.nombre} pasará a ser cliente. Sus ${e.clases.length} clases quedarán "sin asignar" y las rutinas que asignó se mantienen.`, 'Quitar rol');
    if (!ok) return;
    try {
      await adminService.asignarClases(e.id, []);
      await adminService.actualizarUsuario(e.id, { rol: 'CLIENTE' });
      await cargar();
    } catch (err) {
      avisar('No se pudo cambiar el rol', mensajeDeError(err));
    }
  };

  const guardarPromocion = async () => {
    if (!promover?.usuarioId) { avisar('Elegí un usuario', 'Seleccioná quién va a ser entrenador.'); return; }
    setSaving(true);
    try {
      await adminService.actualizarUsuario(Number(promover.usuarioId), { rol: 'ENTRENADOR' });
      setPromover(null);
      await cargar();
      avisar('Listo', 'El usuario ahora es entrenador. La próxima vez que inicie sesión va a ver el panel del entrenador.');
    } catch (err) {
      avisar('No se pudo asignar el rol', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const guardarClases = async () => {
    setSaving(true);
    try {
      await adminService.asignarClases(clases.entrenador.id, [...clases.ids]);
      setClases(null);
      await cargar();
    } catch (err) {
      avisar('No se pudieron asignar las clases', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleClase = (id) => {
    const ids = new Set(clases.ids);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    setClases({ ...clases, ids });
  };

  const q = busqueda.trim().toLowerCase();
  const filas = items
    .filter((e) => estado === 'TODOS' || (estado === 'ACTIVO' ? e.activo : !e.activo))
    .filter((e) => !q || `${e.nombre} ${e.apellido} ${e.email} ${e.telefono || ''}`.toLowerCase().includes(q));

  const columnas = [
    {
      key: 'nombre', title: 'Entrenador', flex: 1.9, render: (e) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {e.avatar_url ? <Image source={{ uri: e.avatar_url }} style={s.avatar} />
            : <View style={s.avatar}><Text style={s.avatarText}>{(e.nombre?.[0] || '?').toUpperCase()}</Text></View>}
          <View style={{ flexShrink: 1 }}>
            <CellText bold>{nombrePersona(e)}</CellText>
            <CellText muted small>{e.email}</CellText>
          </View>
        </View>
      ),
    },
    {
      key: 'clases', title: 'Clases a cargo', flex: 2, render: (e) => (e.clases.length ? (
        <View style={s.chips}>
          {e.clases.slice(0, 4).map((c) => (
            <Text key={c.id} style={[s.chip, !c.activo && { opacity: 0.5 }]}>{DIA_CORTO[c.dia]} {c.hora_inicio}</Text>
          ))}
          {e.clases.length > 4 && <Text style={s.chip}>+{e.clases.length - 4}</Text>}
        </View>
      ) : <CellText muted>Sin clases</CellText>),
    },
    { key: 'alumnos', title: 'Alumnos', flex: 0.8, render: (e) => <CellText>{e.alumnos}</CellText> },
    { key: 'rutinas', title: 'Rutinas', flex: 0.8, render: (e) => <CellText>{e.rutinas_creadas}</CellText> },
    { key: 'asist', title: 'Asist. mes', flex: 0.9, render: (e) => <CellText>{e.asistencias_mes}</CellText> },
    { key: 'estado', title: 'Estado', flex: 0.9, render: (e) => <Badge text={e.activo ? 'Activo' : 'De baja'} tone={e.activo ? 'success' : 'danger'} /> },
    {
      key: 'acc', title: 'Acciones', flex: 1.6, render: (e) => (
        <Actions>
          <IconButton icon="calendar-outline" label="Clases" tone="primary"
            onPress={() => setClases({ entrenador: e, ids: new Set(e.clases.map((c) => c.id)) })} />
          <IconButton icon={e.activo ? 'person-remove-outline' : 'person-add-outline'} tone={e.activo ? 'danger' : 'primary'}
            onPress={() => cambiarActivo(e)} label={e.activo ? undefined : 'Alta'} />
          <IconButton icon="arrow-undo-outline" onPress={() => quitarRol(e)} />
        </Actions>
      ),
    },
  ];

  const sinInstructor = horarios.filter((h) => !h.entrenador_id && h.activo).length;
  return (
    <View>
      <ScreenHeader title="Gestión de Entrenadores" subtitle={`${items.filter((e) => e.activo).length} entrenadores activos · ${sinInstructor} clases sin instructor`}
        actionLabel="Nuevo Entrenador" onAction={() => setNuevo(true)}>
        <PrimaryButton title="Desde un usuario" icon="swap-horizontal" variant="outline" onPress={() => setPromover({ usuarioId: '' })} />
      </ScreenHeader>
      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder="Buscar entrenador..." />
        <Select label="Estado" value={estado} onChange={setEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activos' }, { value: 'BAJA', label: 'De baja' }]} />
      </Toolbar>
      {sinInstructor > 0 && !loading && (
        <Card style={s.alert}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning} />
          <Text style={s.alertText}>Hay {sinInstructor} clases activas sin instructor. Asignalas con el botón "Clases" de cada entrenador.</Text>
        </Card>
      )}
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar}
        emptyIcon="medal-outline" emptyText={items.length ? 'No hay entrenadores que coincidan.' : 'Todavía no hay entrenadores. Creá uno con "+ Nuevo Entrenador".'} />

      {/* Al crear la cuenta se abre directamente la asignación de clases del nuevo entrenador */}
      <NuevoUsuarioModal visible={nuevo} onClose={() => setNuevo(false)} rolInicial="ENTRENADOR" bloquearRol
        onCreado={(u) => {
          cargar();
          if (u?.id) setClases({ entrenador: { ...u, clases: [] }, ids: new Set() });
        }} />

      <FormModal visible={!!promover} title="Convertir un usuario en entrenador" onClose={() => setPromover(null)}
        onSubmit={guardarPromocion} submitLabel="Hacer entrenador" saving={saving}>
        <FieldLabel>Usuario</FieldLabel>
        <Select full label="Usuario" placeholder="Elegí un cliente" value={promover?.usuarioId || ''}
          onChange={(usuarioId) => setPromover({ usuarioId })}
          options={clientes.map((c) => ({ value: String(c.id), label: `${nombrePersona(c)} · ${c.email}` }))} />
        <Text style={[s.hint, { marginTop: 10 }]}>Va a poder ver sus clases y alumnos, crear rutinas y ejercicios y asignar rutinas.</Text>
      </FormModal>

      <FormModal visible={!!clases} title={clases ? `Clases de ${nombrePersona(clases.entrenador)}` : ''} onClose={() => setClases(null)}
        onSubmit={guardarClases} submitLabel="Guardar clases" saving={saving} wide>
        {clases && (
          <>
            <Text style={[s.hint, { marginBottom: 12 }]}>Marcá los horarios que dicta. Si un horario ya tenía otro instructor, pasa a este.</Text>
            {DIAS.map((dia) => {
              const delDia = horarios.filter((h) => h.dia === dia);
              if (!delDia.length) return null;
              return (
                <View key={dia} style={{ marginBottom: 12 }}>
                  <Text style={s.dayTitle}>{DIA_LABEL[dia]}</Text>
                  <View style={s.chips}>
                    {delDia.map((h) => {
                      const sel = clases.ids.has(h.id);
                      const otro = h.entrenador_id && h.entrenador_id !== clases.entrenador.id ? nombrePersona(h.entrenador) : null;
                      return (
                        <TouchableOpacity key={h.id} onPress={() => toggleClase(h.id)} style={[s.slot, sel && s.slotActive, !h.activo && { opacity: 0.55 }]}
                          accessibilityRole="checkbox" accessibilityState={{ checked: sel }}>
                          <Ionicons name={sel ? 'checkbox' : 'square-outline'} size={16} color={sel ? '#FFF' : theme.colors.textSecondary} />
                          <View>
                            <Text style={[s.slotText, sel && { color: '#FFF' }]}>{h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}</Text>
                            {otro && !sel ? <Text style={s.slotSub}>{otro}</Text> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${theme.colors.primary}22`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontSize: 11, color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
  },
  hint: { color: theme.colors.textSecondary, fontSize: 12 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: theme.colors.warning, paddingVertical: 10 },
  alertText: { color: theme.colors.textPrimary, fontSize: 13, flex: 1 },
  dayTitle: { color: theme.colors.textSecondary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  slotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  slotText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 12 },
  slotSub: { color: theme.colors.textMuted, fontSize: 10 },
});
