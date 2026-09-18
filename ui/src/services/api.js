import axios from "axios";

// Instância única do Axios usada por toda a aplicação.
// Centraliza a baseURL da API e os interceptors de autenticação,
// para que nenhum componente precise repetir header/tratamento de erro.
const api = axios.create({
  baseURL: "http://localhost:3001",
});

// Interceptor de REQUEST: roda antes de toda chamada.
// Se existir um token no localStorage, anexa "Authorization: Bearer <token>"
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de RESPONSE: roda após toda resposta (sucesso ou erro).
// Erro 401 = sessão inválida/expirada -> limpa as credenciais salvas
// e força o usuário de volta à tela de login.
api.interceptors.response.use(
  (response) => response, // Sucesso: repassa a resposta normalmente
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      // Evita redirecionar se o usuário já está em uma tela pública
      if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;