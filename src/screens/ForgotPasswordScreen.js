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

export const ForgotPasswordScreen = ({ navigation }) => {
  const { requestPasswordReset } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendInstructions = async () => {
    if (!email.trim()) {
      Alert.alert('Atención', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Correo inválido', 'Revisa el formato del correo electrónico.');
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setIsSent(true);
      Alert.alert(
        'Correo enviado',
        `Si la cuenta existe, Supabase enviará las instrucciones de recuperación a ${email}.`,
        [
          {
            text: 'Ingresar código',
            onPress: () => navigation.navigate('ResetPassword', { email }),
          },
        ]
      );
    } catch (error) {
      Alert.alert('No se pudo enviar el correo', error.message || 'Inténtalo nuevamente.');
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
            <Ionicons name="key-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.subtitle}>
            No te preocupes. Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecerla.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <CustomInput
            label="Correo Electrónico Registrado"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="mail-outline"
            helperText="Te enviaremos un código de seguridad de 6 dígitos"
          />

          <CustomButton
            title={isSent ? "Código Reenviado" : "Enviar Código de Recuperación"}
            onPress={handleSendInstructions}
            isLoading={isLoading}
            size="lg"
            iconName="paper-plane-outline"
            style={styles.actionButton}
          />

          <TouchableOpacity
            style={styles.hasCodeButton}
            onPress={() => navigation.navigate('ResetPassword', { email })}
            activeOpacity={0.7}
          >
            <Text style={styles.hasCodeText}>
              ¿Ya tienes un código? <Text style={styles.hasCodeLink}>Ingrésalo aquí</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-circle-outline" size={20} color={theme.colors.primaryLight} />
            <Text style={styles.backToLoginText}>Volver a Iniciar Sesión</Text>
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
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
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
  actionButton: {
    marginTop: theme.spacing.sm,
  },
  hasCodeButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  hasCodeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  hasCodeLink: {
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primaryLight,
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
