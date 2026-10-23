import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { BienvenidaScreen } from '../screens/auth/BienvenidaScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { RecuperarScreen } from '../screens/auth/RecuperarScreen';
import { ClienteApp } from '../screens/cliente/ClienteApp';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { BloqueoBiometrico } from '../components/BloqueoBiometrico';

const PANTALLAS_ACCESO = {
  Bienvenida: BienvenidaScreen,
  Login: LoginScreen,
  Signup: SignupScreen,
  ForgotPassword: RecuperarScreen,
};

// Flujo del workframe: Splash → Bienvenida → Iniciar sesión / Registrarse →
// menú principal según el rol guardado en la base (usuarios.rol):
//   CLIENTE → app móvil · ENTRENADOR → panel del entrenador · ADMIN → panel del gimnasio.
export const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashMinimo, setSplashMinimo] = useState(true);
  const [pila, setPila] = useState([{ name: 'Bienvenida', params: {} }]);

  useEffect(() => {
    const t = setTimeout(() => setSplashMinimo(false), 1400);
    return () => clearTimeout(t);
  }, []);

  // Al cerrar sesión se vuelve a la bienvenida
  useEffect(() => {
    if (!isAuthenticated) setPila([{ name: 'Bienvenida', params: {} }]);
  }, [isAuthenticated]);

  if (isLoading || splashMinimo) return <SplashScreen />;

  if (isAuthenticated) {
    if (user?.rol === 'ADMIN') return <AdminScreen rol="ADMIN" />;
    if (user?.rol === 'ENTRENADOR') return <AdminScreen rol="ENTRENADOR" />;
    // El cliente tiene que pasar por Face ID / huella cada vez que entra a la cuenta
    return <BloqueoBiometrico key={user?.id}><ClienteApp /></BloqueoBiometrico>;
  }

  const navigation = {
    navigate: (name, params = {}) => setPila((prev) => {
      const existente = prev.findIndex((p) => p.name === name);
      if (existente >= 0) return [...prev.slice(0, existente), { name, params }];
      return [...prev, { name, params }];
    }),
    goBack: () => setPila((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
  };
  const actual = pila[pila.length - 1];
  const Pantalla = PANTALLAS_ACCESO[actual.name] || BienvenidaScreen;
  return <Pantalla navigation={navigation} route={{ params: actual.params }} />;
};
