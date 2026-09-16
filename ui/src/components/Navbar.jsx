import { Link, useNavigate } from "react-router-dom";
import { Kanban, Layout, Share2, BarChart2, Settings, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

export default function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
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

        <nav className="navbar-links">
          <Link to="/dashboard" className="nav-item">
            <Layout size={18} /> Quadros
          </Link>
          <Link to="/compartilhados" className="nav-item">
            <Share2 size={18} /> Compartilhados
          </Link>
          <Link to="/reports" className="nav-item">
            <BarChart2 size={18} /> Relatórios
          </Link>
          <Link to="/settings" className="nav-item">
            <Settings size={18} /> Configurações
          </Link>
        </nav>
      </div>

      <div className="navbar-right">
        <span className="user-name">Olá, {user?.nome || "Usuário"}</span>
        <ThemeToggle />
        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}