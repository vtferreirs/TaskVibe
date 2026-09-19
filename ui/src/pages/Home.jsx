import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Check,
  ClipboardList,
  Kanban,
  BellRing,
  Palette,
  Share2,
  Calendar,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./Home.css";

// Página inicial/landing. Funciona tanto para visitante não logado quanto
// para usuário autenticado; quando logado, verifica se já existem quadros
// para decidir entre o CTA de "criar primeiro quadro" ou "ir para os quadros".
export default function Home() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [hasBoards, setHasBoards] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(user));

  const logado = Boolean(user);

  useEffect(() => {
    if (!user) return;

    const usuarioId = user._id || user.id;
    api
      .get(`/quadro?usuarioId=${usuarioId}`)
      .then((response) => {
        const quadros = Array.isArray(response.data) ? response.data : [];
        const meusQuadros = quadros.filter((q) => {
          const donoId = q.id_usuario?._id || q.id_usuario || q.usuarioId || q.usuario;
          return String(donoId) === String(usuarioId);
        });
        setHasBoards(meusQuadros.length > 0);
      })
      .catch((err) => console.error("Erro ao verificar quadros:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handlePrimaryCta = () => {
    if (logado) {
      if (hasBoards) {
        navigate("/dashboard");
      } else {
        navigate("/dashboard", { state: { openModal: true } });
      }
    } else {
      navigate("/register");
    }
  };

  const secondaryCta =
    logado && hasBoards
      ? { label: "Ver quadros compartilhados", action: () => navigate("/compartilhados") }
      : logado
        ? { label: "Ir para meus quadros", action: () => navigate("/dashboard") }
        : { label: "Fazer login", action: () => navigate("/login") };

  const primaryLabel = !logado
    ? "Criar conta grátis"
    : hasBoards
      ? "Ir para meus quadros"
      : "Criar meu primeiro quadro";

  return (
    <div className="home-container">
      <div className="aurora-bg" />
      <Navbar user={user} />

      <main className="home-content">
        {/* ===== Hero ===== */}
        <section className="hero">
          <div className="hero-copy">
            <div className="welcome-badge">
              <Sparkles size={16} /> Sua nova rotina começa aqui
            </div>

            <h1>
              {logado ? (
                <>
                  Bem-vindo(a), <span>{user?.nome?.split(" ")[0] || "Usuário"}</span>!
                </>
              ) : (
                <>
                  Organize suas tarefas <span>no seu ritmo.</span>
                </>
              )}
            </h1>

            <p className="hero-text">
              O <strong>TaskVibe</strong> é o seu espaço para <strong>anotar o que você
              precisa fazer</strong> e transformar ideias soltas em planos. Escreva suas
              tarefas, organize por quadros e acompanhe tudo com alertas inteligentes de prazo.
            </p>

            <div className="hero-actions">
              <button onClick={handlePrimaryCta} className="btn-hero-primary">
                <Plus size={20} /> {primaryLabel} <ArrowRight size={18} />
              </button>
              <button onClick={secondaryCta.action} className="btn-hero-secondary">
                <LayoutDashboard size={18} /> {secondaryCta.label}
              </button>
            </div>
          </div>

          {/* Painel visual: mini quadro Kanban construído em CSS puro */}
          <div className="hero-visual" aria-hidden="true">
            <div className="mock-window">
              <div className="mock-toolbar">
                <div className="mock-dots">
                  <span className="mock-dot mock-dot--pink" />
                  <span className="mock-dot mock-dot--purple" />
                  <span className="mock-dot mock-dot--soft" />
                </div>
                <span className="mock-title">
                  <Kanban size={13} /> Projeto Vibe
                </span>
                <span className="mock-avatar">V</span>
              </div>

              <div className="mock-board">
                <div className="mock-column">
                  <div className="mock-column-header">
                    <span className="mock-column-title">A Fazer</span>
                    <span className="mock-count">3</span>
                  </div>
                  <div className="mock-card mock-card--baixa">
                    <span className="mock-priority mock-priority--baixa" />
                    <div className="mock-card-main">
                      <strong>Revisar hooks</strong>
                      <small>
                        <Calendar size={10} /> Vence amanhã
                      </small>
                    </div>
                  </div>
                  <div className="mock-card mock-card--baixa">
                    <span className="mock-priority mock-priority--baixa" />
                    <div className="mock-card-main">
                      <strong>Montar slides</strong>
                      <small>
                        <Calendar size={10} /> Vence em 4 dias
                      </small>
                    </div>
                  </div>
                  <div className="mock-card mock-card--baixa">
                    <span className="mock-priority mock-priority--baixa" />
                    <div className="mock-card-main">
                      <strong>Mandar e-mail</strong>
                    </div>
                  </div>
                </div>

                <div className="mock-column mock-column--highlight">
                  <div className="mock-column-header">
                    <span className="mock-column-title">Em Andamento</span>
                    <span className="mock-count mock-count--accent">2</span>
                  </div>
                  <div className="mock-card mock-card--media">
                    <span className="mock-priority mock-priority--media" />
                    <div className="mock-card-main">
                      <strong>Praticar componentes</strong>
                    </div>
                  </div>
                  <div className="mock-card mock-card--media mock-card--focus">
                    <span className="mock-priority mock-priority--media" />
                    <div className="mock-card-main">
                      <strong>Trabalho em grupo</strong>
                      <small>
                        <Check size={10} /> 2 de 4
                      </small>
                    </div>
                  </div>
                </div>

                <div className="mock-column">
                  <div className="mock-column-header">
                    <span className="mock-column-title">Concluído</span>
                    <span className="mock-count">1</span>
                  </div>
                  <div className="mock-card mock-card--done">
                    <span className="mock-priority mock-priority--done" />
                    <div className="mock-card-main">
                      <strong>Resumo pronto</strong>
                      <small>
                        <Check size={10} /> Concluído
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feito simplificado: só mostra o CTA de fluxo, sem repetir tudo */}
        {!loading && logado && (
          <section className="action-card-container">
            <div className={`first-step-card ${hasBoards ? "" : "first-step-card--destaque"}`}>
              {logado && !hasBoards && (
                <span className="first-step-badge">
                  <Sparkles size={14} /> Comece agora
                </span>
              )}
              <div className="first-step-icon">
                <ClipboardList size={24} />
              </div>
              <h3>{hasBoards ? "Você já tem quadros!" : "Pronto para anotar sua rotina?"}</h3>
              <p>
                {hasBoards
                  ? "Acesse o painel para acompanhar o andamento dos seus projetos e continuar anotando suas tarefas."
                  : "Você ainda não possui nenhum quadro criado. Que tal dar o primeiro passo agora?"}
              </p>

              <button onClick={handlePrimaryCta} className="btn-create-first">
                {hasBoards ? (
                  <LayoutDashboard size={20} />
                ) : (
                  <Plus size={20} />
                )}{" "}
                {hasBoards ? "Ir para meus quadros" : "Criar meu primeiro quadro"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {/* Itens de valor (apenas visitantes): guiam o fluxo sem poluir */}
        {!loading && !logado && (
          <section className="value-strip" aria-label="Recursos do TaskVibe">
            <div className="value-item">
              <span className="value-icon">
                <Palette size={18} />
              </span>
              <div>
                <strong>Visual que é seu</strong>
                <p>Cores, gradientes e imagens para cada quadro e coluna.</p>
              </div>
            </div>

            <div className="value-item">
              <span className="value-icon">
                <BellRing size={18} />
              </span>
              <div>
                <strong>Alertas de prazo</strong>
                <p>Saiba na hora o que vence hoje ou está atrasado.</p>
              </div>
            </div>

            <div className="value-item">
              <span className="value-icon">
                <Share2 size={18} />
              </span>
              <div>
                <strong>Colabore</strong>
                <p>Compartilhe seus quadros e trabalhe em equipe.</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}