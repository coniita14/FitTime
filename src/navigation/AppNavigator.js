import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { useTheme } from '../context/ThemeContext';

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useTheme();
  
  // Navigation stack state for Auth screens
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [screenParams, setScreenParams] = useState({});
  const [history, setHistory] = useState(['Login']);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If user is authenticated with JWT token, show HomeScreen
  if (isAuthenticated) {
    // El rol viene de la base de datos (usuarios.rol); los permisos reales se validan con RLS.
    return user?.rol === 'ADMIN' ? <AdminScreen /> : <HomeScreen />;
  }

  // Navigation controller helper passed to auth screens
  const navigation = {
    navigate: (screenName, params = {}) => {
      setScreenParams(params);
      setCurrentScreen(screenName);
      setHistory((prev) => [...prev, screenName]);
    },
    goBack: () => {
      if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop();
        const prevScreen = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        setCurrentScreen(prevScreen);
      } else {
        setCurrentScreen('Login');
      }
    },
  };

  const route = {
    params: screenParams,
  };

  switch (currentScreen) {
    case 'Signup':
      return <SignupScreen navigation={navigation} route={route} />;
    case 'ForgotPassword':
      return <ForgotPasswordScreen navigation={navigation} route={route} />;
    case 'ResetPassword':
      return <ResetPasswordScreen navigation={navigation} route={route} />;
    case 'Login':
    default:
      return <LoginScreen navigation={navigation} route={route} />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
