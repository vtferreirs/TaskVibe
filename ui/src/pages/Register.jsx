import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Kanban } from "lucide-react";
import api from "../services/api";
import ThemeToggle from "../components/ThemeToggle";
import AuthDecor from "../components/AuthDecor";
import "./Auth.css";

// Página de registro. Cria a conta via POST /usuario e, como o back-end
// já devolve token, já deixa o usuário logado (login automático).
export default function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "", // Apenas validação no front; não vai para a API
  });

  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (erro) setErro("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação mínima dos campos obrigatórios
    if (!formData.nome || !formData.email || !formData.senha || !formData.confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    // Senha e confirmação precisam bater antes de enviar
    if (formData.senha !== formData.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);

      // 1. Envia dados para o MongoDB
      const response = await api.post("/usuario", {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
      });

      // 2. Salva o usuário + token na sessão (localStorage)
      const { token, ...usuario } = response.data;
      localStorage.setItem("user", JSON.stringify(usuario));
      localStorage.setItem("token", token);

      // 3. Redireciona para o Dashboard
      navigate("/home");
    } catch (err) {
      // Exibe a mensagem do controller (ex: "Já existe uma conta cadastrada com este e-mail.")
      setErro(err.response?.data?.message || "Erro ao criar conta. Tente novamente.");
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
          <h1>Criar conta</h1>
          <p>Informe seus dados para acessar a plataforma</p>
        </div>

        {erro && <div className="auth-error">{erro}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nome">Nome completo</label>
            <input
              type="text"
              id="nome"
              name="nome"
              placeholder="Ex: Seu nome"
              value={formData.nome}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Ex: seu@email.com"
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
              placeholder=""
              value={formData.senha}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar senha</label>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              placeholder=""
              value={formData.confirmarSenha}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Já tem uma conta? <Link to="/login">Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}