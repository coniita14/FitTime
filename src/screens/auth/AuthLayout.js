import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

// Estructura común de Login / Registro / Recuperar: fondo azul, "← Volver", título y subtítulo.
export const AuthLayout = ({ title, subtitle, onBack, children }) => {
  const { theme } = useTheme();
  const b = theme.brand;
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: b.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={16} color={b.onBgSoft} />
            <Text style={[s.backText, { color: b.onBgSoft }]}>Volver</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={[s.title, { color: b.onBg }]}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: b.onBgSoft }]}>{subtitle}</Text> : null}
        <View style={{ marginTop: 24 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  content: { padding: 28, paddingBottom: 48, width: '100%', maxWidth: 520, alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28, alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6 },
});
