import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Check,
  PenLine,
  ClipboardList,
  Circle,
  Kanban,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hasBoards, setHasBoards] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const me = localStorage.getItem("user");
    if (!me) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(me);
      setUser(userData);
      checkUserBoards(userData._id || userData.id);
    } catch (error) {
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const checkUserBoards = async (usuarioId) => {
    try {
      const response = await api.get(`/quadro?usuarioId=${usuarioId}`);
      const quadros = Array.isArray(response.data) ? response.data : [];
      const meusQuadros = quadros.filter((q) => {
        const donoId = q.id_usuario?._id || q.id_usuario || q.usuarioId || q.usuario;
        return String(donoId) === String(usuarioId);
      });
      setHasBoards(meusQuadros.length > 0);
    } catch (err) {
      console.error("Erro ao verificar quadros:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFirstBoard = () => {
    navigate("/dashboard", { state: { openModal: true } });
  };

  return (
    <div className="home-container">
      <div className="aurora-bg" />
      <div className="home-deco" aria-hidden="true">
        <span className="deco-blob deco-blob-1" />
        <span className="deco-blob deco-blob-2" />
        <span className="deco-chip">
          <Kanban size={16} />
        </span>
        <span className="deco-chip deco-chip-2">
          <Check size={12} />
        </span>
      </div>
      <Navbar user={user} />

      <main className="home-content">
        <section className="welcome-hero">
          <div className="welcome-badge">
            <Sparkles size={16} /> Sua nova rotina começa aqui
          </div>
          <h1>
            Bem-vindo(a), <span>{user?.nome?.split(" ")[0] || "Usuário"}</span>!
          </h1>
          <p className="hero-text">
            O <strong>TaskVibe</strong> é o seu espaço para <strong>anotar o que você
            precisa fazer</strong> e transformar ideias soltas em planos. Pense nele como
            um bloco de notas inteligente: escreva suas tarefas, organize por quadros e
            acompanhe tudo no seu ritmo.
          </p>
        </section>

        {/* Ilustração: mural de anotações + linha de escrita */}
        <section className="home-visual-row" aria-hidden="true">
          <div className="home-mural">
            <div className="sticky-note sticky-pink">
              <span className="sticky-pin" />
              <h4>Estudar React</h4>
              <ul>
                <li className="done"><Check size={13} /> Revisar hooks</li>
                <li><Circle size={13} /> Praticar componentes</li>
              </ul>
            </div>

            <div className="sticky-note sticky-purple">
              <span className="sticky-pin" />
              <h4>Trabalho em Grupo</h4>
              <ul>
                <li className="done"><Check size={13} /> Resumo pronto</li>
                <li><Circle size={13} /> Montar slides</li>
              </ul>
            </div>

            <div className="sticky-note sticky-white">
              <span className="sticky-pin" />
              <h4>Hoje</h4>
              <ul>
                <li><Circle size={13} /> Mandar e-mail</li>
                <li><Circle size={13} /> Comprar o lanche</li>
              </ul>
            </div>
          </div>

          <div className="home-write-card">
            <div className="write-icon">
              <PenLine size={20} />
            </div>
            <p className="write-hint">Escreva sua próxima tarefa...</p>
            <div className="write-checklist">
              <ClipboardList size={15} />
            </div>
          </div>
        </section>

        <section className="action-card-container">
          {!loading && (
            <>
              {!hasBoards ? (
                <div className="first-step-card">
                  <div className="first-step-icon">
                    <ClipboardList size={24} />
                  </div>
                  <h3>Pronto para anotar sua rotina?</h3>
                  <p>Você ainda não possui nenhum quadro criado. Que tal dar o primeiro passo agora?</p>

                  <button onClick={handleCreateFirstBoard} className="btn-create-first">
                    <Plus size={20} /> Criar meu primeiro quadro
                  </button>
                </div>
              ) : (
                <div className="first-step-card">
                  <div className="first-step-icon">
                    <LayoutDashboard size={24} />
                  </div>
                  <h3>Você já tem quadros!</h3>
                  <p>
                    Seus quadros estão prontos para uso. Acesse o painel para
                    acompanhar o andamento dos seus projetos e continuar anotando
                    suas tarefas.
                  </p>

                  <button onClick={() => navigate("/dashboard")} className="btn-create-first">
                    <LayoutDashboard size={20} /> Ir para meus quadros <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}