import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../api/admin.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar, CATEGORIA_LABEL } from '../../utils/dialogos';
import { CustomInput } from '../../components/CustomInput';
import {
  ScreenHeader, LoadingState, ErrorState, EmptyState, Card, Badge, IconButton, ChipSelector, FieldLabel, FormModal,
} from '../../components/admin/AdminUI';

export const UsuariosAdmin = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = createStyles(theme);
  const [usuarios, setUsuarios] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('CLIENTE');
  const [asignar, setAsignar] = useState(null); // { usuario, rutinaId, obs }
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([adminService.listarUsuarios(), adminService.listarRutinas()]);
      setUsuarios(u);
      setRutinas(r.filter((x) => x.activa));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarRol = async (u) => {
    const nuevo = u.rol === 'ADMIN' ? 'CLIENTE' : 'ADMIN';
    const texto = nuevo === 'ADMIN'
      ? `${u.nombre} podrá gestionar horarios, rutinas, usuarios y turnos.`
      : `${u.nombre} dejará de tener acceso al panel de administración.`;
    if (!(await confirmar(nuevo === 'ADMIN' ? 'Hacer administrador' : 'Quitar administrador', texto, 'Confirmar'))) return;
    try {
      await adminService.actualizarUsuario(u.id, { rol: nuevo });
      await cargar();
    } catch (err) {
      avisar('No se pudo cambiar el rol', mensajeDeError(err));
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
      await adminService.asignarRutina(asignar.usuario.id, asignar.rutinaId, asignar.obs);
      setAsignar(null);
      await cargar();
      avisar('Rutina asignada', 'El cliente recibirá una notificación en la app.');
    } catch (err) {
      avisar('No se pudo asignar', mensajeDeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={cargar} />;

  const q = busqueda.trim().toLowerCase();
  const visibles = usuarios
    .filter((u) => filtro === 'TODOS' || u.rol === filtro)
    .filter((u) => !q || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q));

  return (
    <View>
      <ScreenHeader title="Usuarios" subtitle={`${usuarios.filter((u) => u.rol === 'CLIENTE' && u.activo).length} clientes activos`} />
      <CustomInput placeholder="Buscar por nombre o correo" value={busqueda} onChangeText={setBusqueda} iconName="search-outline" />
      <ChipSelector options={['CLIENTE', 'ADMIN', 'TODOS']} labels={{ CLIENTE: 'Clientes', ADMIN: 'Administradores', TODOS: 'Todos' }} value={filtro} onChange={setFiltro} />

      {visibles.length === 0 && <EmptyState icon="people-outline" text="No hay usuarios que coincidan." />}

      {visibles.map((u) => {
        const rutinaActiva = (u.rutina_asignada || []).find((ra) => ra.activa)?.rutinas;
        const soyYo = u.id === user?.id;
        return (
          <Card key={u.id} muted={!u.activo} style={s.row}>
            <View style={s.avatar}><Text style={s.avatarText}>{(u.nombre?.[0] || '?').toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={s.name}>{u.nombre} {u.apellido !== '-' ? u.apellido : ''} {soyYo ? '(vos)' : ''}</Text>
              <Text style={s.meta}>{u.email}{u.telefono ? ` · ${u.telefono}` : ''}</Text>
              <View style={s.badges}>
                <Badge text={u.rol === 'ADMIN' ? 'Administrador' : 'Cliente'} tone={u.rol === 'ADMIN' ? 'warning' : 'primary'} />
                {!u.activo && <Badge text="De baja" tone="danger" />}
                {u.rol === 'CLIENTE' && <Badge text={rutinaActiva ? `Rutina: ${rutinaActiva.nombre}` : 'Sin rutina'} tone={rutinaActiva ? 'success' : 'neutral'} />}
              </View>
            </View>
            <View style={s.actions}>
              {u.rol === 'CLIENTE' && u.activo && (
                <IconButton icon="barbell-outline" label="Rutina" tone="primary"
                  onPress={() => setAsignar({ usuario: u, rutinaId: rutinaActiva?.id || null, obs: '' })} />
              )}
              <IconButton icon="shield-outline" label={u.rol === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'} onPress={() => cambiarRol(u)} disabled={soyYo} />
              <IconButton icon={u.activo ? 'person-remove-outline' : 'person-add-outline'} label={u.activo ? 'Baja' : 'Alta'}
                tone={u.activo ? 'danger' : 'primary'} onPress={() => cambiarActivo(u)} disabled={soyYo} />
            </View>
          </Card>
        );
      })}

      <FormModal
        visible={!!asignar}
        title={asignar ? `Asignar rutina a ${asignar.usuario.nombre}` : ''}
        onClose={() => setAsignar(null)}
        onSubmit={guardarAsignacion}
        submitLabel="Asignar"
        saving={saving}
      >
        {asignar && (
          <>
            <FieldLabel>Rutina</FieldLabel>
            <View style={{ gap: 6, marginBottom: theme.spacing.md }}>
              {rutinas.map((r) => {
                const activo = asignar.rutinaId === r.id;
                return (
                  <TouchableOpacity key={r.id} onPress={() => setAsignar({ ...asignar, rutinaId: r.id })} style={[s.option, activo && s.optionActive]}>
                    <Text style={[s.name, activo && { color: '#FFFFFF' }]}>{r.nombre}</Text>
                    <Text style={[s.meta, activo && { color: '#E0F2FE' }]}>{CATEGORIA_LABEL[r.categoria]} · {r.objetivo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <CustomInput label="Indicaciones para el cliente (opcional)" placeholder="Ej. Subir la carga cada 2 semanas"
              value={asignar.obs} onChangeText={(obs) => setAsignar({ ...asignar, obs })} autoCapitalize="sentences" />
          </>
        )}
      </FormModal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}33`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: theme.colors.primaryLight, fontWeight: '800', fontSize: 18 },
  name: { color: theme.colors.textPrimary, fontWeight: '700' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  option: {
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
  },
  optionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
});
