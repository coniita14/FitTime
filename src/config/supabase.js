import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigError =
  !configuredUrl ||
  !configuredKey ||
  configuredUrl.includes('your-project') ||
  configuredKey.includes('your-supabase')
    ? 'Configura la URL y la clave publicable de Supabase en el archivo .env.'
    : !/^(sb_publishable_|eyJ)/.test(configuredKey)
      ? 'La clave de Supabase del archivo .env no es válida: debe empezar con "sb_publishable_". Copiala de Project Settings → API Keys y reiniciá con "npx expo start -c".'
      : null;

const supabaseUrl = configuredUrl || 'https://TU-PROYECTO.supabase.co';
const supabaseAnonKey = configuredKey || 'TU_CLAVE_PUBLICABLE';

const authStorage = {
  getItem: (key) => Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key),
  setItem: (key, value) => Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  removeItem: (key) => Platform.OS === 'web'
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
