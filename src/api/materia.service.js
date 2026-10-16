import { apiClient } from './client';
import { API_CONFIG } from '../config/api.config';

export const materiaService = {
  /**
   * Obtiene todas las materias registradas
   * Requiere token Bearer
   */
  async getMaterias() {
    return await apiClient.get(API_CONFIG.ENDPOINTS.MATERIAS.ALL);
  },

  /**
   * Obtiene una materia por su ID
   * @param {string} id 
   */
  async getMateriaById(id) {
    return await apiClient.get(API_CONFIG.ENDPOINTS.MATERIAS.BY_ID(id));
  },

  /**
   * Obtiene las materias que dicta un profesor
   * @param {string} profesorId 
   */
  async getMateriasPorProfesor(profesorId) {
    return await apiClient.get(API_CONFIG.ENDPOINTS.MATERIAS.BY_PROFESOR(profesorId));
  },

  /**
   * Crea una nueva materia (Requiere rol PROFESOR o ADMIN)
   * @param {{ nombre: string, profesor_id?: string }} data
   */
  async createMateria(data) {
    return await apiClient.post(API_CONFIG.ENDPOINTS.MATERIAS.CREATE, data);
  },

  /**
   * Actualiza una materia existente (Requiere rol PROFESOR o ADMIN)
   * @param {string} id
   * @param {{ nombre?: string, profesor_id?: string }} data
   */
  async updateMateria(id, data) {
    return await apiClient.put(API_CONFIG.ENDPOINTS.MATERIAS.UPDATE(id), data);
  },

  /**
   * Elimina una materia (borrado lógico) (Requiere rol PROFESOR o ADMIN)
   * @param {string} id
   */
  async deleteMateria(id) {
    return await apiClient.delete(API_CONFIG.ENDPOINTS.MATERIAS.DELETE(id));
  },
};
