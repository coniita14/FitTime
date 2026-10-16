import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { CustomButton } from '../CustomButton';

// Componentes reutilizables del panel de administración.

export const useAdminStyles = () => {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
};

export const ScreenHeader = ({ title, subtitle, actionLabel, onAction, actionIcon = 'add' }) => {
  const s = useAdminStyles();
  return (
    <View style={s.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.screenTitle}>{title}</Text>
        {subtitle ? <Text style={s.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <CustomButton title={actionLabel} iconName={actionIcon} size="sm" onPress={onAction} style={s.headerButton} />
      ) : null}
    </View>
  );
};

export const LoadingState = ({ text = 'Cargando…' }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={s.mutedText}>{text}</Text>
    </View>
  );
};

export const ErrorState = ({ message, onRetry }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.danger} />
      <Text style={[s.bodyText, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <CustomButton title="Reintentar" variant="outline" size="sm" onPress={onRetry} style={{ width: 160 }} /> : null}
    </View>
  );
};

export const EmptyState = ({ icon = 'file-tray-outline', text }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  return (
    <View style={s.centerBox}>
      <Ionicons name={icon} size={40} color={theme.colors.textMuted} />
      <Text style={s.mutedText}>{text}</Text>
    </View>
  );
};

export const Card = ({ children, style, muted }) => {
  const s = useAdminStyles();
  return <View style={[s.card, muted && s.cardMuted, style]}>{children}</View>;
};

export const Badge = ({ text, tone = 'neutral' }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  const colors = {
    neutral: theme.colors.textSecondary,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
    primary: theme.colors.primaryLight,
  };
  const c = colors[tone] || colors.neutral;
  return (
    <View style={[s.badge, { borderColor: c, backgroundColor: `${c}22` }]}>
      <Text style={[s.badgeText, { color: c }]}>{text}</Text>
    </View>
  );
};

export const IconButton = ({ icon, onPress, tone = 'neutral', label, disabled }) => {
  const { theme } = useTheme();
  const s = useAdminStyles();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primaryLight : theme.colors.textSecondary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[s.iconButton, disabled && { opacity: 0.4 }]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={18} color={color} />
      {label ? <Text style={[s.iconButtonText, { color }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

export const ChipSelector = ({ options, value, onChange, labels = {} }) => {
  const s = useAdminStyles();
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{labels[opt] || opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const FieldLabel = ({ children }) => {
  const s = useAdminStyles();
  return <Text style={s.fieldLabel}>{children}</Text>;
};

export const FormModal = ({ visible, title, onClose, onSubmit, submitLabel = 'Guardar', saving, children }) => {
  const s = useAdminStyles();
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {onSubmit ? (
            <View style={s.modalActions}>
              <CustomButton title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <CustomButton title={submitLabel} onPress={onSubmit} isLoading={saving} style={{ flex: 1 }} />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginBottom: theme.spacing.lg, flexWrap: 'wrap',
  },
  screenTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.heavy, color: theme.colors.textPrimary },
  screenSubtitle: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  headerButton: { width: 'auto', paddingHorizontal: theme.spacing.lg },
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl * 2, gap: theme.spacing.md },
  mutedText: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.sm, textAlign: 'center' },
  bodyText: { color: theme.colors.textPrimary, fontSize: theme.typography.sizes.md },
  card: {
    backgroundColor: theme.colors.cardBackground, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, marginBottom: theme.spacing.md,
  },
  cardMuted: { opacity: 0.55 },
  badge: { borderWidth: 1, borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.bold },
  iconButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  iconButtonText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  chip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, borderRadius: theme.borderRadius.full,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.medium },
  chipTextActive: { color: '#FFFFFF' },
  fieldLabel: {
    fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary, marginBottom: theme.spacing.xs,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalBox: {
    width: '100%', maxWidth: 520, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.textPrimary },
  modalActions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
});
