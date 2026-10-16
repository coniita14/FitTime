import { apiClient } from './client';
import { API_CONFIG } from '../config/api.config';

export const userService = {
  /**
   * Obtiene todos los usuarios
   * Requiere token Bearer
   */
  async getAllUsers() {
    return await apiClient.get(API_CONFIG.ENDPOINTS.USERS.ALL);
  },

  /**
   * Obtiene un usuario específico por ID
   * @param {string} id 
   */
  async getUserById(id) {
    return await apiClient.get(API_CONFIG.ENDPOINTS.USERS.BY_ID(id));
  },

  /**
   * Obtiene únicamente los profesores filtrando por rol
   */
  async getProfesores() {
    const users = await this.getAllUsers();
    if (!Array.isArray(users)) return [];
    return users.filter((u) => u.rol === 'PROFESOR');
  },
};
