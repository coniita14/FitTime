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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';

export const LoginScreen = ({ navigation }) => {
  const { login, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contrasenia.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', error.message || 'Verifica tus credenciales e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert('No se pudo iniciar con Google', error.message || 'Inténtalo nuevamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>
            Fit<Text style={styles.brandAccent}>Time</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Gestion de Turnos y Entrenamiento</Text>
          <Text style={styles.brandTag}>Constanza Castillo - 6to Anio EPET N30</Text>
        </View>


        <View style={styles.card}>
          <Text style={styles.cardHeading}>Iniciar Sesion</Text>


          <CustomInput
            label="Correo Electronico"
            value={email}
            onChangeText={setEmail}
            placeholder="cliente@fittime.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <CustomInput
            label="Contrasenia"
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            secureTextEntry
          />


          <CustomButton
            title="Ingresar a FitTime"
            onPress={handleLogin}
            isLoading={loading}
          />

          <CustomButton
            title={googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
            onPress={handleGoogleLogin}
            isLoading={googleLoading}
            variant="outline"
          />

          <View style={styles.authLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.authLinkText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.authLinkText}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  brandAccent: {
    color: theme.colors.primaryLight,
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  brandTag: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  cardHeading: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickAccessBox: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    gap: 8,
  },
  authLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  authLinkText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  quickAccessTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnPill: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  btnPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});