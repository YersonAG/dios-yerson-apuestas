// Configuración centralizada de la API
// Para Railway: Cambiar NEXT_PUBLIC_API_URL en Vercel a la URL de Railway

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const config = {
  apiUrl: API_URL,
  endpoints: {
    auth: {
      login: `${API_URL}/api/auth/login`,
      register: `${API_URL}/api/auth/register`,
      logout: `${API_URL}/api/auth/logout`,
      me: `${API_URL}/api/auth/me`,
    },
    chat: `${API_URL}/api/chat`,
    chatTake: `${API_URL}/api/chat/take`,
    bets: `${API_URL}/api/bets`,
    stats: `${API_URL}/api/stats`,
    history: `${API_URL}/api/history`,
  }
};

export default API_URL;
