import { Link, NavLink, useNavigate } from "react-router-dom";
import { Kanban, Layout, Share2, BarChart2, Settings, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

// Barra de navegação superior, presente em todas as páginas.
// Mostra marca, links de navegação (apenas logado), tema claro/escuro
// e o estado de autenticação (avatar/nome + sair ou entrar/criar conta).
export default function Navbar({ user }) {
  const navigate = useNavigate();
  const logado = Boolean(user);

  const handleLogout = () => {
    // Remove as credenciais e volta para a tela de login
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <Link to="/home" className="navbar-logo">
          <div className="navbar-icon">
            <Kanban size={20} />
          </div>
          Task<span>Vibe</span>
        </Link>

        {/* Links de navegação só fazem sentido para usuário autenticado */}
        {logado && (
          <nav className="navbar-links">
            <NavLink to="/dashboard" className="nav-item">
              <Layout size={18} /> Quadros
            </NavLink>
            <NavLink to="/compartilhados" className="nav-item">
              <Share2 size={18} /> Compartilhados
            </NavLink>
            <NavLink to="/reports" className="nav-item">
              <BarChart2 size={18} /> Relatórios
            </NavLink>
            <NavLink to="/settings" className="nav-item">
              <Settings size={18} /> Configurações
            </NavLink>
          </nav>
        )}
      </div>

      <div className="navbar-right">
        {logado ? (
          <>
            {user?.foto_perfil ? (
              <img className="navbar-avatar" src={user.foto_perfil} alt="Foto de perfil" />
            ) : null}
            <span className="user-name">Olá, {user?.nome || "Usuário"}</span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={16} /> Sair
            </button>
          </>
        ) : (
          <>
            {/* Visitante não logado vê apenas tema + acesso a login/cadastro */}
            <ThemeToggle />
            <Link to="/login" className="nav-item">
              Entrar
            </Link>
            <Link to="/register" className="btn-nav-signup">
              Criar conta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}