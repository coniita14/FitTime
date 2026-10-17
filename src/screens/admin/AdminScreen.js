import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Modal, Pressable, Image, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { clienteService } from '../../api/cliente.service';
import { DashboardAdmin } from './DashboardAdmin';
import { TurnosAdmin } from './TurnosAdmin';
import { HorariosAdmin } from './HorariosAdmin';
import { RutinasAdmin } from './RutinasAdmin';
import { EjerciciosAdmin } from './EjerciciosAdmin';
import { UsuariosAdmin } from './UsuariosAdmin';
import { EntrenadoresAdmin } from './EntrenadoresAdmin';
import { ReportesAdmin } from './ReportesAdmin';
import { PerfilAdmin } from './PerfilAdmin';
import { DashboardEntrenador } from './DashboardEntrenador';
import { AsistenteBoton, AsistenteModal } from '../../components/AsistenteChat';

// Menú lateral (wireframes 3A–3E)
const SECCIONES = {
  ADMIN: [
    { key: 'inicio', label: 'Dashboard', icon: 'grid' },
    { key: 'horarios', label: 'Horarios', icon: 'time' },
    { key: 'rutinas', label: 'Rutinas', icon: 'barbell' },
    { key: 'ejercicios', label: 'Ejercicios', icon: 'body' },
    { key: 'usuarios', label: 'Usuarios', icon: 'people' },
    { key: 'entrenadores', label: 'Entrenadores', icon: 'medal' },
    { key: 'turnos', label: 'Turnos', icon: 'calendar' },
    { key: 'reportes', label: 'Reportes', icon: 'document-text' },
  ],
  // El entrenador ve sus clases, sus alumnos y el catálogo de rutinas/ejercicios
  ENTRENADOR: [
    { key: 'inicio', label: 'Dashboard', icon: 'grid' },
    { key: 'turnos', label: 'Mis clases', icon: 'calendar' },
    { key: 'usuarios', label: 'Alumnos', icon: 'people' },
    { key: 'rutinas', label: 'Rutinas', icon: 'barbell' },
    { key: 'ejercicios', label: 'Ejercicios', icon: 'body' },
  ],
};

const TITULOS = {
  inicio: 'Dashboard', horarios: 'Horarios', rutinas: 'Rutinas', ejercicios: 'Ejercicios', usuarios: 'Usuarios',
  entrenadores: 'Entrenadores', turnos: 'Turnos', reportes: 'Reportes', perfil: 'Mi perfil',
};

const nombreCompleto = (u) => `${u?.nombre || ''} ${u?.apellido && u.apellido !== '-' ? u.apellido : ''}`.trim();

export const AdminScreen = ({ rol = 'ADMIN' }) => {
  const esEntrenador = rol === 'ENTRENADOR';
  const secciones = SECCIONES[rol] || SECCIONES.ADMIN;
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const esAncho = width >= 900;
  const s = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [seccion, setSeccionState] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [avisos, setAvisos] = useState(null);
  const [verAsistente, setVerAsistente] = useState(false);

  const setSeccion = useCallback((k) => { setSeccionState(k); setBusqueda(''); setMenuAbierto(false); }, []);

  useEffect(() => {
    clienteService.contarNoLeidas().then(setNoLeidas).catch(() => {});
  }, [seccion]);

  const abrirAvisos = async () => {
    try {
      const lista = await clienteService.listarNotificaciones();
      setAvisos(lista || []);
      if (noLeidas) { await clienteService.marcarTodasLeidas(); setNoLeidas(0); }
    } catch {
      setAvisos([]);
    }
  };

  const props = { busqueda, setBusqueda, onNavigate: setSeccion };
  const contenido = {
    inicio: esEntrenador ? <DashboardEntrenador {...props} /> : <DashboardAdmin {...props} />,
    turnos: <TurnosAdmin modo={rol} {...props} />,
    horarios: <HorariosAdmin {...props} />,
    rutinas: <RutinasAdmin {...props} />,
    ejercicios: <EjerciciosAdmin {...props} />,
    usuarios: <UsuariosAdmin modo={rol} {...props} />,
    entrenadores: <EntrenadoresAdmin {...props} />,
    reportes: <ReportesAdmin {...props} />,
    perfil: <PerfilAdmin />,
  }[seccion];

  const titulo = esEntrenador && seccion === 'turnos' ? 'Mis clases'
    : esEntrenador && seccion === 'usuarios' ? 'Alumnos' : TITULOS[seccion];

  const Avatar = ({ size = 34 }) => (user?.avatar_url ? (
    <Image source={{ uri: user.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={s.avatarText}>{(user?.nombre || '?').charAt(0).toUpperCase()}</Text>
    </View>
  ));

  const Sidebar = () => (
    <View style={[s.sidebar, !esAncho && { paddingTop: insets.top + 16, width: 260, height: '100%' }]}>
      <View style={s.brandRow}>
        <Ionicons name="barbell" size={22} color="#FFF" />
        <Text style={s.brand}>FitTime {esEntrenador ? 'Entrenador' : 'Admin'}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
        {secciones.map((item) => {
          const activo = item.key === seccion;
          return (
            <TouchableOpacity key={item.key} onPress={() => setSeccion(item.key)} style={[s.sideItem, activo && s.sideItemActive]}
              accessibilityRole="tab" accessibilityState={{ selected: activo }}>
              <Ionicons name={activo ? item.icon : `${item.icon}-outline`} size={18} color="#FFF" />
              <Text style={[s.sideText, activo && { fontWeight: '800' }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={s.sideUser} onPress={() => setSeccion('perfil')} accessibilityLabel="Mi perfil">
        <Avatar size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.sideUserName} numberOfLines={1}>{nombreCompleto(user)}</Text>
          <Text style={s.sideUserMail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.root, { flexDirection: esAncho ? 'row' : 'column' }]}>
      {esAncho && <Sidebar />}

      <View style={{ flex: 1 }}>
        <View style={[s.topbar, { paddingTop: esAncho ? 12 : insets.top + 8 }]}>
          {!esAncho && (
            <TouchableOpacity onPress={() => setMenuAbierto(true)} accessibilityLabel="Abrir menú" style={s.topIcon}>
              <Ionicons name="menu" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={s.topTitle} numberOfLines={1}>{titulo}</Text>
          {esAncho && seccion !== 'inicio' && seccion !== 'perfil' && seccion !== 'reportes' && (
            <View style={s.topSearch}>
              <Ionicons name="search" size={15} color={theme.colors.textMuted} />
              <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar..." placeholderTextColor={theme.colors.textMuted}
                style={[s.topSearchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]} accessibilityLabel="Buscar en la sección" />
            </View>
          )}
          <TouchableOpacity onPress={toggleTheme} style={s.topIcon} accessibilityLabel={isDark ? 'Tema claro' : 'Tema oscuro'}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={abrirAvisos} style={s.topIcon} accessibilityLabel={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}>
            <Ionicons name="notifications-outline" size={21} color={theme.colors.textPrimary} />
            {noLeidas > 0 && <View style={s.dot}><Text style={s.dotText}>{noLeidas > 9 ? '9+' : noLeidas}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSeccion('perfil')} accessibilityLabel="Mi perfil">
            <Avatar size={32} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, esAncho && s.contentWide, { paddingBottom: 40 + insets.bottom }]}>
          {contenido}
        </ScrollView>
      </View>

      {!esAncho && (
        <Modal visible={menuAbierto} transparent animationType="fade" onRequestClose={() => setMenuAbierto(false)}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <Sidebar />
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} onPress={() => setMenuAbierto(false)} accessibilityLabel="Cerrar menú" />
          </View>
        </Modal>
      )}

      <AsistenteBoton onPress={() => setVerAsistente(true)} bottom={24 + insets.bottom} />
      <AsistenteModal visible={verAsistente} onClose={() => setVerAsistente(false)} />

      <Modal visible={!!avisos} transparent animationType="fade" onRequestClose={() => setAvisos(null)}>
        <Pressable style={s.overlay} onPress={() => setAvisos(null)}>
          <View style={s.avisosBox}>
            <Text style={s.avisosTitle}>Notificaciones</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {(avisos || []).length === 0 && <Text style={s.avisoMuted}>No tenés notificaciones.</Text>}
              {(avisos || []).map((n) => (
                <View key={n.id} style={s.aviso}>
                  <Text style={s.avisoTitulo}>{n.titulo}</Text>
                  <Text style={s.avisoMuted}>{n.mensaje}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const createStyles = (theme, isDark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: isDark ? theme.colors.background : '#EEF1F6' },
  sidebar: { width: 230, backgroundColor: isDark ? '#111B36' : '#4F86E0', paddingVertical: 18, paddingHorizontal: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, marginBottom: 22 },
  brand: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6 },
  sideItemActive: { backgroundColor: isDark ? '#5B54F0' : '#1F2937' },
  sideText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  sideUser: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, marginTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 4,
  },
  sideUserName: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  sideUserMail: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  avatar: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  avatarText: { color: '#FFF', fontWeight: '800' },
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  topSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.inputBackground, borderRadius: 6,
    paddingHorizontal: 10, minHeight: 34, width: 240,
  },
  topSearchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 13, paddingVertical: 6 },
  topIcon: { padding: 6 },
  dot: {
    position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.danger,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  dotText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  content: { padding: 16 },
  contentWide: { padding: 24, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', alignItems: 'flex-end', paddingTop: 64, paddingHorizontal: 16 },
  avisosBox: { width: '100%', maxWidth: 340, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  avisosTitle: { fontWeight: '800', fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 },
  aviso: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avisoTitulo: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 },
  avisoMuted: { color: theme.colors.textSecondary, fontSize: 12 },
});
