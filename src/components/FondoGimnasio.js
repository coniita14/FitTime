import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const VERTICAL = require('../../assets/fondo-gimnasio.jpg');
const HORIZONTAL = require('../../assets/fondo-gimnasio-ancho.jpg');

// Fondo con la foto del gimnasio difuminada y un velo azul.
// Usa la versión vertical en celulares y la horizontal en pantallas anchas (web),
// y la imagen se posiciona a pantalla completa para que no queden franjas vacías.
export const FondoGimnasio = ({ children, velo }) => {
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const ancho = width > height;
  return (
    <View style={s.root}>
      <Image source={ancho ? HORIZONTAL : VERTICAL} style={s.imagen} resizeMode="cover" accessible={false} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: velo || (isDark ? 'rgba(8, 15, 30, 0.62)' : 'rgba(23, 64, 150, 0.15)') }]} />
      {children}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1E3A6B', overflow: 'hidden' },
  imagen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
});
