import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Linking, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/cliente/ui';
import { FondoGimnasio } from '../../components/FondoGimnasio';
import { GIMNASIO } from '../../config/gimnasio';

const LOGO = require('../../../assets/icon.png');

// 1B · Bienvenida: foto del gimnasio de fondo, logo y una tarjeta translúcida
// con el mensaje y los accesos a login / registro (mismo estilo que el login).
export const BienvenidaScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const b = theme.brand;
  const insets = useSafeAreaInsets();

  const contactar = () => Linking.openURL(
    `mailto:${GIMNASIO.soporteEmail}?subject=${encodeURIComponent('Problemas para ingresar a FitTime')}`
  ).catch(() => {});

  return (
    <FondoGimnasio>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.marca}>
          <Image source={LOGO} style={s.logo} accessibilityLabel="Logo de FitTime" />
          <Text style={s.marcaNombre}>FitTime</Text>
          <Text style={s.marcaLema}>Tu entrenamiento, tu tiempo</Text>
        </View>

        <View style={[s.card, {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.80)',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(255, 255, 255, 0.9)',
        }]}
        >
          <Text style={[s.hello, { color: b.textSoft }]}>Bienvenido/a a</Text>
          <Text style={[s.title, { color: b.text }]}>FitTime</Text>
          <Text style={[s.sub, { color: b.textSoft }]}>Reservá tus turnos, seguí tus rutinas y alcanzá tus metas.</Text>

          <View style={{ gap: 12, marginTop: 24 }}>
            <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login', { tipo: 'CLIENTE' })} />
            <Button title="Crear una cuenta" variant="white" onPress={() => navigation.navigate('Signup')} />
            <TouchableOpacity onPress={() => navigation.navigate('Login', { tipo: 'ENTRENADOR' })} style={s.trainer}
              accessibilityRole="button" accessibilityLabel="Ingresar como entrenador">
              <Ionicons name="barbell-outline" size={16} color={b.primary} />
              <Text style={[s.trainerText, { color: b.primary }]}>¿Sos entrenador? Ingresá acá</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={contactar} style={{ alignItems: 'center', paddingVertical: 4 }}>
              <Text style={[s.support, { color: b.textSoft }]}>¿Problemas para ingresar? Contactar soporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </FondoGimnasio>
  );
};

const s = StyleSheet.create({
  content: {
    flexGrow: 1, justifyContent: 'space-between', gap: 32, paddingHorizontal: 20,
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },
  marca: { alignItems: 'center' },
  logo: { width: 84, height: 84, borderRadius: 22, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  marcaNombre: {
    color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 12,
    textShadowColor: 'rgba(2, 12, 40, 0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 },
  },
  marcaLema: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginTop: 4,
    textShadowColor: 'rgba(2, 12, 40, 0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 },
  },
  card: {
    borderRadius: 24, borderWidth: 1, padding: 24,
    ...Platform.select({
      web: { boxShadow: '0px 20px 50px rgba(2, 12, 40, 0.30)', backdropFilter: 'blur(10px)' },
      default: { elevation: 8, shadowColor: '#020C28', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
    }),
  },
  hello: { fontSize: 15 },
  title: { fontSize: 32, fontWeight: '900', marginVertical: 2 },
  sub: { fontSize: 15, lineHeight: 21 },
  support: { fontSize: 12, textDecorationLine: 'underline' },
  trainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  trainerText: { fontSize: 14, fontWeight: '700' },
});
