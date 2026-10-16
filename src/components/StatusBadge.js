import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export const StatusBadge = ({ label, type = 'default' }) => {
  const getBadgeStyle = () => {
    switch (type.toUpperCase()) {
      case 'ALUMNO':
        return {
          bg: theme.colors.roleAlumnoBg,
          text: theme.colors.roleAlumno,
          border: 'rgba(56, 189, 248, 0.3)',
        };
      case 'PROFESOR':
        return {
          bg: theme.colors.roleProfesorBg,
          text: theme.colors.roleProfesor,
          border: 'rgba(168, 85, 247, 0.3)',
        };
      case 'SUCCESS':
        return {
          bg: theme.colors.successBackground,
          text: theme.colors.success,
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'WARNING':
        return {
          bg: theme.colors.warningBackground,
          text: theme.colors.warning,
          border: 'rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          text: theme.colors.primaryLight,
          border: 'rgba(99, 102, 241, 0.3)',
        };
    }
  };

  const styleConfig = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: styleConfig.bg,
          borderColor: styleConfig.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: styleConfig.text }]}>
        {label || type}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs - 1,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
