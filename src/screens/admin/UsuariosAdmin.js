import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, CATEGORIA_LABEL, ROL_LABEL } from '../../utils/dialogos';
import {
  ScreenHeader, Toolbar, SearchBox, Select, DataTable, CellText, Actions, Badge, IconButton,
  FieldLabel, FormModal, FormField,
} from '../../components/admin/AdminUI';
import { NuevoUsuarioModal } from '../../components/admin/NuevoUsuarioModal';
import { nombrePersona } from './HorariosAdmin';

const DESCRIPCION_ROL = {
  CLIENTE: 'Reserva turnos y sigue rutinas desde la app.',
  ENTRENADOR: 'Ve sus clases y alumnos, crea rutinas y ejercicios y asigna rutinas.',
  ADMIN: 'Acceso completo: horarios, usuarios, turnos, rutinas y estadísticas.',
};
const TONO_ROL = { ADMIN: 'warning', ENTRENADOR: 'success', CLIENTE: 'primary' };

// 3E · Gestión de Usuarios (admin) / Alumnos (entrenador)
export const UsuariosAdmin = ({ modo = 'ADMIN', busqueda = '', setBusqueda = () => {} }) => {
  const esEntrenador = modo === 'ENTRENADOR';
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroRutina, setFiltroRutina] = useState('TODOS');
  const [asignar, setAsignar] = useState(null); // { usuario, rutinaId, obs }
  const [rolForm, setRolForm] = useState(null); // { usuario, rol }
  const [nuevo, setNuevo] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([adminService.listarUsuarios(esEntrenador), adminService.listarRutinas()]);
      setUsuarios(u);
      setRutinas(r.filter((x) => x.activa));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  }, [esEntrenador]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarRol = async () => {
    const { usuario, rol } = rolForm;
    if (rol === usuario.rol) { setRolForm(null); return; }
    setSaving(true);
    try {
      await adminService.actualizarUsuario(usuario.id, { rol });
      setRolForm(null);
      await cargar();
      avisar('Rol actualizado', `${usuario.nombre} ahora es ${ROL_LABEL[rol].toLowerCase()}. El cambio se aplica la próxima vez que inicie sesión.`);
    } catch (err) {
      avisar('No se pudo cambiar el rol', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const cambiarActivo = async (u) => {
    if (u.activo && !(await confirmar('Dar de baja', `${u.nombre} no podrá reservar turnos hasta que lo reactives.`, 'Dar de baja'))) return;
    try {
      await adminService.actualizarUsuario(u.id, { activo: !u.activo });
      await cargar();
    } catch (err) {
      avisar('No se pudo actualizar', mensajeDeError(err));
    }
  };

  const guardarAsignacion = async () => {
    if (!asignar.rutinaId) { avisar('Elegí una rutina', 'Seleccioná la rutina que querés asignar.'); return; }
    setSaving(true);
    try {
      await adminService.asignarRutina(asignar.usuario.id, Number(asignar.rutinaId), asignar.obs);
      setAsignar(null);
      await cargar();
      avisar('Rutina asignada', 'El cliente recibirá una notificación en la app.');
    } catch (err) {
      avisar('No se pudo asignar', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  const rutinaDe = (u) => (u.rutina_asignada || []).find((ra) => ra.activa)?.rutinas;
  const q = busqueda.trim().toLowerCase();
  const filas = usuarios
    .filter((u) => filtroRol === 'TODOS' || u.rol === filtroRol)
    .filter((u) => filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVO' ? u.activo : !u.activo))
    .filter((u) => filtroRutina === 'TODOS' || (filtroRutina === 'CON' ? !!rutinaDe(u) : !rutinaDe(u)))
    .filter((u) => !q || `${u.nombre} ${u.apellido} ${u.email} ${u.telefono || ''}`.toLowerCase().includes(q));

  const columnas = [
    {
      key: 'nombre', title: esEntrenador ? 'Alumno' : 'Usuario', flex: 1.8, render: (u) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.avatar}><Text style={s.avatarText}>{(u.nombre?.[0] || '?').toUpperCase()}</Text></View>
          <View style={{ flexShrink: 1 }}>
            <CellText bold>{nombrePersona(u)}{u.id === user?.id ? ' (vos)' : ''}</CellText>
            <CellText muted small>{u.email}</CellText>
          </View>
        </View>
      ),
    },
    { key: 'tel', title: 'Teléfono', flex: 1, render: (u) => <CellText muted={!u.telefono}>{u.telefono || '—'}</CellText> },
    ...(esEntrenador ? [] : [{ key: 'rol', title: 'Rol', flex: 0.9, render: (u) => <Badge text={ROL_LABEL[u.rol]} tone={TONO_ROL[u.rol]} /> }]),
    {
      key: 'rutina', title: 'Rutina', flex: 1.3, render: (u) => (u.rol !== 'CLIENTE' ? <CellText muted>—</CellText>
        : <CellText muted={!rutinaDe(u)}>{rutinaDe(u)?.nombre || 'Sin rutina'}</CellText>),
    },
    { key: 'estado', title: 'Estado', flex: 0.8, render: (u) => <Badge text={u.activo ? 'Activo' : 'De baja'} tone={u.activo ? 'success' : 'danger'} /> },
    {
      key: 'acc', title: 'Acciones', flex: 1.6, render: (u) => {
        const soyYo = u.id === user?.id;
        return (
          <Actions>
            {u.rol === 'CLIENTE' && u.activo && (
              <IconButton icon="barbell-outline" label="Rutina" tone="primary"
                onPress={() => setAsignar({ usuario: u, rutinaId: rutinaDe(u)?.id ? String(rutinaDe(u).id) : '', obs: '' })} />
            )}
            {!esEntrenador && <IconButton icon="shield-outline" label="Rol" onPress={() => setRolForm({ usuario: u, rol: u.rol })} disabled={soyYo} />}
            {!esEntrenador && (
              <IconButton icon={u.activo ? 'person-remove-outline' : 'person-add-outline'} tone={u.activo ? 'danger' : 'primary'}
                onPress={() => cambiarActivo(u)} disabled={soyYo} />
            )}
          </Actions>
        );
      },
    },
  ];

  const clientesActivos = usuarios.filter((u) => u.rol === 'CLIENTE' && u.activo).length;
  return (
    <View>
      <ScreenHeader
        title={esEntrenador ? 'Mis Alumnos' : 'Gestión de Usuarios'}
        subtitle={esEntrenador ? 'Asigná y actualizá las rutinas de los clientes del gimnasio'
          : `${clientesActivos} clientes activos · ${usuarios.filter((u) => u.rol === 'ENTRENADOR').length} entrenadores · ${usuarios.filter((u) => u.rol === 'ADMIN').length} administradores`}
        actionLabel={esEntrenador ? null : 'Nuevo Usuario'}
        onAction={() => setNuevo(true)}
      />
      <Toolbar>
        <SearchBox value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre, correo o teléfono..." />
        {!esEntrenador && (
          <Select label="Rol" value={filtroRol} onChange={setFiltroRol}
            options={[{ value: 'TODOS', label: 'Todos' }, { value: 'CLIENTE', label: 'Clientes' }, { value: 'ENTRENADOR', label: 'Entrenadores' }, { value: 'ADMIN', label: 'Administradores' }]} />
        )}
        <Select label="Estado" value={filtroEstado} onChange={setFiltroEstado}
          options={[{ value: 'TODOS', label: 'Todos' }, { value: 'ACTIVO', label: 'Activos' }, { value: 'BAJA', label: 'De baja' }]} />
        <Select label="Rutina" value={filtroRutina} onChange={setFiltroRutina}
          options={[{ value: 'TODOS', label: 'Todas' }, { value: 'CON', label: 'Con rutina' }, { value: 'SIN', label: 'Sin rutina' }]} />
      </Toolbar>
      <DataTable columns={columnas} rows={filas} loading={loading} error={error} onRetry={cargar} pageSize={10}
        emptyIcon="people-outline" emptyText="No hay usuarios que coincidan." />

      <NuevoUsuarioModal visible={nuevo} onClose={() => setNuevo(false)} onCreado={cargar} />

      <FormModal visible={!!asignar} title={asignar ? `Asignar rutina a ${asignar.usuario.nombre}` : ''} onClose={() => setAsignar(null)}
        onSubmit={guardarAsignacion} submitLabel="Asignar rutina" saving={saving}>
        {asignar && (
          <>
            <FieldLabel>Rutina</FieldLabel>
            <Select full label="Rutina" placeholder="Elegí una rutina" value={asignar.rutinaId} style={{ marginBottom: 12 }}
              onChange={(rutinaId) => setAsignar({ ...asignar, rutinaId })}
              options={rutinas.map((r) => ({ value: String(r.id), label: `${r.nombre} · ${CATEGORIA_LABEL[r.categoria]}` }))} />
            <FormField label="Indicaciones para el cliente (opcional)" placeholder="Ej. Subir la carga cada 2 semanas" multiline
              value={asignar.obs} onChangeText={(obs) => setAsignar({ ...asignar, obs })} />
            <Text style={s.hint}>Si ya tenía una rutina, se reemplaza por esta. El cliente recibe una notificación.</Text>
          </>
        )}
      </FormModal>

      <FormModal visible={!!rolForm} title={rolForm ? `Rol de ${rolForm.usuario.nombre}` : ''} onClose={() => setRolForm(null)}
        onSubmit={guardarRol} submitLabel="Guardar rol" saving={saving}>
        {rolForm && (
          <View style={{ gap: 8 }}>
            {['CLIENTE', 'ENTRENADOR', 'ADMIN'].map((r) => {
              const activo = rolForm.rol === r;
              return (
                <TouchableOpacity key={r} onPress={() => setRolForm({ ...rolForm, rol: r })} style={[s.option, activo && s.optionActive]}
                  accessibilityState={{ selected: activo }}>
                  <Text style={[s.optName, activo && { color: '#FFFFFF' }]}>{ROL_LABEL[r]}</Text>
                  <Text style={[s.hint, activo && { color: '#E0E7FF' }]}>{DESCRIPCION_ROL[r]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.primary}22`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary, fontWeight: '800' },
  hint: { color: theme.colors.textSecondary, fontSize: 12 },
  option: { padding: 12, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
  optionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  optName: { color: theme.colors.textPrimary, fontWeight: '700' },
});
