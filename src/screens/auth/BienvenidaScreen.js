import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Linking, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/cliente/ui';
import { GIMNASIO } from '../../config/gimnasio';

const hero = require('../../../assets/bienvenida.jpg');

// 1B · Bienvenida: foto del gimnasio, mensaje y accesos a login / registro.
export const BienvenidaScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const b = theme.brand;
  const { height } = useWindowDimensions();

  const contactar = () => Linking.openURL(
    `mailto:${GIMNASIO.soporteEmail}?subject=${encodeURIComponent('Problemas para ingresar a FitTime')}`
  ).catch(() => {});

  return (
    <ScrollView style={{ flex: 1, backgroundColor: b.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Image source={hero} style={{ width: '100%', height: Math.max(240, height * 0.42) }} resizeMode="cover"
        accessibilityLabel="Sala de entrenamiento del gimnasio" />
      <View style={s.body}>
        <View>
          <Text style={[s.hello, { color: b.onBgSoft }]}>Bienvenido/a a</Text>
          <Text style={[s.title, { color: b.onBg }]}>FitTime</Text>
          <Text style={[s.sub, { color: b.onBgSoft }]}>Reservá tus turnos, seguí tus{'\n'}rutinas y alcanzá tus metas.</Text>
        </View>
        <View style={{ gap: 12 }}>
          <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login', { tipo: 'CLIENTE' })} />
          <Button title="Crear una cuenta" variant="white" onPress={() => navigation.navigate('Signup')} />
          <TouchableOpacity onPress={() => navigation.navigate('Login', { tipo: 'ENTRENADOR' })} style={s.trainer}
            accessibilityRole="button" accessibilityLabel="Ingresar como entrenador">
            <Ionicons name="barbell-outline" size={16} color={b.onBg} />
            <Text style={[s.trainerText, { color: b.onBg }]}>¿Sos entrenador? Ingresá acá</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={contactar} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={[s.support, { color: b.onBgSoft }]}>¿Problemas para ingresar? Contactar soporte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  body: { flex: 1, padding: 28, justifyContent: 'space-between', gap: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hello: { fontSize: 15 },
  title: { fontSize: 34, fontWeight: '900', marginVertical: 2 },
  sub: { fontSize: 15, lineHeight: 21 },
  support: { fontSize: 12, textDecorationLine: 'underline' },
  trainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  trainerText: { fontSize: 14, fontWeight: '700' },
});
