import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Calendar, Edit2, Palette, Image as ImageIcon, Check, X, Type, Users, Eye } from "lucide-react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import ColorPickerMenu from "../components/ColorPickerMenu";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import ShareBoardModal from "../components/ShareBoardModal";
import { colorFallback } from "../components/colorPalette";
import styles from "./Boardview.module.css";

const DEFAULT_COLUNAS = [
  { titulo: "A Fazer", key: "A Fazer" },
  { titulo: "Em Andamento", key: "Em Andamento" },
  { titulo: "Concluído", key: "Concluído" },
];

export default function BoardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const columnsRef = useRef(null);
  const [user, setUser] = useState(null);
  const [quadro, setQuadro] = useState(null);
  const [cards, setCards] = useState([]);
  const [colunas, setColunas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [colunaEditando, setColunaEditando] = useState(null);
  const [colunaParaExcluir, setColunaParaExcluir] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [permissao, setPermissao] = useState(null);
  const [semAcesso, setSemAcesso] = useState(false);

  // Estado para edição individual de cards
  const [editingCardId, setEditingCardId] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");

  // Form de criação de card
  const [colunaAtiva, setColunaAtiva] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("Baixa");
  const [dataEntrega, setDataEntrega] = useState("");

  const columnStatus = (coluna) => coluna.key || String(coluna._id);

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
      await fetchColunas(id, novaPermissao === "dono" || novaPermissao === "editar");
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setSemAcesso(true);
    } finally {
      setLoading(false);
    }
  }, [id, fetchColunas]);

  useEffect(() => {
    const me = localStorage.getItem("user");
    if (!me) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(me);
    setUser(userData);
    fetchDados(userData);
  }, [navigate, fetchDados]);

  // Ações da Coluna
  const handleRenameColumn = (colId, novoTitulo) => {
    setColunas((prev) =>
      prev.map((c) => (c._id === colId ? { ...c, titulo: novoTitulo } : c))
    );
  };

  const handleRenameColumnCommit = async (colId) => {
    const coluna = colunas.find((c) => c.id === colId);
    if (!coluna) return;
    const novoTitulo = coluna.titulo.trim() || "Sem título";
    try {
      setColunas((prev) =>
        prev.map((c) => (c._id === colId ? { ...c, titulo: novoTitulo } : c))
      );
      await api.put(`/coluna/${colId}`, { titulo: novoTitulo });
    } catch (err) {
      console.error("Erro ao renomear coluna:", err);
    } finally {
      setColunaEditando(null);
    }
  };

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

  const handleAddColumn = async () => {
    try {
      const response = await api.post("/coluna", {
        titulo: "Nova Coluna",
        corFundo: null,
        id_quadro: id,
      });

      setColunas((prev) => [...prev, response.data]);
      setColunaEditando(response.data._id);
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
      if (colunaAtiva === idExcluido) setColunaAtiva(null);
      if (colunaEditando === idExcluido) setColunaEditando(null);
    } catch (err) {
      console.error("Erro ao excluir coluna:", err);
      alert("Não foi possível excluir a coluna.");
    }
  };

  // Ações do Card
  const handleCreateCard = async (statusColuna) => {
    if (!titulo.trim() || !dataEntrega) {
      alert("Preencha o título e a data.");
      return;
    }

    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_entrega: new Date(dataEntrega).toISOString(),
        status: statusColuna,
        prioridade: prioridade,
        id_quadro: id,
        cor: "#ffffff", // Cor padrão do card
      };

      const response = await api.post("/card", payload);

      setCards((prev) => [...prev, response.data]);
      setTitulo("");
      setDescricao("");
      setPrioridade("Baixa");
      setDataEntrega("");
      setColunaAtiva(null);
    } catch (err) {
      alert("Erro ao criar tarefa.");
    }
  };

  const startEditingCard = (card) => {
    setEditingCardId(card._id);
    setEditTitulo(card.titulo);
    setEditDescricao(card.descricao || "");
  };

  const handleSaveCardEdit = async (cardId) => {
    try {
      const payload = {
        titulo: editTitulo.trim(),
        descricao: editDescricao.trim(),
      };

      await api.put(`/card/${cardId}`, payload);

      setCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, ...payload } : c))
      );
      setEditingCardId(null);
    } catch (err) {
      alert("Erro ao atualizar a tarefa.");
    }
  };

  const handleCardColorChange = async (cardId, novaCor) => {
    try {
      await api.put(`/card/${cardId}`, { cor: novaCor });

      setCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, cor: novaCor } : c))
      );
    } catch (err) {
      console.error("Erro ao alterar cor do card:", err);
    }
  };

  const handleCardTextColorChange = async (cardId, novaCor) => {
    try {
      await api.put(`/card/${cardId}`, { cor_texto: novaCor });

      setCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, cor_texto: novaCor } : c))
      );
    } catch (err) {
      console.error("Erro ao alterar cor do texto:", err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await api.delete(`/card/${cardId}`);
      setCards((prev) => prev.filter((c) => c._id !== cardId));
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  const getPriorityBarClass = (prio) => {
    if (prio === "Alta") return styles.priorityAlta;
    if (prio === "Media") return styles.priorityMedia;
    return styles.priorityBaixa;
  };

  const podeEditar = permissao === "dono" || permissao === "editar";
  const ehDono = permissao === "dono";

  if (loading) return <div className={styles.loadingScreen}>Carregando...</div>;

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

        {ehDono && (
          <button className={styles.btnShare} onClick={() => setShareOpen(true)}>
            <Users size={16} /> Compartilhar
          </button>
        )}
      </header>

      <main className={styles.columns} ref={columnsRef}>
        {colunas.map((coluna) => {
          const cardsDaColuna = cards.filter((c) => c.status === columnStatus(coluna));

          const colStyle = coluna.imagemFundo
            ? { backgroundImage: `url(${coluna.imagemFundo})` }
            : coluna.corFundo
              ? { backgroundColor: coluna.corFundo }
              : {};

          return (
            <div key={coluna._id} className={styles.column} style={colStyle}>
              <div className={styles.columnHeader}>
                {podeEditar && colunaEditando === coluna._id ? (
                  <input
                    type="text"
                    className={styles.columnTitleInput}
                    value={coluna.titulo}
                    onChange={(e) => handleRenameColumn(coluna._id, e.target.value)}
                    onBlur={() => handleRenameColumnCommit(coluna._id)}
                    autoFocus
                  />
                ) : (
                  <>
                    <div className={styles.columnTitle} onClick={podeEditar ? () => setColunaEditando(coluna._id) : undefined}>
                      <h3>{coluna.titulo}</h3>
                      {podeEditar && <Edit2 size={12} color="#64748b" />}
                    </div>

                    {podeEditar && (
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
                    )}

                    <span className={styles.cardCount}>{cardsDaColuna.length}</span>
                  </>
                )}
              </div>

              <div className={styles.cardsList}>
                {cardsDaColuna.map((card) => (
                  <div
                    key={card._id}
                    className={styles.taskCard}
                    style={{ background: card.cor || "#ffffff" }}
                  >
                    {/* Faixa de prioridade */}
                    <div className={`${styles.priorityBar} ${getPriorityBarClass(card.prioridade)}`} />

                    <div
                      className={styles.taskCardContent}
                      style={{ color: card.cor_texto || "#1e293b" }}
                    >
                      {editingCardId === card._id ? (
                        /* Formulário de Edição do Card */
                        <div className={styles.editCardForm}>
                          <input
                            type="text"
                            className={styles.editCardInput}
                            value={editTitulo}
                            onChange={(e) => setEditTitulo(e.target.value)}
                            placeholder="Título"
                            autoFocus
                          />
                          <textarea
                            className={styles.editCardTextarea}
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            placeholder="Descrição"
                            rows={2}
                          />
                          <div className={styles.formActions}>
                            <button
                              className={styles.btnSaveCard}
                              onClick={() => handleSaveCardEdit(card._id)}
                            >
                              <Check size={14} /> Salvar
                            </button>
                            <button
                              className={styles.btnCancelCard}
                              onClick={() => setEditingCardId(null)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Modo Visualização do Card */
                        <>
                          <div className={styles.taskCardHeader}>
                            <h4>{card.titulo}</h4>
                            {podeEditar && (
                              <div className={styles.taskCardHeaderActions}>
                                <ColorPickerMenu
                                  value={card.cor || "#ffffff"}
                                  onChange={(v) => handleCardColorChange(card._id, v)}
                                  title="Mudar cor do card"
                                />

                                <label className={styles.cardTextColorPicker} title="Mudar cor do texto">
                                  <Type size={13} color="#94a3b8" />
                                  <input
                                    type="color"
                                    value={card.cor_texto || "#1e293b"}
                                    onChange={(e) => handleCardTextColorChange(card._id, e.target.value)}
                                  />
                                </label>

                                <button
                                  className={styles.btnEditCard}
                                  onClick={() => startEditingCard(card)}
                                  title="Editar tarefa"
                                >
                                  <Edit2 size={13} />
                                </button>

                                <button
                                  className={styles.btnDeleteCard}
                                  onClick={() => handleDeleteCard(card._id)}
                                  title="Excluir tarefa"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          {card.descricao && <p className={styles.taskDesc}>{card.descricao}</p>}

                          <div className={styles.taskDate}>
                            <Calendar size={12} />
                            {new Date(card.data_entrega).toLocaleDateString("pt-BR")}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {colunaAtiva === coluna._id ? (
                <div className={styles.addCardForm}>
                  <input
                    type="text"
                    placeholder="Título da tarefa..."
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Descrição..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />

                  <div className={styles.formRowCompact}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Entrega:</label>
                      <input
                        type="date"
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prioridade:</label>
                      <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                        <option value="Baixa">Baixa (Azul)</option>
                        <option value="Media">Média (Amarelo)</option>
                        <option value="Alta">Alta (Vermelho)</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button className={styles.btnSaveCard} onClick={() => handleCreateCard(columnStatus(coluna))}>
                      Salvar
                    </button>
                    <button className={styles.btnCancelCard} onClick={() => setColunaAtiva(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                podeEditar && (
                  <button className={styles.btnAddCard} onClick={() => setColunaAtiva(coluna._id)}>
                    <Plus size={16} /> Nova Tarefa
                  </button>
                )
              )}
            </div>
          );
        })}

        {podeEditar && (
          <button className={styles.addColumn} onClick={handleAddColumn}>
            <Plus size={18} /> Nova Coluna
          </button>
        )}
      </main>

      <ShareBoardModal
        isOpen={shareOpen}
        quadroId={id}
        onClose={() => setShareOpen(false)}
        onUpdateQuadro={(q) => setQuadro(q)}
      />

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
    </div>
  );
}