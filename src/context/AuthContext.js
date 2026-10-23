import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, supabaseConfigError } from '../config/supabase';

const AuthContext = createContext();

const PERFIL_COLUMNAS = 'id, nombre, apellido, email, rol, telefono, activo, avatar_url, notificaciones_activas, recordatorio_minutos, creado_en';

WebBrowser.maybeCompleteAuthSession();

const getProfile = async (authUser) => {
  if (supabaseConfigError) throw new Error(supabaseConfigError);
  const { data, error } = await supabase
    .from('usuarios')
    .select(PERFIL_COLUMNAS)
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se encontró el perfil. Verifica que init_fittime.sql esté instalado en Supabase.');
  }
  return { ...data, authId: authUser.id };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // true si en esta apertura de la app la persona ya se identificó con contraseña o Google
  // (en ese caso no se le pide Face ID enseguida; ver BloqueoBiometrico).
  const [ingresoConClave, setIngresoConClave] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setToken(session?.access_token || null);
      if (event === 'SIGNED_OUT') { setUser(null); setIngresoConClave(false); }
    });

    const restoreSession = async () => {
      if (Platform.OS === 'web') {
        const callback = new URL(window.location.href);
        const code = callback.searchParams.get('code');
        const errorGoogle = callback.searchParams.get('error_description');
        if (errorGoogle) {
          window.history.replaceState({}, document.title, callback.pathname);
          window.alert(`No se pudo iniciar con Google\n\n${decodeURIComponent(errorGoogle.replace(/\+/g, ' '))}`);
          throw new Error('Inicio con Google cancelado o rechazado.');
        }
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, document.title, callback.pathname);
        }
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        const profile = await getProfile(data.session.user);
        if (mounted) {
          setToken(data.session.access_token);
          setUser(profile);
        }
      }
    };

    restoreSession().catch((error) => {
      console.error('No se pudo restaurar el perfil:', error);
    }).finally(() => {
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // rolEsperado: el tipo de cuenta que la persona eligió en el login (CLIENTE, ENTRENADOR o ADMIN).
  // Si no coincide con el rol guardado en la base, se cierra la sesión y no se entra.
  const login = async (email, password, rolEsperado) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    const profile = await getProfile(data.user);
    if (rolEsperado && profile.rol !== rolEsperado) {
      await supabase.auth.signOut();
      const sugerencia = {
        CLIENTE: 'Esta es una cuenta de cliente. Elegí "Cliente" para ingresar.',
        ENTRENADOR: 'Esta es una cuenta de entrenador. Elegí "Entrenador" para ingresar.',
        ADMIN: 'Esta es una cuenta de administrador. Usá "Acceso administrador", abajo de todo.',
      };
      throw new Error(sugerencia[profile.rol] || 'El tipo de cuenta elegido no coincide con tu usuario.');
    }
    if (!profile.activo) {
      await supabase.auth.signOut();
      throw new Error('Tu cuenta está dada de baja. Consultá en el gimnasio.');
    }
    setIngresoConClave(true);
    setToken(data.session.access_token);
    setUser(profile);
    return profile;
  };

  const signup = async ({ nombre, apellido = '', telefono = '', email, password }) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { nombre: nombre.trim(), apellido: apellido.trim(), telefono: telefono.trim() } },
    });
    if (error) throw error;
    if (data.session && data.user) {
      const profile = await getProfile(data.user);
      setIngresoConClave(true);
      setToken(data.session.access_token);
      setUser(profile);
    }
    return { needsEmailConfirmation: !data.session };
  };

  const loginWithGoogle = async () => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    // Web: vuelve a la misma página. Móvil: fittime://auth/callback en el APK y
    // exp://<ip>:8081/--/auth/callback en Expo Go (Linking.createURL arma la correcta).
    const redirectTo = Platform.OS === 'web'
      ? window.location.origin
      : Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Supabase no devolvió la dirección de inicio con Google.');

    if (Platform.OS === 'web') {
      window.location.assign(data.url);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return;
    const callback = new URL(result.url);
    const code = callback.searchParams.get('code');
    if (code) {
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) throw sessionError;
      if (!sessionData.user || !sessionData.session) throw new Error('Google no devolvió una sesión válida.');
      setIngresoConClave(true);
      setToken(sessionData.session.access_token);
      setUser(await getProfile(sessionData.user));
      return;
    }

    const params = new URLSearchParams(callback.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      throw new Error('No se recibió una sesión de Google. Comprueba la URL de redirección de Supabase.');
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) throw sessionError;
    if (!sessionData.user || !sessionData.session) throw new Error('Google no devolvió una sesión válida.');
    setIngresoConClave(true);
    setToken(sessionData.session.access_token);
    setUser(await getProfile(sessionData.user));
  };

  const requestPasswordReset = async (email) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw error;
  };

  const resetPassword = async (email, code, password) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    });
    if (verifyError) throw verifyError;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  };

  const updateProfile = async ({ nombre, apellido, telefono }) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    if (!user?.id) throw new Error('No se encontró el perfil autenticado.');
    const { data, error } = await supabase
      .from('usuarios')
      .update({ nombre: nombre.trim(), apellido: apellido.trim(), telefono: (telefono || '').trim() || null })
      .eq('id', user.id)
      .select(PERFIL_COLUMNAS)
      .single();
    if (error) throw error;
    setUser({ ...data, authId: user.authId });
  };

  const changePassword = async (password, passwordActual) => {
    if (supabaseConfigError) throw new Error(supabaseConfigError);
    if (passwordActual !== undefined) {
      // Verifica la contraseña actual antes de cambiarla (pantalla 3D).
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordActual });
      if (authError) throw new Error('La contraseña actual no es correcta.');
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  // Actualiza campos del perfil en memoria (por ejemplo, la foto o las preferencias ya guardadas).
  const patchUser = (cambios) => setUser((prev) => (prev ? { ...prev, ...cambios } : prev));

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token && !!user,
        ingresoConClave,
        login,
        signup,
        loginWithGoogle,
        requestPasswordReset,
        resetPassword,
        updateProfile,
        changePassword,
        patchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
