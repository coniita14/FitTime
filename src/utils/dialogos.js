import { Alert, Platform } from 'react-native';

// Alert.alert no hace nada en React Native Web: en el navegador usamos window.alert/confirm.

export const avisar = (titulo, mensaje = '') => {
  if (Platform.OS === 'web') {
    window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export const confirmar = (titulo, mensaje, textoAceptar = 'Aceptar') =>
  new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${titulo}\n\n${mensaje}`));
      return;
    }
    Alert.alert(titulo, mensaje, [
      { text: 'Volver', style: 'cancel', onPress: () => resolve(false) },
      { text: textoAceptar, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

export const fechaLocal = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIA_LABEL = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
  VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};
export const CATEGORIAS = ['FUERZA', 'CARDIO', 'TREN_SUPERIOR', 'TREN_INFERIOR', 'CUERPO_COMPLETO', 'MOVILIDAD'];
export const CATEGORIA_LABEL = {
  FUERZA: 'Fuerza', CARDIO: 'Cardio', TREN_SUPERIOR: 'Tren superior',
  TREN_INFERIOR: 'Tren inferior', CUERPO_COMPLETO: 'Cuerpo completo', MOVILIDAD: 'Movilidad',
};
export const NIVELES = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'];
export const NIVEL_LABEL = { PRINCIPIANTE: 'Principiante', INTERMEDIO: 'Intermedio', AVANZADO: 'Avanzado' };
export const ESTADO_LABEL = {
  CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', COMPLETADO: 'Asistió', AUSENTE: 'Ausente',
};
