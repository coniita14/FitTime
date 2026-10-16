import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { DashboardAdmin } from './DashboardAdmin';
import { TurnosAdmin } from './TurnosAdmin';
import { HorariosAdmin } from './HorariosAdmin';
import { RutinasAdmin } from './RutinasAdmin';
import { EjerciciosAdmin } from './EjerciciosAdmin';
import { UsuariosAdmin } from './UsuariosAdmin';
import { PerfilAdmin } from './PerfilAdmin';

const SECCIONES = [
  { key: 'inicio', label: 'Inicio', icon: 'stats-chart' },
  { key: 'turnos', label: 'Turnos', icon: 'calendar' },
  { key: 'horarios', label: 'Horarios', icon: 'time' },
  { key: 'rutinas', label: 'Rutinas', icon: 'barbell' },
  { key: 'ejercicios', label: 'Ejercicios', icon: 'body' },
  { key: 'usuarios', label: 'Usuarios', icon: 'people' },
  { key: 'perfil', label: 'Perfil', icon: 'person-circle' },
];

// Panel del administrador: barra lateral en pantallas anchas (web/tablet)
// y barra inferior desplazable en el celular.
export const AdminScreen = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const esAncho = width >= 900;
  const s = useMemo(() => createStyles(theme), [theme]);
  const [seccion, setSeccion] = useState('inicio');

  const contenido = {
    inicio: <DashboardAdmin onNavigate={setSeccion} />,
    turnos: <TurnosAdmin />,
    horarios: <HorariosAdmin />,
    rutinas: <RutinasAdmin />,
    ejercicios: <EjerciciosAdmin />,
    usuarios: <UsuariosAdmin />,
    perfil: <PerfilAdmin />,
  }[seccion];

  const NavItem = ({ item, vertical }) => {
    const activo = item.key === seccion;
    const color = activo ? theme.colors.primaryLight : theme.colors.textMuted;
    return (
      <TouchableOpacity
        onPress={() => setSeccion(item.key)}
        style={vertical ? [s.sideItem, activo && s.sideItemActive] : s.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: activo }}
      >
        <Ionicons name={activo ? item.icon : `${item.icon}-outline`} size={vertical ? 20 : 22} color={color} />
        <Text style={[vertical ? s.sideText : s.tabText, { color }, activo && { fontWeight: '700' }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { flexDirection: esAncho ? 'row' : 'column', paddingTop: esAncho ? 0 : insets.top }]}>
      {esAncho ? (
        <View style={s.sidebar}>
          <Text style={s.brand}>Fit<Text style={{ color: theme.colors.primaryLight }}>Time</Text></Text>
          <Text style={s.brandSub}>Panel del gimnasio</Text>
          {SECCIONES.map((item) => <NavItem key={item.key} item={item} vertical />)}
          <View style={{ flex: 1 }} />
          <Text style={s.sideUser} numberOfLines={1}>{user?.nombre} {user?.apellido !== '-' ? user?.apellido : ''}</Text>
          <Text style={s.sideRole}>Administrador</Text>
        </View>
      ) : (
        <View style={s.mobileHeader}>
          <Text style={s.brand}>Fit<Text style={{ color: theme.colors.primaryLight }}>Time</Text></Text>
          <Text style={s.brandSub}>Panel del gimnasio</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, esAncho && s.contentWide]}>
        {contenido}
      </ScrollView>

      {!esAncho && (
        <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-around' }}>
            {SECCIONES.map((item) => <NavItem key={item.key} item={item} />)}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  sidebar: {
    width: 240, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border,
    padding: theme.spacing.xl, gap: 4,
  },
  brand: { fontSize: 26, fontWeight: '900', color: theme.colors.textPrimary },
  brandSub: { fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.lg },
  sideItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.md,
  },
  sideItemActive: { backgroundColor: `${theme.colors.primary}22` },
  sideText: { fontSize: theme.typography.sizes.md },
  sideUser: { color: theme.colors.textPrimary, fontWeight: '600' },
  sideRole: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.xs },
  mobileHeader: {
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl * 2 },
  contentWide: { padding: theme.spacing.xxl, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  tabBar: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingTop: 6 },
  tabItem: { alignItems: 'center', paddingHorizontal: 2, minWidth: 52 },
  tabText: { fontSize: 10, marginTop: 2 },
});
