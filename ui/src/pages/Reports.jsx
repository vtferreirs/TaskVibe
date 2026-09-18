import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2,
  CalendarRange,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderKanban,
  ClipboardList,
} from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import {
  isConcluido,
  isVencido,
  isConcluidoComAtraso,
  dataConclusao,
  toDateInputValue,
} from "../components/cardStatus";
import "./Reports.css";

// Opções de filtro de período do relatório
const PERIODOS = [
  { id: "semana", label: "Última semana" },
  { id: "mes", label: "Este mês" },
  { id: "ano", label: "1 ano" },
  { id: "todo", label: "Todo o período" },
];

// "Status" de uma coluna é usado para agrupar cards: prioriza a key, senão o _id
const columnStatus = (coluna) => coluna.key || String(coluna._id);

// Data de início do período selecionado (null = desde sempre)
const periodoInicio = (periodoId, agora) => {
  switch (periodoId) {
    case "semana": {
      const d = new Date(agora);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "mes":
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
    case "ano": {
      const d = new Date(agora);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    default:
      return null;
  }
};

// Data de fim do período (null = sem limite; mês vai até o último dia do mês)
const periodoFim = (periodoId, agora) => {
  if (periodoId === "mes") {
    return new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  if (periodoId === "todo") return null;
  return new Date(agora);
};

// Data local no formato yyyy-mm-dd (comparável com toDateInputValue)
const paraDiaLocal = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

// Verifica se a data de entrega do card cai dentro do período de início/fim
const estaNoPeriodo = (card, inicio, fim) => {
  const entrega = toDateInputValue(card.data_entrega);
  if (!entrega) return false;
  if (inicio && entrega < paraDiaLocal(inicio)) return false;
  if (fim && entrega > paraDiaLocal(fim)) return false;
  return true;
};

export default function Reports() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("todo");
  const [quadros, setQuadros] = useState([]);
  const [cards, setCards] = useState([]);
  const [colunasPorQuadro, setColunasPorQuadro] = useState({});
  const [quadroSelecionado, setQuadroSelecionado] = useState("");

  useEffect(() => {
    // Sem sessão, volta para o login
    if (!user) {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    // "ativo" evita setar estado após o componente desmontar
    let ativo = true;

    // Carrega os três conjuntos em paralelo
    Promise.all([api.get("/quadro"), api.get("/card"), api.get("/coluna")])
      .then(([quadroRes, cardRes, colunaRes]) => {
        if (!ativo) return;

        const quadrosCarregados = Array.isArray(quadroRes.data) ? quadroRes.data : [];
        const cardsCarregados = Array.isArray(cardRes.data) ? cardRes.data : [];
        const colunasCarregadas = Array.isArray(colunaRes.data) ? colunaRes.data : [];

        // Agrupa as colunas por id_quadro para o gráfico de distribuição
        const mapaColunas = colunasCarregadas.reduce((acc, coluna) => {
          const quadroId = String(coluna.id_quadro || "");
          if (!acc[quadroId]) acc[quadroId] = [];
          acc[quadroId].push(coluna);
          return acc;
        }, {});

        setQuadros(quadrosCarregados);
        setCards(cardsCarregados);
        setColunasPorQuadro(mapaColunas);
        setQuadroSelecionado((prev) => {
          // Mantém o quadro anterior se ainda existir; senão usa o primeiro
          if (quadrosCarregados.some((q) => String(q._id) === String(prev))) return prev;
          return quadrosCarregados.length > 0 ? String(quadrosCarregados[0]._id) : "";
        });
      })
      .catch((err) => console.error("Erro ao carregar relatórios:", err))
      .finally(() => setLoading(false));

    return () => {
      ativo = false;
    };
  }, [navigate, user]);

  // ---- Cálculos derivados (independentes, rodam a cada render) ----

  const agora = new Date();
  const inicio = periodoInicio(periodo, agora);
  const fim = periodoFim(periodo, agora);

  // Cards relevantes ao período do relatório
  const cardsDoPeriodo = cards.filter((card) => estaNoPeriodo(card, inicio, fim));

  const totalCards = cardsDoPeriodo.length;
  const finalizadas = cardsDoPeriodo.filter((card) => isConcluido(card));
  const percentualFinalizadas = totalCards > 0 ? Math.round((finalizadas.length / totalCards) * 100) : 0;

  // Atrasadas = não concluídas e com prazo já vencido
  const atrasadas = cardsDoPeriodo.filter((card) => isVencido(card, agora));

  const finalizadasNoPrazo = finalizadas.filter(
    (card) => dataConclusao(card) && !isConcluidoComAtraso(card)
  ).length;
  const finalizadasEmAtraso = finalizadas.filter((card) => isConcluidoComAtraso(card)).length;

  const colunasDoQuadro = quadroSelecionado ? colunasPorQuadro[quadroSelecionado] || [] : [];

  // Conta quantos cards do período estão em cada coluna do quadro selecionado
  const distribuicao = colunasDoQuadro.map((coluna) => ({
    titulo: coluna.titulo,
    cor: coluna.corFundo || "",
    contagem: cardsDoPeriodo.filter(
      (card) =>
        String(card.id_quadro || "") === String(quadroSelecionado) &&
        String(card.status || "") === columnStatus(coluna)
    ).length,
  }));

  // Cards do quadro com status que não corresponde a nenhuma coluna (órfãos)
  const semColuna = cardsDoPeriodo.filter((card) => {
    if (String(card.id_quadro || "") !== String(quadroSelecionado)) return false;
    const status = String(card.status || "");
    return !colunasDoQuadro.some((coluna) => status === columnStatus(coluna));
  }).length;

  const totalDistribuicao = distribuicao.reduce((acc, item) => acc + item.contagem, 0) + semColuna;

  // Anel de progresso de conclusão via conic-gradient
  const ringStyle = {
    background: `conic-gradient(var(--accent) ${percentualFinalizadas}%, var(--accent-soft) 0)`,
  };

  return (
    <div className="reports-container">
      <div className="aurora-bg" />
      <Navbar user={user} />

      <main className="reports-content">
        <div className="reports-header">
          <h1>Relatórios</h1>
          <p>Veja estatísticas de produtividade e acompanhe o desempenho das suas tarefas.</p>
        </div>

        {/* Filtros de período */}
        <div className="report-filters">
          <div className="filter-label">
            <CalendarRange size={16} />
            <span>Período</span>
          </div>
          <div className="filter-buttons">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`filter-btn ${periodo === p.id ? "active" : ""}`}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="reports-loading">Carregando relatórios...</p>
        ) : !user ? null : quadros.length === 0 ? (
          <div className="empty-reports">
            <div className="empty-reports-icon">
              <FolderKanban size={32} />
            </div>
            <h3>Nenhum quadro encontrado</h3>
            <p>Crie um quadro para começar a ver seus relatórios de produtividade.</p>
          </div>
        ) : (
          <>
            {/* Cartões de estatística geral */}
            <div className="reports-stats">
              <div className="report-stat-card">
                <div className="report-stat-icon purple">
                  <FolderKanban size={22} />
                </div>
                <div className="report-stat-info">
                  <h4>Quadros</h4>
                  <span>{quadros.length}</span>
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-icon pink">
                  <ClipboardList size={22} />
                </div>
                <div className="report-stat-info">
                  <h4>Cards no período</h4>
                  <span>{totalCards}</span>
                </div>
              </div>

              <div className="report-stat-card">
                {/* Anel de progresso de conclusão */}
                <div className="progress-ring" style={ringStyle}>
                  <div className="progress-ring-inner">
                    <span>{percentualFinalizadas}%</span>
                    <small>finalizadas</small>
                  </div>
                </div>
                <div className="report-stat-info">
                  <h4>Concluídas</h4>
                  <span>
                    {finalizadas.length}/{totalCards}
                  </span>
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-icon danger">
                  <Clock size={22} />
                </div>
                <div className="report-stat-info">
                  <h4>Atrasadas</h4>
                  <span>{atrasadas.length}</span>
                </div>
              </div>
            </div>

            <div className="reports-grid">
              {/* Resumo de conclusões (no prazo vs em atraso) */}
              <section className="report-card">
                <div className="report-card-title">
                  <CheckCircle2 size={18} />
                  <h2>Conclusão</h2>
                </div>
                <div className="conclusao-counters">
                  <div className="conclusao-item prazo">
                    <div className="conclusao-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <strong>Finalizadas no prazo</strong>
                      <span>{finalizadasNoPrazo}</span>
                    </div>
                  </div>
                  <div className="conclusao-item atraso">
                    <div className="conclusao-icon">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <strong>Finalizadas em atraso</strong>
                      <span>{finalizadasEmAtraso}</span>
                    </div>
                  </div>
                </div>
                <p className="report-hint">
                  Tarefas finalizadas antes ou na data de entrega contam como "no prazo";
                  concluídas depois contam como "em atraso".
                </p>
              </section>

              {/* Gráfico de barras: distribuição de cards por coluna */}
              <section className="report-card">
                <div className="report-card-title">
                  <BarChart2 size={18} />
                  <h2>Distribuição por colunas</h2>
                </div>

                <div className="chart-board-select">
                  <label htmlFor="quadroRelatorio">Quadro</label>
                  <select
                    id="quadroRelatorio"
                    className="report-select"
                    value={quadroSelecionado}
                    onChange={(e) => setQuadroSelecionado(e.target.value)}
                  >
                    {quadros.map((q) => (
                      <option key={q._id} value={String(q._id)}>
                        {q.titulo_quadro || q.titulo}
                      </option>
                    ))}
                  </select>
                  <span className="report-select-hint">
                    Cards vencendo no período: {totalDistribuicao}
                  </span>
                </div>

                {colunasDoQuadro.length === 0 ? (
                  <p className="report-hint">Este quadro ainda não possui colunas.</p>
                ) : (
                  <div className="bar-chart">
                    {distribuicao.map((item, index) => {
                      // Largura proporcional à participação da coluna no total
                      const largura =
                        totalDistribuicao > 0 ? (item.contagem / totalDistribuicao) * 100 : 0;
                      return (
                        <div className="chart-row" key={index}>
                          <div className="chart-row-label" title={item.titulo}>
                            {item.titulo}
                          </div>
                          <div className="chart-bar-track">
                            <div
                              className="chart-bar"
                              style={{
                                width: `${largura}%`,
                                background: item.cor || "var(--accent)",
                              }}
                            />
                          </div>
                          <span className="chart-row-count">{item.contagem}</span>
                        </div>
                      );
                    })}
                    {/* Cards sem coluna correspondente entram como barra destacada */}
                    {semColuna > 0 && (
                      <div className="chart-row">
                        <div className="chart-row-label muted">Sem coluna</div>
                        <div className="chart-bar-track">
                          <div
                            className="chart-bar muted"
                            style={{ width: `${(semColuna / totalDistribuicao) * 100}%` }}
                          />
                        </div>
                        <span className="chart-row-count">{semColuna}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}