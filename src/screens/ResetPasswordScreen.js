import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { useTheme } from '../context/ThemeContext';

export const ResetPasswordScreen = ({ route, navigation }) => {
  const { resetPassword } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const initialEmail = route?.params?.email || '';
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!initialEmail.trim()) {
      Alert.alert('Falta el correo', 'Vuelve a la pantalla anterior e ingresa el correo de tu cuenta.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Código inválido', 'Ingresa el código de verificación de seis dígitos.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Atención', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(initialEmail, code, password);
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido restablecida exitosamente. Ahora puedes ingresar con tus nuevas credenciales.',
        [
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('No se pudo cambiar la contraseña', error.message || 'Verifica el código e inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={36} color={theme.colors.success} />
          </View>
          <Text style={styles.title}>Nueva Contraseña</Text>
          <Text style={styles.subtitle}>
            {initialEmail
              ? `Ingresa el código enviado a ${initialEmail} y define tu nueva clave.`
              : 'Ingresa el código recibido y tu nueva contraseña.'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <CustomInput
            label="Código de Verificación (OTP)"
            placeholder="Ej. 123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            iconName="lock-open-outline"
            helperText="Código de 6 dígitos que recibiste"
          />

          <CustomInput
            label="Nueva Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            iconName="lock-closed-outline"
          />

          <CustomInput
            label="Confirmar Nueva Contraseña"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            iconName="checkmark-done-outline"
          />

          <View style={styles.passwordHint}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.passwordHintText}>
              La contraseña debe contener al menos 8 caracteres.
            </Text>
          </View>

          <CustomButton
            title="Restablecer Contraseña"
            onPress={handleResetPassword}
            isLoading={isLoading}
            size="lg"
            iconName="refresh-outline"
            style={styles.actionButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-circle-outline" size={20} color={theme.colors.primaryLight} />
            <Text style={styles.backToLoginText}>Cancelar y Volver al Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.glow,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.extrabold,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.lg,
    marginTop: -theme.spacing.xs,
  },
  passwordHintText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    flex: 1,
  },
  actionButton: {
    marginTop: theme.spacing.xs,
  },
  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToLoginText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primaryLight,
  },
});
