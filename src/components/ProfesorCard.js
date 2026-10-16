import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { StatusBadge } from './StatusBadge';

export const ProfesorCard = ({ profesor, materiasDictadas = [], onPress }) => {
  const getInitials = (name) => {
    if (!name) return 'PR';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(profesor.nombre)}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {profesor.nombre || 'Sin nombre'}
          </Text>
          <StatusBadge label="Profesor" type="PROFESOR" />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {profesor.email}
          </Text>
        </View>

        {materiasDictadas.length > 0 ? (
          <View style={styles.subjectsRow}>
            <Ionicons name="school-outline" size={14} color={theme.colors.roleProfesor} />
            <Text style={styles.subjectsText}>
              {materiasDictadas.length} {materiasDictadas.length === 1 ? 'materia' : 'materias'} asignada(s)
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1.5,
    borderColor: theme.colors.roleProfesor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.roleProfesor,
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
  name: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  infoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  subjectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subjectsText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.roleProfesor,
    fontWeight: theme.typography.weights.medium,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
});
