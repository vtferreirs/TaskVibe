import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Kanban } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import AuthDecor from "../components/AuthDecor";
import "./Auth.css";

// Página de login. Chama POST /usuario/login e, em caso de sucesso,
// salva usuário + token no localStorage (o interceptor do axios usa o token).
export default function Login() {
  const navigate = useNavigate();

  // Campos do formulário, controlados pelo estado
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
  });

  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // Atualiza o campo digitado e limpa qualquer erro exibido
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (erro) setErro("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação mínima
    if (!formData.email || !formData.senha) {
      setErro("Preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/usuario/login", {
        email: formData.email,
        senha: formData.senha,
      });

      // A API devolve { ...usuario, token }
      const { token, ...usuario } = response.data;

      if (!token) {
        setErro("E-mail ou senha incorretos.");
        return;
      }

      // Persiste a sessão localmente e vai para a área logada
      localStorage.setItem("user", JSON.stringify(usuario));
      localStorage.setItem("token", token);
      navigate("/home");
    } catch (err) {
      // Mensagem vinda do back-end (ex.: "E-mail ou senha incorretos.")
      setErro(err.response?.data?.message || "Erro ao realizar login. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="aurora-bg" />
      <AuthDecor />
      <ThemeToggle floating />
      <div className="brand-logo">
        <div className="brand-icon">
          <Kanban size={20} />
        </div>
        Task<span>Vibe</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Entrar na conta</h1>
          <p>Digite suas credenciais para continuar</p>
        </div>

        {erro && <div className="auth-error">{erro}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              name="senha"
              placeholder="••••••••"
              value={formData.senha}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Ainda não tem uma conta? <Link to="/register">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}