import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Calendar, Edit2, Palette, Image as ImageIcon, Users, Eye, X } from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import ShareBoardModal from "../components/ShareBoardModal";
import CardModal from "../components/CardModal";
import CardStatusBadge from "../components/CardStatusBadge";
import { colorFallback } from "../components/colorPalette";
import {
  isVencido,
  formatarDataHora,
  HORA_PADRAO,
  hojeISO,
  normalizarNivel,
  alertasAtivos,
  nivelIntenso,
  faixaPrazo,
} from "../components/cardStatus";
import styles from "./Boardview.module.css";

// Página principal do quadro Kanban: mostra as colunas com suas tarefas,
// respeitando a permissão do usuário (dono / editar / visualizar). Usuários
// só-leitura não veem nenhum controle de criação/edição/exclusão.
const DEFAULT_COLUNAS = [
  { titulo: "A Fazer", key: "A Fazer" },
  { titulo: "Em Andamento", key: "Em Andamento" },
  { titulo: "Concluído", key: "Concluído" },
];

// Mapa entre a faixa de prazo e a classe CSS da tarja de deadline
const DEADLINE_CLASSES = {
  atrasado: "deadlineAtrasado",
  hoje: "deadlineHoje",
  "3dias": "deadline3dias",
  "7dias": "deadline7dias",
};

export default function BoardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const columnsRef = useRef(null);
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [quadro, setQuadro] = useState(null);
  const [cards, setCards] = useState([]);
  const [colunas, setColunas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de edição/visualização da coluna
  const [colunaExpandida, setColunaExpandida] = useState(null);
  const [colunaParaExcluir, setColunaParaExcluir] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  // Papel do usuário neste quadro: "dono" | "editar" | "visualizar" | null
  const [permissao, setPermissao] = useState(null);
  const [semAcesso, setSemAcesso] = useState(false);

  // Visão expandida do card
  const [cardSelecionadoId, setCardSelecionadoId] = useState(null);
  const [cardParaExcluir, setCardParaExcluir] = useState(null);

  // Form de criação de card
  const [colunaAtiva, setColunaAtiva] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("Baixa");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState(HORA_PADRAO);
  const [formErro, setFormErro] = useState("");

  // O status do card referencia a coluna pelo key (colunas padrão) ou pelo _id
  const columnStatus = (coluna) => coluna.key || String(coluna._id);

  // Carrega colunas do quadro; se o usuário pode editar e não há colunas,
  // cria automaticamente as três colunas padrão (fluxo de primeiro acesso)
  const fetchColunas = useCallback(async (quadroId, podeCriar) => {
    const res = await api.get(`/coluna?id_quadro=${quadroId}`);
    let colunasCarregadas = Array.isArray(res.data) ? res.data : [];

    if (podeCriar && colunasCarregadas.length === 0) {
      const criadas = await Promise.all(
        DEFAULT_COLUNAS.map((d, i) =>
          api.post("/coluna", { ...d, ordem: i, id_quadro: quadroId })
        )
      );
      colunasCarregadas = criadas.map((r) => r.data);
    }

    setColunas(colunasCarregadas);
  }, []);

  // Carrega quadro + cards em paralelo e deduz a permissão do usuário
  const fetchDados = useCallback(async (usuario) => {
    try {
      const usuarioId = String(usuario?._id || usuario?.id || "");
      const [quadroRes, cardsRes] = await Promise.all([
        api.get(`/quadro?id=${id}`),
        api.get(`/card?id_quadro=${id}`),
      ]);

      const q = Array.isArray(quadroRes.data)
        ? quadroRes.data.find((item) => item._id === id) || null
        : quadroRes.data;

      // Define a permissão: dono se for o criador; senão busca na lista de membros
      let novaPermissao = null;
      if (q) {
        const donoId = String(q.id_usuario?._id || q.id_usuario || "");
        if (usuarioId && donoId === usuarioId) {
          novaPermissao = "dono";
        } else {
          const membro = (q.membros || []).find(
            (m) => String(m.id_usuario?._id || m.id_usuario) === usuarioId
          );
          novaPermissao = membro?.permissao || null;
        }
      }

      setPermissao(novaPermissao);
      setQuadro(q);
      setSemAcesso(!q);

      setCards(Array.isArray(cardsRes.data) ? cardsRes.data : []);
      // Só permite auto-criar colunas quando o usuário tem poder de escrita
      await fetchColunas(id, novaPermissao === "dono" || novaPermissao === "editar");
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setSemAcesso(true);
    } finally {
      setLoading(false);
    }
  }, [id, fetchColunas]);

  useEffect(() => {
    // Sem sessão salva, redireciona para o login
    const me = localStorage.getItem("user");
    if (!me) {
      navigate("/login");
      return;
    }
    let userData;
    try {
      userData = JSON.parse(me);
    } catch {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }
    Promise.resolve()
      .then(() => fetchDados(userData))
      .catch(() => {});
  }, [navigate, fetchDados]);

  // Ações da Coluna
  // Renomeação otimista local; o commit só é enviado ao servidor no blur/Enter
  const handleRenameColumn = (colId, novoTitulo) => {
    setColunas((prev) =>
      prev.map((c) => (c._id === colId ? { ...c, titulo: novoTitulo } : c))
    );
  };

  const handleRenameColumnCommit = async (colId) => {
    const coluna = colunas.find((c) => c._id === colId);
    if (!coluna) return;
    const novoTitulo = coluna.titulo.trim() || "Sem título";
    setColunas((prev) =>
      prev.map((c) => (c._id === colId ? { ...c, titulo: novoTitulo } : c))
    );
    try {
      await api.put(`/coluna/${colId}`, { titulo: novoTitulo });
    } catch (err) {
      console.error("Erro ao renomear coluna:", err);
    }
  };

  // Cor de fundo ou imagem são mutuamente exclusivos (um zera o outro)
  const handleColumnColorChange = async (colId, cor) => {
    setColunas((prev) =>
      prev.map((c) => (c._id === colId ? { ...c, corFundo: cor, imagemFundo: null } : c))
    );
    try {
      await api.put(`/coluna/${colId}`, { corFundo: cor, imagemFundo: null });
    } catch (err) {
      console.error("Erro ao alterar cor da coluna:", err);
    }
  };

  const handleColumnImageUpload = (colId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Converte o arquivo para base64 antes de enviar
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imagem = reader.result;
      setColunas((prev) =>
        prev.map((c) => (c._id === colId ? { ...c, imagemFundo: imagem, corFundo: null } : c))
      );
      try {
        await api.put(`/coluna/${colId}`, { imagemFundo: imagem, corFundo: null });
      } catch (err) {
        console.error("Erro ao adicionar imagem na coluna:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Nova coluna já abre em modo de edição e rola o container até o fim
  const handleAddColumn = async () => {
    try {
      const response = await api.post("/coluna", {
        titulo: "Nova Coluna",
        corFundo: null,
        id_quadro: id,
      });

      setColunas((prev) => [...prev, response.data]);
      setColunaExpandida(response.data._id);
      setColunaAtiva(null);
      setTimeout(() => {
        columnsRef.current?.scrollTo({
          left: columnsRef.current.scrollWidth,
          behavior: "smooth",
        });
      }, 80);
    } catch (err) {
      console.error("Erro ao criar coluna:", err);
      alert("Erro ao criar coluna.");
    }
  };

  const handleDeleteColumn = async () => {
    if (!colunaParaExcluir) return;

    try {
      await api.delete(`/coluna/${colunaParaExcluir._id}`);
      const idExcluido = colunaParaExcluir._id;
      setColunas((prev) => prev.filter((c) => c._id !== idExcluido));
      setColunaParaExcluir(null);
      // Limpa estados que apontavam para a coluna removida
      if (colunaAtiva === idExcluido) setColunaAtiva(null);
      if (colunaExpandida === idExcluido) setColunaExpandida(null);
    } catch (err) {
      console.error("Erro ao excluir coluna:", err);
      alert("Não foi possível excluir a coluna.");
    }
  };

  // Ações do Card
  const handleCreateCard = async (statusColuna) => {
    if (!titulo.trim() || !descricao.trim() || !dataEntrega || !prioridade) {
      setFormErro("Preencha todas as informações.");
      return;
    }

    if (dataEntrega < hojeISO()) {
      setFormErro("A data de entrega não pode ser anterior a hoje.");
      return;
    }

    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        // Converte "YYYY-MM-DD" do input date para ISO UTC
        data_entrega: new Date(`${dataEntrega}T00:00:00.000Z`).toISOString(),
        hora_entrega: horaEntrega || HORA_PADRAO,
        status: statusColuna,
        prioridade: prioridade,
        id_quadro: id,
        cor: "#ffffff", // Cor padrão do card
      };

      const response = await api.post("/card", payload);

      // Adiciona o card retornado e limpa o formulário
      setCards((prev) => [...prev, response.data]);
      setTitulo("");
      setDescricao("");
      setPrioridade("Baixa");
      setDataEntrega("");
      setHoraEntrega(HORA_PADRAO);
      setFormErro("");
      setColunaAtiva(null);
    } catch {
      alert("Erro ao criar tarefa.");
    }
  };

  const abrirFormCard = (colunaId) => {
    setFormErro("");
    setColunaAtiva(colunaId);
  };

  const fecharFormCard = () => {
    setFormErro("");
    setColunaAtiva(null);
  };

  // Salva edições feitas no CardModal e sincroniza a lista local
  const handleSaveCardEdit = async (cardId, payload) => {
    try {
      const { data } = await api.put(`/card/${cardId}`, payload);

      setCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, ...data } : c))
      );
    } catch {
      alert("Erro ao atualizar a tarefa.");
    }
  };

  // Marca/desmarca concluído, registrando data_conclusao no estado local e
  // na API; reverte a mudança otimista se a API falhar
  const handleToggleConcluido = async (cardId, novoValor) => {
    const anterior = cards.find((c) => c._id === cardId);

    setCards((prev) =>
      prev.map((c) =>
        c._id === cardId
          ? {
              ...c,
              concluido: novoValor,
              data_conclusao: novoValor ? new Date().toISOString() : null,
            }
          : c
      )
    );

    try {
      const { data } = await api.put(`/card/${cardId}`, { concluido: novoValor });

      setCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, ...data } : c))
      );
    } catch (err) {
      console.error("Erro ao alterar conclusão do card:", err);
      if (anterior) {
        setCards((prev) => prev.map((c) => (c._id === cardId ? anterior : c)));
      }
    }
  };

  // Mudanças de cor (fundo/texto) também são otimistas com reversão em erro
  const handleCardColorChange = async (cardId, novaCor) => {
    const anterior = cards.find((c) => c._id === cardId)?.cor;

    setCards((prev) =>
      prev.map((c) => (c._id === cardId ? { ...c, cor: novaCor } : c))
    );

    try {
      await api.put(`/card/${cardId}`, { cor: novaCor });
    } catch (err) {
      console.error("Erro ao alterar cor do card:", err);
      if (anterior !== undefined) {
        setCards((prev) =>
          prev.map((c) => (c._id === cardId ? { ...c, cor: anterior } : c))
        );
      }
    }
  };

  const handleCardTextColorChange = async (cardId, novaCor) => {
    const anterior = cards.find((c) => c._id === cardId)?.cor_texto;

    setCards((prev) =>
      prev.map((c) => (c._id === cardId ? { ...c, cor_texto: novaCor } : c))
    );

    try {
      await api.put(`/card/${cardId}`, { cor_texto: novaCor });
    } catch (err) {
      console.error("Erro ao alterar cor do texto:", err);
      if (anterior !== undefined) {
        setCards((prev) =>
          prev.map((c) => (c._id === cardId ? { ...c, cor_texto: anterior } : c))
        );
      }
    }
  };

  const handleDeleteCard = async () => {
    if (!cardParaExcluir) return;
    const cardId = cardParaExcluir._id;

    try {
      await api.delete(`/card/${cardId}`);
      setCards((prev) => prev.filter((c) => c._id !== cardId));
      if (cardSelecionadoId === cardId) setCardSelecionadoId(null);
      setCardParaExcluir(null);
    } catch {
      alert("Erro ao excluir.");
    }
  };

  // Seleciona a classe da faixa lateral de prioridade do card
  const getPriorityBarClass = (prio) => {
    if (prio === "Alta") return styles.priorityAlta;
    if (prio === "Media") return styles.priorityMedia;
    return styles.priorityBaixa;
  };

  // Permissões derivadas usadas por toda a renderização
  const podeEditar = permissao === "dono" || permissao === "editar";
  const ehDono = permissao === "dono";
  const nivelAlertas = normalizarNivel(user?.nivel_alertas ?? user?.alertas_visuais);
  const cardSelecionado =
    cards.find((c) => c._id === cardSelecionadoId) || null;

  if (loading) return <div className={styles.loadingScreen}>Carregando...</div>;

  // Tela exibida quando o quadro não existe ou o usuário não foi convidado
  if (semAcesso) {
    return (
      <div className={styles.container}>
        <div className="aurora-bg" />
        <Navbar user={user} />

        <main className={styles.semAcesso}>
          <Eye size={40} color="var(--accent)" />
          <h3>Sem acesso a este quadro</h3>
          <p>
            Este quadro não existe ou você ainda não foi convidado para ele.
            Peça ao dono para compartilhá-lo com o seu e-mail cadastrado.
          </p>
          <button className={styles.btnVoltar} onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={16} /> Voltar aos quadros
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="aurora-bg" />
      <Navbar user={user} />

      <header className={styles.header} style={{ borderBottomColor: colorFallback(quadro?.cor, "#7c3aed") }}>
        <button className={styles.btnBack} onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={18} /> Voltar aos Quadros
        </button>

        <div className={styles.boardInfo}>
          <h2>{quadro?.titulo_quadro || quadro?.titulo || "Quadro de Tarefas"}</h2>
          {permissao && permissao !== "dono" && (
            <div className={styles.readOnlyBanner}>
              {permissao === "visualizar" ? "Somente leitura" : "Edição liberada"}
            </div>
          )}
        </div>

        {/* Só o dono pode convidar/gerenciar membros */}
        {ehDono && (
          <button className={styles.btnShare} onClick={() => setShareOpen(true)}>
            <Users size={16} /> Compartilhar
          </button>
        )}
      </header>

      <main className={styles.columns} ref={columnsRef}>
        {colunas.map((coluna) => {
          const cardsDaColuna = cards.filter((c) => c.status === columnStatus(coluna));

          // Contadores de tarefas atrasadas e vencendo em até 7 dias (alertas do nível)
          const cardsAtrasados = cardsDaColuna.filter((c) => isVencido(c)).length;
          const cardsVencendo = cardsDaColuna.filter((c) => {
            const faixa = faixaPrazo(c);
            return faixa === "hoje" || faixa === "3dias" || faixa === "7dias";
          }).length;

          // Badges exibidos no cabeçalho da coluna (ocultos se o nível for "desligado")
          const marcadoresColuna = alertasAtivos(nivelAlertas) && (
            <>
              {cardsAtrasados > 0 && (
                <span
                  className={`${styles.alertaColuna} ${styles.alertaColunaAtraso}`}
                  title={`${cardsAtrasados} tarefa(s) atrasada(s)`}
                >
                  {cardsAtrasados}
                </span>
              )}
              {cardsVencendo > 0 && (
                <span
                  className={`${styles.alertaColuna} ${styles.alertaColunaVencendo}`}
                  title={`${cardsVencendo} tarefa(s) vencendo em até 7 dias`}
                >
                  {cardsVencendo}
                </span>
              )}
            </>
          );

          // Fundo da coluna: imagem ou cor (a imagem tem prioridade)
          const colStyle = coluna.imagemFundo
            ? { backgroundImage: `url(${coluna.imagemFundo})` }
            : coluna.corFundo
              ? { backgroundColor: coluna.corFundo }
              : {};

          return (
            <div key={coluna._id} className={styles.column} style={colStyle}>
              <div className={styles.columnHeader}>
                {podeEditar && colunaExpandida === coluna._id ? (
                  <>
                    <input
                      type="text"
                      className={styles.columnTitleInput}
                      value={coluna.titulo}
                      onChange={(e) => handleRenameColumn(coluna._id, e.target.value)}
                      onBlur={() => handleRenameColumnCommit(coluna._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          handleRenameColumnCommit(coluna._id);
                          setColunaExpandida(null);
                        }
                      }}
                      autoFocus
                    />

                    <div className={styles.columnHeaderRight}>
                      <div className={styles.columnActions}>
                        <label className={styles.btnColorPicker} title="Cor da coluna">
                          <Palette size={16} color="#64748b" />
                          <input
                            type="color"
                            value={coluna.corFundo || "#f1f5f9"}
                            onChange={(e) => handleColumnColorChange(coluna._id, e.target.value)}
                          />
                        </label>

                        <label className={styles.btnBgUpload} title="Imagem de fundo">
                          <ImageIcon size={16} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleColumnImageUpload(coluna._id, e)}
                          />
                        </label>

                        <button
                          className={styles.btnDeleteColumn}
                          title="Excluir coluna"
                          onClick={() => setColunaParaExcluir(coluna)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {marcadoresColuna}

                      <span className={styles.cardCount}>{cardsDaColuna.length}</span>

                      <button
                        className={styles.btnCollapseColumn}
                        title="Fechar detalhes"
                        onClick={() => {
                          handleRenameColumnCommit(coluna._id);
                          setColunaExpandida(null);
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Só quem pode editar consegue abrir o modo de edição do título */}
                    <div
                      className={styles.columnTitle}
                      onClick={podeEditar ? () => setColunaExpandida(coluna._id) : undefined}
                    >
                      <h3>{coluna.titulo}</h3>
                      {podeEditar && <Edit2 size={12} color="#64748b" />}
                    </div>

                    <div className={styles.columnHeaderRight}>
                      {marcadoresColuna}
                      <span className={styles.cardCount}>{cardsDaColuna.length}</span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.cardsList}>
                {cardsDaColuna.map((card) => {
                  // Tarjas de alerta: atraso (preta) e proximidade do prazo (colorida)
                  const vencido = isVencido(card);
                  const faixa = faixaPrazo(card);
                  const mostrarTarja = alertasAtivos(nivelAlertas) && faixa;
                  return (
                    <div
                      key={card._id}
                      className={`${styles.taskCard} ${vencido ? styles.taskCardVencido : ""}`}
                      style={{ background: card.cor || "#ffffff" }}
                      onClick={() => setCardSelecionadoId(card._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCardSelecionadoId(card._id);
                        }
                      }}
                    >
                      {/* Faixa de prioridade (preta quando atrasado) */}
                      <div
                        className={`${styles.priorityBar} ${
                          vencido ? styles.priorityVencido : getPriorityBarClass(card.prioridade)
                        }`}
                      />

                      {/* Faixa secundária de prazo */}
                      {mostrarTarja && (
                        <div
                          className={`${styles.deadlineBar} ${
                            styles[DEADLINE_CLASSES[faixa]]
                          } ${nivelIntenso(nivelAlertas) ? styles.deadlineGlow : ""}`}
                        />
                      )}

                      <div
                        className={styles.taskCardContent}
                        style={{ color: card.cor_texto || "#1e293b" }}
                      >
                        <div className={styles.taskCardHeader}>
                          <h4>{card.titulo}</h4>
                        </div>

                        {card.descricao && <p className={styles.taskDesc}>{card.descricao}</p>}

                        <div className={styles.taskCardFooter}>
                          <div className={styles.taskDate}>
                            <Calendar size={12} />
                            {formatarDataHora(card.data_entrega, card.hora_entrega)}
                          </div>
                          <CardStatusBadge card={card} nivelAlertas={nivelAlertas} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {colunaAtiva === coluna._id ? (
                <div className={styles.addCardForm}>
                  <input
                    type="text"
                    placeholder="Título da tarefa..."
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      setFormErro("");
                    }}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Descrição..."
                    value={descricao}
                    onChange={(e) => {
                      setDescricao(e.target.value);
                      setFormErro("");
                    }}
                  />

                  <div className={styles.formRowCompact}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Entrega:</label>
                      <input
                        type="date"
                        min={hojeISO()}
                        value={dataEntrega}
                        onChange={(e) => {
                          setDataEntrega(e.target.value);
                          setFormErro("");
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Hora:</label>
                      <input
                        type="time"
                        value={horaEntrega}
                        onChange={(e) => {
                          setHoraEntrega(e.target.value);
                          setFormErro("");
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prioridade:</label>
                    <select
                      value={prioridade}
                      onChange={(e) => {
                        setPrioridade(e.target.value);
                        setFormErro("");
                      }}
                    >
                      <option value="Baixa">Baixa (Azul)</option>
                      <option value="Media">Média (Amarelo)</option>
                      <option value="Alta">Alta (Vermelho)</option>
                    </select>
                  </div>

                  {formErro && <p className={styles.formError}>{formErro}</p>}

                  <div className={styles.formActions}>
                    <button className={styles.btnSaveCard} onClick={() => handleCreateCard(columnStatus(coluna))}>
                      Salvar
                    </button>
                    <button className={styles.btnCancelCard} onClick={fecharFormCard}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                podeEditar && (
                  <button className={styles.btnAddCard} onClick={() => abrirFormCard(coluna._id)}>
                    <Plus size={16} /> Nova Tarefa
                  </button>
                )
              )}
            </div>
          );
        })}

        {/* "Nova Coluna" e "Nova Tarefa" só aparecem para quem pode editar */}
        {podeEditar && (
          <button className={styles.addColumn} onClick={handleAddColumn}>
            <Plus size={18} /> Nova Coluna
          </button>
        )}
      </main>

      {/* Modais: compartilhamento (dono), edição do card e confirmações de exclusão */}
      <ShareBoardModal
        isOpen={shareOpen}
        quadroId={id}
        onClose={() => setShareOpen(false)}
        onUpdateQuadro={(q) => setQuadro(q)}
      />

      {cardSelecionado && (
        <CardModal
          key={cardSelecionado._id}
          card={cardSelecionado}
          isOpen={Boolean(cardSelecionado)}
          podeEditar={podeEditar}
          nivelAlertas={nivelAlertas}
          onClose={() => setCardSelecionadoId(null)}
          onSave={handleSaveCardEdit}
          onColorChange={handleCardColorChange}
          onTextColorChange={handleCardTextColorChange}
          onRequestDelete={(c) => setCardParaExcluir(c)}
          onToggleConcluido={handleToggleConcluido}
        />
      )}

      <DeleteConfirmModal
        isOpen={Boolean(colunaParaExcluir)}
        onClose={() => setColunaParaExcluir(null)}
        onConfirm={handleDeleteColumn}
        title="Excluir Coluna"
        subjectName={colunaParaExcluir?.titulo || ""}
        message="Tem certeza que deseja excluir a coluna"
        confirmLabel="Sim, excluir"
        warning="Os cards dessa coluna deixarão de aparecer, mas permanecerão salvos."
      />

      <DeleteConfirmModal
        isOpen={Boolean(cardParaExcluir)}
        onClose={() => setCardParaExcluir(null)}
        onConfirm={handleDeleteCard}
        title="Excluir Tarefa"
        subjectName={cardParaExcluir?.titulo || ""}
        message="Tem certeza que deseja excluir a tarefa"
        confirmLabel="Sim, excluir"
        warning="Esta ação é permanente e não pode ser desfeita."
      />
    </div>
  );
}