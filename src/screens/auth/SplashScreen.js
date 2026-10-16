import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

// 1A · Splash: logo "FT", nombre, lema y puntos de carga animados.
export const SplashScreen = () => {
  const { theme } = useTheme();
  const b = theme.brand;
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const anims = dots.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 180),
      Animated.timing(v, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.3, duration: 380, useNativeDriver: true }),
      Animated.delay((2 - i) * 180),
    ])));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={[s.root, { backgroundColor: b.splash }]} accessibilityLabel="Cargando FitTime">
      <View style={s.center}>
        <View style={s.logo}><Text style={s.logoText}>FT</Text></View>
        <Text style={s.title}>FitTime</Text>
        <Text style={s.tagline}>Tu entrenamiento, tu tiempo</Text>
      </View>
      <View style={s.bottom}>
        <View style={s.dots}>
          {dots.map((v, i) => <Animated.View key={i} style={[s.dot, { opacity: v }]} />)}
        </View>
        <Text style={s.loading}>Cargando...</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { fontSize: 34, fontWeight: '800', color: '#1F2937' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  tagline: { fontSize: 14, color: '#EEF0FF', marginTop: 6 },
  bottom: { alignItems: 'center', paddingBottom: 70, gap: 10 },
  dots: { flexDirection: 'row', gap: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF' },
  loading: { color: '#E0E3FF', fontSize: 12 },
});
