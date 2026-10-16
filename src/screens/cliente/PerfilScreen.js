import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Card, Field, Button, SectionTitle, useBrand } from '../../components/cliente/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';
import { avisar, confirmar } from '../../utils/dialogos';

const TEL_RE = /^\+?[\d\s-]{8,20}$/;

// 3C · Perfil: foto, estadísticas, información personal, preferencias y salir.
export const PerfilScreen = ({ navigation, campana }) => {
  const b = useBrand();
  const s = useMemo(() => createStyles(b), [b]);
  const { user, updateProfile, patchUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido === '-' ? '' : user?.apellido || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    clienteService.estadisticasPerfil().then(setStats).catch(() => setStats({ turnos: '-', guardadas: '-' }));
  }, []);

  const semanas = user?.creado_en ? Math.max(1, Math.ceil((Date.now() - new Date(user.creado_en).getTime()) / (7 * 864e5))) : 1;
  const iniciales = `${(user?.nombre || '?')[0]}${user?.apellido && user.apellido !== '-' ? user.apellido[0] : ''}`.toUpperCase();

  const guardar = async () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!apellido.trim()) e.apellido = 'El apellido es obligatorio';
    if (telefono.trim() && !TEL_RE.test(telefono.trim())) e.telefono = 'Teléfono inválido (ej. +54 9 2944 123456)';
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      await updateProfile({ nombre, apellido, telefono });
      avisar('Cambios guardados', 'Tus datos se actualizaron correctamente.');
    } catch (err) {
      avisar('No se pudieron guardar los cambios', mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) { avisar('Permiso necesario', 'Habilitá el acceso a tus fotos para elegir una imagen.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      if (r.canceled || !r.assets?.length) return;
      setSubiendo(true);
      const url = await clienteService.subirAvatar(user.id, user.authId, r.assets[0]);
      patchUser({ avatar_url: url });
    } catch (err) {
      avisar('No se pudo cambiar la foto', mensajeDeError(err));
    } finally {
      setSubiendo(false);
    }
  };

  const preferencia = async (cambios, anterior) => {
    patchUser(cambios);
    try { await clienteService.guardarPreferencias(user.id, cambios); } catch (err) {
      patchUser(anterior);
      avisar('No se pudo guardar la preferencia', mensajeDeError(err));
    }
  };

  const salir = async () => {
    if (!(await confirmar('Cerrar sesión', '¿Querés salir de FitTime?', 'Cerrar sesión'))) return;
    logout().catch((err) => avisar('No se pudo cerrar sesión', mensajeDeError(err)));
  };

  return (
    <Screen title="Perfil" right={campana} contentStyle={{ paddingTop: 0 }}>
      <View style={s.top}>
        <TouchableOpacity onPress={cambiarFoto} disabled={subiendo} style={s.avatar} accessibilityLabel="Cambiar foto de perfil">
          {subiendo ? <ActivityIndicator color={b.primary} />
            : user?.avatar_url ? <Image source={{ uri: user.avatar_url }} style={s.avatarImg} />
              : <Text style={s.initials}>{iniciales}</Text>}
          <View style={s.pencil}><Ionicons name="pencil" size={12} color="#FFF" /></View>
        </TouchableOpacity>
        <Text style={s.name}>{user?.nombre} {user?.apellido !== '-' ? user?.apellido : ''}</Text>
      </View>

      <View style={s.stats}>
        {[[stats?.turnos, 'Turnos'], [stats?.guardadas, 'Rutinas'], [semanas, 'Semanas']].map(([v, l]) => (
          <View key={l} style={s.stat}>
            <Text style={s.statValue}>{v ?? '…'}</Text>
            <Text style={s.statLabel}>{l}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>Información Personal</SectionTitle>
      <Field label="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" rightIcon="create-outline" maxLength={100} error={errores.nombre} />
      <Field label="Apellido" value={apellido} onChangeText={setApellido} autoCapitalize="words" rightIcon="create-outline" maxLength={100} error={errores.apellido} />
      <Field label="Email" value={user?.email} editable={false} rightIcon="lock-closed-outline" />
      <Field label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" rightIcon="create-outline" maxLength={20} error={errores.telefono} />
      <Button title="Guardar cambios" onPress={guardar} loading={guardando} />
      <Button title="Cambiar contraseña" variant="white" onPress={() => navigation.navigate('CambiarClave')} style={{ marginTop: 10 }} />

      <SectionTitle style={{ marginTop: 22 }}>Preferencias</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <View style={s.pref}>
          <Ionicons name="moon-outline" size={20} color={b.primary} />
          <Text style={s.prefText}>Tema oscuro</Text>
          <Switch value={isDark} onValueChange={() => toggleTheme().catch(() => {})} trackColor={{ true: b.primary }} />
        </View>
        <View style={[s.pref, s.prefBorder]}>
          <Ionicons name="notifications-outline" size={20} color={b.primary} />
          <Text style={s.prefText}>Recordatorios de turnos</Text>
          <Switch value={user?.notificaciones_activas !== false} trackColor={{ true: b.primary }}
            onValueChange={(v) => preferencia({ notificaciones_activas: v }, { notificaciones_activas: !v })} />
        </View>
        {user?.notificaciones_activas !== false && (
          <View style={s.reminders}>
            <Text style={s.small}>Avisarme antes:</Text>
            {[30, 60, 120].map((m) => {
              const activo = (user?.recordatorio_minutos || 60) === m;
              return (
                <TouchableOpacity key={m} onPress={() => preferencia({ recordatorio_minutos: m }, { recordatorio_minutos: user?.recordatorio_minutos })}
                  style={[s.remChip, activo && { backgroundColor: b.primary }]}>
                  <Text style={[s.small, activo && { color: '#FFF', fontWeight: '700' }]}>{m < 60 ? `${m} min` : `${m / 60} h`}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={[s.pref, s.prefBorder]}>
          <Ionicons name="notifications-circle-outline" size={20} color={b.primary} />
          <Text style={s.prefText}>Notificaciones recibidas</Text>
          {campana}
        </View>
      </Card>

      <Button title="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={salir} style={{ marginTop: 6 }} />
    </Screen>
  );
};

const createStyles = (b) => StyleSheet.create({
  top: { backgroundColor: b.card, marginHorizontal: -16, alignItems: 'center', paddingTop: 18, paddingBottom: 16, marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: b.cardSoft, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  initials: { fontSize: 28, fontWeight: '800', color: b.textSoft },
  pencil: {
    position: 'absolute', right: -2, bottom: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: b.warning,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: b.card,
  },
  name: { color: b.text, fontWeight: '800', fontSize: 16, marginTop: 10 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  stat: { flex: 1, backgroundColor: b.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statValue: { color: b.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: b.textSoft, fontSize: 12 },
  pref: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  prefBorder: { borderTopWidth: 1, borderTopColor: b.border },
  prefText: { flex: 1, color: b.text, fontWeight: '600' },
  reminders: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, flexWrap: 'wrap' },
  small: { color: b.textSoft, fontSize: 12 },
  remChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: b.cardSoft },
});
