import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { FondoGimnasio } from '../../components/FondoGimnasio';

// Estructura común de Login / Registro / Recuperar:
// foto del gimnasio difuminada de fondo, tarjeta translúcida centrada con un
// ícono circular arriba, título y subtítulo.
export const AuthLayout = ({ title, subtitle, onBack, icon = 'person', children }) => {
  const { theme, isDark } = useTheme();
  const b = theme.brand;
  const insets = useSafeAreaInsets();
  return (
    <FondoGimnasio>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Volver">
              <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
              <Text style={s.backText}>Volver</Text>
            </TouchableOpacity>
          ) : null}

          <View style={[s.card, {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.74)',
            borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(255, 255, 255, 0.9)',
          }]}
          >
            <View style={[s.avatar, { backgroundColor: b.primary, borderColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
              <Ionicons name={icon} size={30} color="#FFFFFF" />
            </View>
            <Text style={[s.title, { color: b.text }]}>{title}</Text>
            {subtitle ? <Text style={[s.subtitle, { color: b.textSoft }]}>{subtitle}</Text> : null}
            <View style={{ marginTop: 22 }}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </FondoGimnasio>
  );
};

const s = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, width: '100%', maxWidth: 480, alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 44, alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  card: {
    borderRadius: 24, borderWidth: 1, paddingHorizontal: 22, paddingBottom: 26, paddingTop: 52,
    ...Platform.select({
      web: { boxShadow: '0px 20px 50px rgba(2, 12, 40, 0.30)', backdropFilter: 'blur(10px)' },
      default: { elevation: 8, shadowColor: '#020C28', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
    }),
  },
  avatar: {
    position: 'absolute', top: -38, alignSelf: 'center', width: 76, height: 76, borderRadius: 38, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
});
