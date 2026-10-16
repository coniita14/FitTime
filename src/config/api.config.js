import { Platform } from "react-native";

// Tu IP local de Wi-Fi en la computadora actual:
// Nota: Si cambias de red Wi-Fi, actualiza esta IP con la que te dé `ipconfig`.
const DEV_MACHINE_IP = "172.16.3.24";
const DEV_PORT = "3000";

const getDevBaseUrl = () => {
  // Permite sobreescribir con variable de entorno (ej. en archivo .env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // En navegador Web en tu misma computadora:
  if (Platform.OS === "web") {
    return `http://localhost:${DEV_PORT}`;
  }

  // En celular físico (Expo Go) o emulador:
  return `http://${DEV_MACHINE_IP}:${DEV_PORT}`;
};

export const API_CONFIG = {
  BASE_URL: getDevBaseUrl(),
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/usuarios/login",
      REGISTER: "/usuarios",
    },
    USERS: {
      ALL: "/usuarios",
      BY_ID: (id) => `/usuarios/${id}`,
      UPDATE: (id) => `/usuarios/${id}`,
      DELETE: (id) => `/usuarios/${id}`,
    },
    MATERIAS: {
      ALL: "/materias",
      BY_ID: (id) => `/materias/${id}`,
      CREATE: "/materias",
      UPDATE: (id) => `/materias/${id}`,
      DELETE: (id) => `/materias/${id}`,
      BY_PROFESOR: (id) => `/dictan/${id}`,
    },
    INSCRIPCIONES: {
      ALL: "/alumno-materia",
      INSCRIBIR: "/cursan",
    },
    HEALTH: "/health",
  },
};
