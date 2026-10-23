import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, AppState, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FondoGimnasio } from './FondoGimnasio';

const LOGO = require('../../assets/icon.png');
const MINUTOS_EN_SEGUNDO_PLANO = 1; // si la app estuvo cerrada/minimizada más que esto, se vuelve a pedir

// Protege la app del cliente con Face ID / huella / código del celular.
// Se pide cada vez que se entra a la cuenta: al abrir la app con la sesión guardada
// y al volver a la app después de un rato. Justo después de iniciar sesión con
// contraseña o Google no se pide (la persona ya se identificó).
// En la web no hay biometría, así que no se aplica.
export const BloqueoBiometrico = ({ children }) => {
  const { theme, isDark } = useTheme();
  const b = theme.brand;
  const { user, logout, ingresoConClave } = useAuth();
  const [bloqueado, setBloqueado] = useState(Platform.OS !== 'web' && !ingresoConClave);
  const [metodo, setMetodo] = useState({ nombre: 'Face ID', icono: 'scan-outline' });
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const enCurso = useRef(false);
  const salidaEn = useRef(null);

  const desbloquear = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setVerificando(true);
    setError('');
    try {
      const nivel = await LocalAuthentication.getEnrolledLevelAsync();
      if (nivel === LocalAuthentication.SecurityLevel.NONE) {
        // El celular no tiene ni biometría ni código configurado: no hay con qué verificar.
        setBloqueado(false);
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingresá a FitTime',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar código del celular',
        disableDeviceFallback: false,
      });
      if (r.success) {
        setBloqueado(false);
      } else if (!['user_cancel', 'system_cancel', 'app_cancel'].includes(r.error)) {
        setError(r.error === 'lockout'
          ? 'Demasiados intentos. Desbloqueá el celular con tu código y volvé a probar.'
          : 'No pudimos verificar que seas vos. Probá de nuevo.');
      }
    } catch {
      setError('No se pudo usar la verificación del celular. Probá de nuevo.');
    } finally {
      enCurso.current = false;
      setVerificando(false);
    }
  }, []);

  // Nombre e ícono según lo que tenga el celular (Face ID, reconocimiento facial o huella)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    LocalAuthentication.supportedAuthenticationTypesAsync().then((tipos) => {
      const T = LocalAuthentication.AuthenticationType;
      if (tipos.includes(T.FACIAL_RECOGNITION)) {
        setMetodo({ nombre: Platform.OS === 'ios' ? 'Face ID' : 'reconocimiento facial', icono: 'scan-outline' });
      } else if (tipos.includes(T.FINGERPRINT)) {
        setMetodo({ nombre: Platform.OS === 'ios' ? 'Touch ID' : 'tu huella', icono: 'finger-print' });
      } else {
        setMetodo({ nombre: 'el código del celular', icono: 'keypad-outline' });
      }
    }).catch(() => {});
  }, []);

  // Al abrir bloqueado, pide la verificación sola
  useEffect(() => {
    if (bloqueado) desbloquear();
  }, [bloqueado, desbloquear]);

  // Volver a la app después de un rato también la bloquea
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') salidaEn.current = Date.now();
      if (estado === 'active' && salidaEn.current) {
        const fuera = Date.now() - salidaEn.current;
        salidaEn.current = null;
        if (fuera > MINUTOS_EN_SEGUNDO_PLANO * 60 * 1000 && !enCurso.current) setBloqueado(true);
      }
    });
    return () => sub.remove();
  }, []);

  if (!bloqueado) return children;

  return (
    <FondoGimnasio>
      <View style={s.centro}>
        <View style={[s.card, {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.80)' : 'rgba(255, 255, 255, 0.82)',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(255, 255, 255, 0.9)',
        }]}
        >
          <Image source={LOGO} style={s.logo} />
          <Text style={[s.titulo, { color: b.text }]}>Hola{user?.nombre ? `, ${user.nombre}` : ''}</Text>
          <Text style={[s.sub, { color: b.textSoft }]}>Para entrar a tu cuenta, verificá que seas vos con {metodo.nombre}.</Text>

          <TouchableOpacity onPress={desbloquear} disabled={verificando} style={[s.boton, { backgroundColor: b.primary }]}
            accessibilityRole="button" accessibilityLabel={`Desbloquear con ${metodo.nombre}`}>
            {verificando ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name={metodo.icono} size={22} color="#FFF" />
                <Text style={s.botonTexto}>Desbloquear</Text>
              </>
            )}
          </TouchableOpacity>
          {error ? <Text style={[s.error, { color: b.danger }]}>{error}</Text> : null}

          <TouchableOpacity onPress={() => logout().catch(() => {})} style={s.otra} accessibilityRole="button">
            <Text style={[s.otraTexto, { color: b.primary }]}>Ingresar con otra cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FondoGimnasio>
  );
};

const s = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center' },
  card: {
    borderRadius: 24, borderWidth: 1, padding: 26, alignItems: 'center',
    elevation: 8, shadowColor: '#020C28', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 },
  },
  logo: { width: 76, height: 76, borderRadius: 20, marginBottom: 14 },
  titulo: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  boton: {
    marginTop: 22, alignSelf: 'stretch', minHeight: 52, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  botonTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  error: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  otra: { marginTop: 16, paddingVertical: 6 },
  otraTexto: { fontWeight: '700', fontSize: 14 },
});
