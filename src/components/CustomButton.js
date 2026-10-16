import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const CustomButton = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  iconName,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const getContainerStyle = () => {
    const base = [styles.button];

    // Sizes
    if (size === 'sm') base.push(styles.sizeSm);
    if (size === 'md') base.push(styles.sizeMd);
    if (size === 'lg') base.push(styles.sizeLg);

    // Variants
    switch (variant) {
      case 'primary':
        base.push(styles.primary);
        break;
      case 'secondary':
        base.push(styles.secondary);
        break;
      case 'outline':
        base.push(styles.outline);
        break;
      case 'danger':
        base.push(styles.danger);
        break;
      case 'ghost':
        base.push(styles.ghost);
        break;
      default:
        base.push(styles.primary);
    }

    if (disabled || isLoading) {
      base.push(styles.disabled);
    }

    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text];

    if (size === 'sm') base.push(styles.textSm);
    if (size === 'md') base.push(styles.textMd);
    if (size === 'lg') base.push(styles.textLg);

    switch (variant) {
      case 'outline':
        base.push(styles.textOutline);
        break;
      case 'ghost':
        base.push(styles.textGhost);
        break;
      case 'danger':
        base.push(styles.textDanger);
        break;
      default:
        base.push(styles.textPrimary);
    }

    return base;
  };

  const iconColor =
    variant === 'outline' || variant === 'ghost'
      ? theme.colors.primary
      : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={size === 'sm' ? 16 : 20}
              color={iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons
              name={iconName}
              size={size === 'sm' ? 16 : 20}
              color={iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme) => StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sizes
  sizeSm: {
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    minHeight: 38,
  },
  sizeMd: {
    paddingVertical: theme.spacing.md - 2,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 52,
  },
  sizeLg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 58,
  },
  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    boxShadow: `0px 4px 8px ${theme.colors.primary}4D`,
    elevation: 4,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  // Typography
  text: {
    fontWeight: theme.typography.weights.semibold,
  },
  textSm: {
    fontSize: theme.typography.sizes.sm,
  },
  textMd: {
    fontSize: theme.typography.sizes.md,
  },
  textLg: {
    fontSize: theme.typography.sizes.lg,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: theme.colors.primary,
  },
  textGhost: {
    color: theme.colors.primaryLight,
  },
  textDanger: {
    color: '#FFFFFF',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});
