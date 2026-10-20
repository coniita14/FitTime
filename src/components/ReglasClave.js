import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reglasClave } from '../utils/clave';

// Lista de requisitos de la contraseña que se van tildando mientras se escribe.
export const ReglasClave = ({ clave, color, colorPendiente, style }) => (
  <View style={[s.lista, style]} accessibilityLabel="Requisitos de la contraseña">
    {reglasClave(clave).map((r) => (
      <View key={r.texto} style={s.fila}>
        <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.ok ? color : colorPendiente} />
        <Text style={[s.texto, { color: r.ok ? color : colorPendiente }]}>{r.texto}</Text>
      </View>
    ))}
  </View>
);

const s = StyleSheet.create({
  lista: { gap: 4, marginTop: -4, marginBottom: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  texto: { fontSize: 12 },
});
