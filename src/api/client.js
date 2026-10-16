import { API_CONFIG } from '../config/api.config';

class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (this.token && !headers.Authorization) {
      headers.Authorization = 'Bearer ' + this.token;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        const error = new Error(
          data?.message || data?.error || `Error en el servidor (${response.status})`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al conectar con el servidor.');
      }
      if (error.message === 'Network request failed' || error.message.includes('fetch')) {
        throw new Error(`No se pudo conectar con el servidor en ${this.baseUrl}. Verifica la conexión.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
