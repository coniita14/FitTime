import { apiClient } from './client';
import { API_CONFIG } from '../config/api.config';

export const authService = {
  /**
   * Inicia sesión en el backend
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, message: string, token: string}>}
   */
  async login(email, password) {
    const data = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    return data;
  },

  /**
   * Registra un nuevo usuario (ALUMNO o PROFESOR)
   * @param {Object} userData
   * @param {string} userData.nombre
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {'ALUMNO' | 'PROFESOR'} userData.rol
   */
  async signup({ nombre, email, password, rol = 'ALUMNO' }) {
    const data = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
      nombre,
      email,
      password,
      rol,
    });
    return data;
  },
};
