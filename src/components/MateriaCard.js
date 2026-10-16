import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export const MateriaCard = ({
  materia,
  profesorName,
  onPress,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Ionicons name="book-outline" size={24} color={theme.colors.primaryLight} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {materia.nombre}
          </Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>ID: {materia.id ? String(materia.id).slice(0, 6) : '---'}</Text>
          </View>
        </View>

        <View style={styles.profesorRow}>
          <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.profesorText} numberOfLines={1}>
            {profesorName ? `Prof. ${profesorName}` : 'Profesor Asignado'}
          </Text>
        </View>

        {materia.created_at && (
          <View style={styles.footerRow}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.dateText}>
              {new Date(materia.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {canManage ? (
        <View style={styles.actionsContainer}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionBtnEdit}
              onPress={(e) => {
                e?.stopPropagation?.();
                onEdit(materia);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primaryLight} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionBtnDelete}
              onPress={(e) => {
                e?.stopPropagation?.();
                onDelete(materia);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  codeBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  codeText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  profesorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  profesorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: theme.spacing.sm,
  },
  actionBtnEdit: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  actionBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
});
