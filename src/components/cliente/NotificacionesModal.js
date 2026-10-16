import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { clienteService } from '../../api/cliente.service';
import { mensajeDeError } from '../../utils/errores';

const ICONO = {
  CONFIRMACION_TURNO: { name: 'checkmark-circle', tone: 'success' },
  CANCELACION_TURNO: { name: 'close-circle', tone: 'danger' },
  RECORDATORIO_TURNO: { name: 'alarm', tone: 'warning' },
  RUTINA_ASIGNADA: { name: 'barbell', tone: 'primaryLight' },
  GENERAL: { name: 'megaphone', tone: 'primaryLight' },
};

const haceCuanto = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};

// Historial de notificaciones guardadas en la base (confirmaciones, cancelaciones, rutinas asignadas).
export const NotificacionesModal = ({ visible, onClose, onLeidas }) => {
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lista = await clienteService.listarNotificaciones();
      setItems(lista);
      if (lista.some((n) => !n.leida)) {
        await clienteService.marcarTodasLeidas();
        onLeidas?.();
      }
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las notificaciones.'));
    } finally {
      setLoading(false);
    }
  }, [onLeidas]);

  useEffect(() => { if (visible) cargar(); }, [visible, cargar]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Notificaciones</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar"><Ionicons name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
          {loading && <ActivityIndicator color={theme.colors.primaryLight} style={{ marginVertical: 24 }} />}
          {!loading && error && (
            <View style={s.empty}>
              <Text style={s.emptyText}>{error}</Text>
              <TouchableOpacity onPress={cargar}><Text style={s.retry}>Reintentar</Text></TouchableOpacity>
            </View>
          )}
          {!loading && !error && items.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={36} color={theme.colors.textMuted} />
              <Text style={s.emptyText}>No tenés notificaciones todavía.</Text>
            </View>
          )}
          {!loading && !error && (
            <ScrollView style={{ maxHeight: 460 }}>
              {items.map((n) => {
                const ic = ICONO[n.tipo] || ICONO.GENERAL;
                return (
                  <View key={n.id} style={[s.item, !n.leida && s.itemNew]}>
                    <Ionicons name={ic.name} size={24} color={theme.colors[ic.tone]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemTitle}>{n.titulo}</Text>
                      <Text style={s.itemText}>{n.mensaje}</Text>
                      <Text style={s.itemTime}>{haceCuanto(n.creada_en)}</Text>
                    </View>
                    {!n.leida && <View style={s.dot} />}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36,
    width: '100%', maxWidth: 560, alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: theme.colors.inputBackground },
  itemNew: { borderWidth: 1, borderColor: `${theme.colors.primary}88` },
  itemTitle: { color: theme.colors.textPrimary, fontWeight: '700' },
  itemText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  itemTime: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primaryLight, marginTop: 6 },
  empty: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center' },
  retry: { color: theme.colors.primaryLight, fontWeight: '600' },
});
